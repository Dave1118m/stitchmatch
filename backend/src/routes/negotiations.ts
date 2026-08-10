import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { parseJson, serializeJson } from '../utils/jsonHelpers';
import { createNotification } from '../helpers/notificationHelper';
import { validateBody } from '../middleware/validate';
import { ProposeNegotiationSchema } from '../utils/schemas';

const router = Router();

// Get all negotiations for a request
router.get('/:requestId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { requestId } = req.params;

    const serviceRequest = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
    if (!serviceRequest) return res.status(404).json({ error: 'Request not found' });
    if (req.userId !== serviceRequest.customerId && req.userId !== serviceRequest.tailorId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const negotiations = await prisma.negotiation.findMany({
      where: { requestId },
      include: {
        proposedBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const normalized = negotiations.map((n) => ({
      ...n,
      garmentSpecs: parseJson(n.garmentSpecs),
    }));

    res.json({ negotiations: normalized });
  } catch (error) {
    console.error('Get negotiations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Propose a counter-offer (tailor or customer)
router.post('/:requestId/propose', authenticate, validateBody(ProposeNegotiationSchema), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { requestId } = req.params;
    const { proposedPrice, proposedDeadline, garmentSpecs, notes } = req.body;

    const serviceRequest = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
    if (!serviceRequest) return res.status(404).json({ error: 'Request not found' });

    if (req.userId !== serviceRequest.customerId && req.userId !== serviceRequest.tailorId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only allow proposals during Pending or Under_Discussion
    if (serviceRequest.status !== 'Pending' && serviceRequest.status !== 'Under_Discussion') {
      return res.status(400).json({ error: 'Can only negotiate when request is Pending or Under Discussion' });
    }

    if (proposedDeadline) {
      const d = new Date(proposedDeadline);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ error: 'Invalid proposed deadline date format' });
      }
    }

    if (proposedPrice && (isNaN(parseFloat(proposedPrice)) || parseFloat(proposedPrice) <= 0)) {
      return res.status(400).json({ error: 'Proposed price must be a positive number' });
    }

    const negotiation = await prisma.negotiation.create({
      data: {
        requestId,
        proposedById: req.userId!,
        proposedPrice: proposedPrice ? parseFloat(proposedPrice) : null,
        proposedDeadline: proposedDeadline ? new Date(proposedDeadline) : null,
        garmentSpecs: garmentSpecs ? serializeJson(garmentSpecs) : null,
        notes,
        status: 'pending',
      },
      include: {
        proposedBy: { select: { id: true, name: true, role: true } },
      },
    });

    // Notify the other party
    const recipientId = req.userId === serviceRequest.customerId
      ? serviceRequest.tailorId
      : serviceRequest.customerId;

    const proposerName = req.userId === serviceRequest.customerId
      ? serviceRequest.customerId // will be resolved from user object
      : serviceRequest.tailorId;

    await createNotification(
      prisma,
      recipientId,
      'New Counter-Offer',
      `A new counter-offer has been proposed for request: ${serviceRequest.garmentType}`,
      'request'
    );

    // Emit socket event for real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${recipientId}`).emit('new_negotiation', {
        requestId,
        negotiationId: negotiation.id,
      });
    }

    res.status(201).json({ negotiation: { ...negotiation, garmentSpecs: parseJson(negotiation.garmentSpecs) } });
  } catch (error) {
    console.error('Propose negotiation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept a negotiation proposal (the other party)
router.put('/:id/accept', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { id } = req.params;

    const negotiation = await prisma.negotiation.findUnique({
      where: { id },
      include: { request: true },
    });

    if (!negotiation) return res.status(404).json({ error: 'Negotiation not found' });
    if (negotiation.proposedById === req.userId) {
      return res.status(400).json({ error: 'Cannot accept your own proposal' });
    }
    if (req.userId !== negotiation.request.customerId && req.userId !== negotiation.request.tailorId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (negotiation.status !== 'pending') {
      return res.status(400).json({ error: 'Negotiation is no longer pending' });
    }

    // Mark negotiation as accepted
    const updated = await prisma.negotiation.update({
      where: { id },
      data: {
        status: 'accepted',
        respondedAt: new Date(),
      },
    });

    // Auto-populate the confirm-agreement fields with the accepted terms
    const updateData: any = {};
    if (negotiation.proposedPrice) updateData.finalPrice = negotiation.proposedPrice;
    if (negotiation.proposedDeadline) updateData.deadline = negotiation.proposedDeadline;
    if (negotiation.garmentSpecs) updateData.garmentSpecs = negotiation.garmentSpecs;

    if (Object.keys(updateData).length > 0) {
      await prisma.serviceRequest.update({
        where: { id: negotiation.requestId },
        data: updateData,
      });
    }

    // Notify the proposer
    await createNotification(
      prisma,
      negotiation.proposedById,
      'Counter-Offer Accepted',
      'Your counter-offer was accepted! Please confirm the agreement.',
      'request'
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${negotiation.proposedById}`).emit('negotiation_accepted', {
        requestId: negotiation.requestId,
        negotiationId: id,
      });
    }

    res.json({ negotiation: { ...updated, garmentSpecs: parseJson(updated.garmentSpecs) } });
  } catch (error) {
    console.error('Accept negotiation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Decline a negotiation proposal
router.put('/:id/decline', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { id } = req.params;

    const negotiation = await prisma.negotiation.findUnique({
      where: { id },
      include: { request: true },
    });

    if (!negotiation) return res.status(404).json({ error: 'Negotiation not found' });
    if (negotiation.proposedById === req.userId) {
      return res.status(400).json({ error: 'Cannot decline your own proposal' });
    }
    if (req.userId !== negotiation.request.customerId && req.userId !== negotiation.request.tailorId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (negotiation.status !== 'pending') {
      return res.status(400).json({ error: 'Negotiation is no longer pending' });
    }

    const updated = await prisma.negotiation.update({
      where: { id },
      data: {
        status: 'declined',
        respondedAt: new Date(),
      },
    });

    await createNotification(
      prisma,
      negotiation.proposedById,
      'Counter-Offer Declined',
      'Your counter-offer was declined. You can propose a new one.',
      'request'
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${negotiation.proposedById}`).emit('negotiation_declined', {
        requestId: negotiation.requestId,
        negotiationId: id,
      });
    }

    res.json({ negotiation: { ...updated, garmentSpecs: parseJson(updated.garmentSpecs) } });
  } catch (error) {
    console.error('Decline negotiation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
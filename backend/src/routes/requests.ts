import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { parseJson, serializeJson } from '../utils/jsonHelpers';
import { notifyRequestStatus, notifyOrderStatus } from '../helpers/notificationHelper';
import { validateBody } from '../middleware/validate';
import { CreateRequestSchema } from '../utils/schemas';

const router = Router();

// Create service request
router.post('/', authenticate, authorize('customer'), validateBody(CreateRequestSchema), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { tailorId, garmentType, fabricPreference, deadline, budget, notes } = req.body;

    console.log('Creating request:', { customerId: req.userId, tailorId, garmentType });

    if (!tailorId || !garmentType) {
      return res.status(400).json({ error: 'Tailor ID and garment type are required' });
    }

    // Verify tailor exists and is approved
    const tailor = await prisma.tailor.findUnique({
      where: { id: tailorId },
      include: { user: true },
    });

    console.log('Tailor found:', tailor ? { id: tailor.id, approvalStatus: tailor.approvalStatus } : null);

    if (!tailor || tailor.approvalStatus !== 'approved') {
      return res.status(404).json({ error: 'Tailor not found or not approved' });
    }

    if (deadline) {
      const d = new Date(deadline);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ error: 'Invalid deadline date format' });
      }
    }

    if (budget && (isNaN(parseFloat(budget)) || parseFloat(budget) <= 0)) {
      return res.status(400).json({ error: 'Budget must be a positive number' });
    }

    const request = await prisma.serviceRequest.create({
      data: {
        customerId: req.userId!,
        tailorId,
        garmentType,
        fabricPreference,
        deadline: deadline ? new Date(deadline) : null,
        budget: budget ? parseFloat(budget) : null,
        notes,
        status: 'Pending',
      },
      include: {
        customer: { select: { id: true, name: true, avatarUrl: true } },
        tailor: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    console.log('Request created:', { id: request.id, customerId: request.customerId, tailorId: request.tailorId, status: request.status });

    // Create notification for tailor
    const io = req.app.get('io');
    await notifyRequestStatus(prisma, request.id, 'Pending', tailorId, io);

    res.status(201).json({ request });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get requests for current user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { status } = req.query;

    console.log('Fetching requests for user:', { userId: req.userId, userRole: req.userRole, status });

    const where: any = {};
    
    if (req.userRole === 'customer') {
      where.customerId = req.userId;
    } else if (req.userRole === 'tailor') {
      where.tailorId = req.userId;
    }

    if (status) {
      where.status = status;
    }

    console.log('Where clause:', where);

    const requests = await prisma.serviceRequest.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, avatarUrl: true } },
        tailor: { select: { id: true, name: true, avatarUrl: true } },
        conversation: {
          include: {
            _count: { select: { messages: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('Found requests:', requests.length);

    const normalized = requests.map((request) => ({
      ...request,
      garmentSpecs: parseJson(request.garmentSpecs),
    }));

    res.json({ requests: normalized });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single request
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { id } = req.params;

    const request = await prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, avatarUrl: true, email: true, phone: true } },
        tailor: { select: { id: true, name: true, avatarUrl: true, email: true, phone: true } },
        tailorProfile: true,
        measurement: true,
        orderEvents: { orderBy: { createdAt: 'desc' } },
        review: true,
        agreementSnapshots: true,
      },
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Verify access
    if (req.userId !== request.customerId && req.userId !== request.tailorId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const normalizedRequest = {
      ...request,
      garmentSpecs: parseJson(request.garmentSpecs),
      agreementSnapshots: ((request as any).agreementSnapshots as any[] | undefined)?.map((snapshot) => ({
        ...snapshot,
        snapshot: parseJson(snapshot.snapshot),
      })) ?? [],
    };

    res.json({ request: normalizedRequest });
  } catch (error) {
    console.error('Get request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Tailor accepts request (moves to Under Discussion)
router.put('/:id/accept', authenticate, authorize('tailor'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { id } = req.params;

    console.log('Accepting request:', { id, userId: req.userId });

    const request = await prisma.serviceRequest.findUnique({ where: { id } });
    console.log('Request found:', request ? { id: request.id, status: request.status, tailorId: request.tailorId } : null);
    
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.tailorId !== req.userId) return res.status(403).json({ error: 'Access denied' });
    if (request.status !== 'Pending') return res.status(400).json({ error: 'Request is not in pending status' });

    const updated = await prisma.serviceRequest.update({
      where: { id },
      data: { status: 'Under_Discussion' },
      include: {
        customer: { select: { id: true, name: true, avatarUrl: true } },
        tailor: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    console.log('Request updated to Under_Discussion:', { id: updated.id, status: updated.status });

    // Notify customer
    const io = req.app.get('io');
    await notifyRequestStatus(prisma, id, 'Under_Discussion', updated.customerId, io);

    res.json({ request: updated });
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Tailor rejects request
router.put('/:id/reject', authenticate, authorize('tailor'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { id } = req.params;

    const request = await prisma.serviceRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.tailorId !== req.userId) return res.status(403).json({ error: 'Access denied' });

    const updated = await prisma.serviceRequest.update({
      where: { id },
      data: { status: 'Rejected' },
      include: {
        customer: { select: { id: true, name: true } },
        tailor: { select: { id: true, name: true } },
      },
    });

    // Notify customer
    const io = req.app.get('io');
    await notifyRequestStatus(prisma, id, 'Rejected', updated.customerId, io);

    res.json({ request: updated });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Customer confirms agreement
router.put('/:id/confirm-customer', authenticate, authorize('customer'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { id } = req.params;
    const { finalPrice, garmentSpecs, deadline } = req.body;

    const request = await prisma.serviceRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.customerId !== req.userId) return res.status(403).json({ error: 'Access denied' });

    const updateData: any = { customerConfirmed: true };
    if (finalPrice) updateData.finalPrice = parseFloat(finalPrice);
    if (garmentSpecs) updateData.garmentSpecs = serializeJson(garmentSpecs);
    if (deadline) updateData.deadline = new Date(deadline);

    const updated = await prisma.serviceRequest.update({
      where: { id },
      data: updateData,
    });

    let finalRequest: any = updated;

    // Check if both confirmed
    if (updated.customerConfirmed && updated.tailorConfirmed) {
      finalRequest = await prisma.serviceRequest.update({
        where: { id },
        data: {
          status: 'Agreed',
          agreedAt: new Date(),
        },
      });

      await prisma.agreementSnapshot.create({
        data: {
          requestId: id,
          snapshot: serializeJson({
            requestId: id,
            finalPrice: finalRequest.finalPrice,
            garmentSpecs: parseJson(finalRequest.garmentSpecs),
            deadline: finalRequest.deadline,
            customerConfirmed: finalRequest.customerConfirmed,
            tailorConfirmed: finalRequest.tailorConfirmed,
            agreedAt: finalRequest.agreedAt,
          }) || '',
        },
      });

      // Notify both parties when agreed
      const io = req.app.get('io');
      await notifyRequestStatus(prisma, id, 'Agreed', request.customerId, io);
      await notifyRequestStatus(prisma, id, 'Agreed', request.tailorId, io);
    }

    finalRequest = await prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true } },
        tailor: { select: { id: true, name: true } },
      },
    });

    res.json({ request: finalRequest });
  } catch (error) {
    console.error('Confirm customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Tailor confirms agreement
router.put('/:id/confirm-tailor', authenticate, authorize('tailor'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { id } = req.params;

    console.log('Tailor confirming request:', { id, userId: req.userId });

    const request = await prisma.serviceRequest.findUnique({ where: { id } });
    console.log('Request found:', request ? { id: request.id, customerConfirmed: request.customerConfirmed, tailorConfirmed: request.tailorConfirmed } : null);
    
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.tailorId !== req.userId) return res.status(403).json({ error: 'Access denied' });

    const updated = await prisma.serviceRequest.update({
      where: { id },
      data: { tailorConfirmed: true },
    });

    console.log('Updated tailor confirmed:', { id: updated.id, tailorConfirmed: updated.tailorConfirmed, customerConfirmed: updated.customerConfirmed });

    let finalRequest: any = updated;

    // Check if both confirmed
    if (updated.customerConfirmed && updated.tailorConfirmed) {
      console.log('Both confirmed, updating to Agreed status');
      
      finalRequest = await prisma.serviceRequest.update({
        where: { id },
        data: {
          status: 'Agreed',
          agreedAt: new Date(),
        },
      });

      console.log('Creating agreement snapshot');
      
      await prisma.agreementSnapshot.create({
        data: {
          requestId: id,
          snapshot: serializeJson({
            requestId: id,
            finalPrice: finalRequest.finalPrice,
            garmentSpecs: parseJson(finalRequest.garmentSpecs),
            deadline: finalRequest.deadline,
            customerConfirmed: finalRequest.customerConfirmed,
            tailorConfirmed: finalRequest.tailorConfirmed,
            agreedAt: finalRequest.agreedAt,
          }) || '',
        },
      });

      console.log('Agreement snapshot created, notifying parties');

      // Notify both parties when agreed
      const io = req.app.get('io');
      await notifyRequestStatus(prisma, id, 'Agreed', request.customerId, io);
      await notifyRequestStatus(prisma, id, 'Agreed', request.tailorId, io);
    }

    finalRequest = await prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true } },
        tailor: { select: { id: true, name: true } },
      },
    });

    console.log('Returning final request');

    res.json({ request: finalRequest });
  } catch (error) {
    console.error('Confirm tailor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { parseJsonArray, serializeJson } from '../utils/jsonHelpers';
import { notifyOrderStatus } from '../helpers/notificationHelper';

const router = Router();

// Tailor updates order status
router.post('/:requestId/events', authenticate, authorize('tailor'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { requestId } = req.params;
    const { status, notes, photos } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['cutting', 'sewing', 'ready_for_fitting', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const serviceRequest = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
    if (!serviceRequest) return res.status(404).json({ error: 'Request not found' });
    if (serviceRequest.tailorId !== req.userId) return res.status(403).json({ error: 'Access denied' });
    if (serviceRequest.status !== 'Agreed' && serviceRequest.status !== 'In_Progress') {
      return res.status(400).json({ error: 'Request must be in Agreed or In Progress status' });
    }

    const event = await prisma.orderEvent.create({
      data: {
        requestId,
        status,
        notes,
        photos: serializeJson(photos || []) || '[]',
        createdBy: req.userId!,
      },
      include: {
        creator: { select: { id: true, name: true } },
      },
    });

    // Update service request status if moving to completed
    if (status === 'completed') {
      await prisma.serviceRequest.update({
        where: { id: requestId },
        data: { status: 'Completed' },
      });

      // Notify customer about completion
      await notifyOrderStatus(prisma, requestId, 'Completed', serviceRequest.customerId);
    } else if (serviceRequest.status === 'Agreed') {
      await prisma.serviceRequest.update({
        where: { id: requestId },
        data: { status: 'In_Progress' },
      });
    }

    // Notify customer about status update
    await notifyOrderStatus(prisma, requestId, status, serviceRequest.customerId);

    res.status(201).json({ event });
  } catch (error) {
    console.error('Create order event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get order events for a request
router.get('/:requestId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { requestId } = req.params;

    const serviceRequest = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
    if (!serviceRequest) return res.status(404).json({ error: 'Request not found' });
    if (req.userId !== serviceRequest.customerId && req.userId !== serviceRequest.tailorId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const events = await prisma.orderEvent.findMany({
      where: { requestId },
      include: {
        creator: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ events: events.map((event) => ({
      ...event,
      photos: parseJsonArray(event.photos),
    })) });
  } catch (error) {
    console.error('Get order events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
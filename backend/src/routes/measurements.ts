import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { generatePhotoToken } from '../utils/photoLinks';
import { parseJson, parseJsonArray, serializeJson } from '../utils/jsonHelpers';

const router = Router();

// Upload measurement photos (customer)
router.post('/:requestId/photos', authenticate, authorize('customer'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { requestId } = req.params;
    const { frontPhotoUrl, sidePhotoUrl, backPhotoUrl } = req.body;

    // Verify access
    const serviceRequest = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
    if (!serviceRequest) return res.status(404).json({ error: 'Request not found' });
    if (serviceRequest.customerId !== req.userId) return res.status(403).json({ error: 'Access denied' });
    if (!['Agreed', 'In_Progress', 'Under_Discussion'].includes(serviceRequest.status)) {
      return res.status(400).json({ error: 'Request must be in Agreed, In Progress, or Under Discussion status' });
    }

    // Upsert measurement record
    const measurement = await prisma.measurement.upsert({
      where: { requestId },
      update: {
        ...(frontPhotoUrl && { frontPhotoUrl }),
        ...(sidePhotoUrl && { sidePhotoUrl }),
        ...(backPhotoUrl && { backPhotoUrl }),
        aiStatus: 'pending',
      },
      create: {
        requestId,
        customerId: req.userId!,
        frontPhotoUrl,
        sidePhotoUrl,
        backPhotoUrl,
        aiStatus: 'pending',
      },
    });

    // Simulate AI measurement processing
    // In production, this would call an external AI API
    simulateAIMeasurement(prisma, requestId);

    res.json({ measurement });
  } catch (error) {
    console.error('Upload photos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get measurements for a request
router.get('/:requestId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { requestId } = req.params;

    const serviceRequest = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
    if (!serviceRequest) return res.status(404).json({ error: 'Request not found' });
    if (req.userId !== serviceRequest.customerId && req.userId !== serviceRequest.tailorId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const measurement = await prisma.measurement.findUnique({
      where: { requestId },
    });

    if (!measurement) {
      return res.status(404).json({ error: 'No measurements found' });
    }

    res.json({ measurement });
  } catch (error) {
    console.error('Get measurements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get signed link for a photo (front|side|back)
router.get('/:requestId/photo/:which/signed', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { requestId, which } = req.params;
    const prisma: PrismaClient = req.app.get('prisma');

    const serviceRequest = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
    if (!serviceRequest) return res.status(404).json({ error: 'Request not found' });
    if (req.userId !== serviceRequest.customerId && req.userId !== serviceRequest.tailorId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!['front', 'side', 'back'].includes(which)) return res.status(400).json({ error: 'Invalid photo type' });

    const token = generatePhotoToken(requestId, which as any, Number(process.env.PHOTO_TOKEN_EXPIRES || 300));
    const url = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/photos/serve?token=${token}`;
    res.json({ url, expiresIn: Number(process.env.PHOTO_TOKEN_EXPIRES || 300) });
  } catch (error) {
    console.error('Get signed photo link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Tailor adds manual adjustments
router.put('/:requestId/adjustments', authenticate, authorize('tailor'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { requestId } = req.params;
    const { adjustments } = req.body;

    const serviceRequest = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
    if (!serviceRequest) return res.status(404).json({ error: 'Request not found' });
    if (serviceRequest.tailorId !== req.userId) return res.status(403).json({ error: 'Access denied' });

    if (!Array.isArray(adjustments)) {
      return res.status(400).json({ error: 'Adjustments must be an array' });
    }

    const measurement = await prisma.measurement.findUnique({ where: { requestId } });
    if (!measurement) return res.status(404).json({ error: 'No measurements found' });

    const existingAdjustments = parseJson<any[]>(measurement.adjustments) || [];
    const newAdjustments = adjustments.map((adj: any) => ({
      ...adj,
      timestamp: new Date().toISOString(),
    }));

    const updated = await prisma.measurement.update({
      where: { requestId },
      data: {
        adjustments: serializeJson([...existingAdjustments, ...newAdjustments]) || '[]',
      },
    });

    res.json({ measurement: updated });
  } catch (error) {
    console.error('Add adjustments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Simulate AI measurement processing
async function simulateAIMeasurement(prisma: PrismaClient, requestId: string) {
  try {
    // Update status to processing
    await prisma.measurement.update({
      where: { requestId },
      data: { aiStatus: 'processing' },
    });

    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate simulated measurements
    const measurements = {
      chest: 96 + Math.random() * 10,
      waist: 80 + Math.random() * 8,
      hip: 94 + Math.random() * 8,
      inseam: 78 + Math.random() * 6,
      shoulderWidth: 44 + Math.random() * 4,
      armLength: 60 + Math.random() * 4,
      aiConfidence: 85 + Math.random() * 12,
    };

    await prisma.measurement.update({
      where: { requestId },
      data: {
        ...measurements,
        aiStatus: 'completed',
      },
    });
  } catch (error) {
    await prisma.measurement.update({
      where: { requestId },
      data: { aiStatus: 'failed' },
    });
    console.error('AI measurement simulation error:', error);
  }
}

export default router;
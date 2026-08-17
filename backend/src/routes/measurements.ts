import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { generatePhotoToken } from '../utils/photoLinks';
import { parseJson, parseJsonArray, serializeJson } from '../utils/jsonHelpers';
import { validateBody } from '../middleware/validate';
import { MeasurementPhotoSchema, MeasurementAdjustmentSchema } from '../utils/schemas';
import { createNotification } from '../helpers/notificationHelper';
import { analyzeBodyMeasurementsWithGemini } from '../services/geminiMeasurementService';

const router = Router();

// Upload measurement photos (customer)
router.post('/:requestId/photos', authenticate, authorize('customer'), validateBody(MeasurementPhotoSchema), async (req: AuthRequest, res: Response) => {
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
    const io = req.app.get('io');
    simulateAIMeasurement(prisma, requestId, io);

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
router.put('/:requestId/adjustments', authenticate, authorize('tailor'), validateBody(MeasurementAdjustmentSchema), async (req: AuthRequest, res: Response) => {
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
async function simulateAIMeasurement(prisma: PrismaClient, requestId: string, io?: Server) {
  try {
    // Update status to processing
    await prisma.measurement.update({
      where: { requestId },
      data: { aiStatus: 'processing' },
    });

    // Simulate AI processing delay (2 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const measurement = await prisma.measurement.findUnique({ where: { requestId } });
    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: { customer: true, tailor: true },
    });

    if (!measurement || !serviceRequest) return;

    // Validation: Check for duplicate photos (e.g. all front only)
    const isDuplicateFrontAndSide = measurement.frontPhotoUrl && measurement.sidePhotoUrl && 
      (measurement.frontPhotoUrl === measurement.sidePhotoUrl || 
       (measurement.frontPhotoUrl.length > 50 && measurement.frontPhotoUrl === measurement.sidePhotoUrl));

    if (isDuplicateFrontAndSide) {
      console.warn(`[AI Quality Check] Rejected: Duplicate poses detected for request ${requestId}`);
      
      await prisma.measurement.update({
        where: { requestId },
        data: {
          aiStatus: 'needs_retake',
          aiConfidence: 0,
        },
      });

      // Notify customer of specific error
      await createNotification(
        prisma,
        serviceRequest.customerId,
        '⚠️ AI Scan Needs Retake: Duplicate Poses',
        'The AI detected that your Front and Side photos are identical. To estimate body depth and curves, please provide 1 facing-front pose and 1 separate 90° side profile pose.',
        'request',
        io
      );

      // Notify tailor
      if (serviceRequest.tailorId) {
        await createNotification(
          prisma,
          serviceRequest.tailorId,
          'Customer Scan Needs Retake',
          `${serviceRequest.customer.name}'s photo scan had identical front/side poses and has been requested to retake.`,
          'request',
          io
        );
      }
      return;
    }

    // User calibrated reference height defaults to 175cm unless specified
    const calibratedHeight = 175;

    // Execute Gemini Pro Vision Multimodal Measurement Engine
    const aiResult = await analyzeBodyMeasurementsWithGemini(
      measurement.frontPhotoUrl!,
      measurement.sidePhotoUrl,
      measurement.backPhotoUrl,
      calibratedHeight
    );

    await prisma.measurement.update({
      where: { requestId },
      data: {
        chest: aiResult.chest,
        waist: aiResult.waist,
        hip: aiResult.hip,
        inseam: aiResult.inseam,
        shoulderWidth: aiResult.shoulderWidth,
        armLength: aiResult.armLength,
        aiConfidence: aiResult.aiConfidence,
        aiStatus: 'completed',
      },
    });

    // Notify tailor that AI body measurements are ready
    if (serviceRequest?.tailorId) {
      await createNotification(
        prisma,
        serviceRequest.tailorId,
        'AI Measurements Ready',
        `AI measurements have been calculated for ${serviceRequest.customer.name}'s ${serviceRequest.garmentType} order.`,
        'order',
        io
      );
    }

    // Notify customer that their measurements are ready
    if (serviceRequest?.customerId) {
      await createNotification(
        prisma,
        serviceRequest.customerId,
        'AI Scan Processed',
        `Your AI body scan for ${serviceRequest.garmentType} has been calculated with ${aiResult.aiConfidence}% confidence!`,
        'order',
        io
      );
    }
  } catch (error) {
    await prisma.measurement.update({
      where: { requestId },
      data: { aiStatus: 'failed' },
    });
    console.error('AI measurement simulation error:', error);
  }
}

export default router;
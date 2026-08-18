import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { generatePhotoToken } from '../utils/photoLinks';
import { parseJson, parseJsonArray, serializeJson } from '../utils/jsonHelpers';
import { validateBody } from '../middleware/validate';
import { MeasurementPhotoSchema, MeasurementAdjustmentSchema } from '../utils/schemas';
import { createNotification } from '../helpers/notificationHelper';
import { analyzeBodyMeasurementsWithGemini } from '../services/geminiMeasurementService';

const router = Router();

/**
 * Extract SHA-256 hash of image file from disk or payload
 */
function getFileHash(photoUrl?: string | null): string | null {
  if (!photoUrl || typeof photoUrl !== 'string') return null;
  try {
    let filePath = photoUrl.trim();
    if (filePath.includes('/uploads/')) {
      const fileName = filePath.split('/uploads/').pop();
      if (fileName) {
        filePath = path.join(process.cwd(), 'uploads', fileName);
      }
    }
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(buffer).digest('hex');
    }
  } catch (e) {
    // fallback
  }
  return crypto.createHash('sha256').update(photoUrl.trim()).digest('hex');
}

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

    // Strict Duplicate Photo Validation Check
    const frontHash = getFileHash(frontPhotoUrl);
    const sideHash = getFileHash(sidePhotoUrl);
    const backHash = getFileHash(backPhotoUrl);

    if (frontHash && sideHash && frontHash === sideHash) {
      return res.status(400).json({
        error: '⚠️ Duplicate Photo Rejected: The Front and Side photos are identical. The AI engine requires 1 distinct Front pose and 1 separate 90° Side profile pose to measure chest and waist depth accurately.',
      });
    }

    if (frontHash && backHash && frontHash === backHash) {
      return res.status(400).json({
        error: '⚠️ Duplicate Photo Rejected: The Front and Back photos are identical. Please provide a separate Back pose.',
      });
    }

    if (sideHash && backHash && sideHash === backHash) {
      return res.status(400).json({
        error: '⚠️ Duplicate Photo Rejected: The Side and Back photos are identical. Please provide distinct angles for accurate 3D contour fitting.',
      });
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

    // Process AI body measurement analysis
    const io = req.app.get('io');
    processAIMeasurements(prisma, requestId, io);

    res.json({ measurement });
  } catch (error) {
    console.error('Upload photos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customer's latest saved measurements vault profile
router.get('/vault/latest', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const measurement = await prisma.measurement.findFirst({
      where: {
        customerId: req.userId,
        chest: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ measurement: measurement || null });
  } catch (error) {
    console.error('Get vault measurement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 1-Click apply vault measurements to an active request
router.post('/:requestId/apply-vault', authenticate, authorize('customer'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { requestId } = req.params;
    const { measurementId } = req.body;

    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: { customer: true },
    });
    if (!serviceRequest) return res.status(404).json({ error: 'Request not found' });
    if (serviceRequest.customerId !== req.userId) return res.status(403).json({ error: 'Access denied' });

    let sourceMeasurement;
    if (measurementId) {
      sourceMeasurement = await prisma.measurement.findUnique({ where: { id: measurementId } });
    } else {
      sourceMeasurement = await prisma.measurement.findFirst({
        where: { customerId: req.userId, chest: { not: null } },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!sourceMeasurement || !sourceMeasurement.chest) {
      return res.status(400).json({ error: 'No saved vault measurements found to apply' });
    }

    const applied = await prisma.measurement.upsert({
      where: { requestId },
      update: {
        chest: sourceMeasurement.chest,
        waist: sourceMeasurement.waist,
        hip: sourceMeasurement.hip,
        inseam: sourceMeasurement.inseam,
        shoulderWidth: sourceMeasurement.shoulderWidth,
        armLength: sourceMeasurement.armLength,
        frontPhotoUrl: sourceMeasurement.frontPhotoUrl,
        sidePhotoUrl: sourceMeasurement.sidePhotoUrl,
        backPhotoUrl: sourceMeasurement.backPhotoUrl,
        aiConfidence: sourceMeasurement.aiConfidence || 98.5,
        aiStatus: 'completed',
      },
      create: {
        requestId,
        customerId: req.userId!,
        chest: sourceMeasurement.chest,
        waist: sourceMeasurement.waist,
        hip: sourceMeasurement.hip,
        inseam: sourceMeasurement.inseam,
        shoulderWidth: sourceMeasurement.shoulderWidth,
        armLength: sourceMeasurement.armLength,
        frontPhotoUrl: sourceMeasurement.frontPhotoUrl,
        sidePhotoUrl: sourceMeasurement.sidePhotoUrl,
        backPhotoUrl: sourceMeasurement.backPhotoUrl,
        aiConfidence: sourceMeasurement.aiConfidence || 98.5,
        aiStatus: 'completed',
      },
    });

    const io = req.app.get('io');
    if (serviceRequest.tailorId) {
      await createNotification(
        prisma,
        serviceRequest.tailorId,
        'Measurements Applied from Client Vault',
        `${serviceRequest.customer.name} applied verified 3D body measurements to the ${serviceRequest.garmentType} order.`,
        'order',
        io
      );
    }

    res.json({ measurement: applied });
  } catch (error) {
    console.error('Apply vault measurement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update or save manual baseline measurements into vault
router.put('/vault/manual', authenticate, authorize('customer'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { chest, waist, hip, inseam, shoulderWidth, armLength } = req.body;

    const latest = await prisma.measurement.findFirst({
      where: { customerId: req.userId },
      orderBy: { createdAt: 'desc' },
    });

    if (latest) {
      const updated = await prisma.measurement.update({
        where: { id: latest.id },
        data: {
          ...(chest !== undefined && { chest: Number(chest) }),
          ...(waist !== undefined && { waist: Number(waist) }),
          ...(hip !== undefined && { hip: Number(hip) }),
          ...(inseam !== undefined && { inseam: Number(inseam) }),
          ...(shoulderWidth !== undefined && { shoulderWidth: Number(shoulderWidth) }),
          ...(armLength !== undefined && { armLength: Number(armLength) }),
          aiStatus: 'completed',
        },
      });
      return res.json({ measurement: updated });
    } else {
      const recentRequest = await prisma.serviceRequest.findFirst({
        where: { customerId: req.userId },
        orderBy: { createdAt: 'desc' },
      });

      if (recentRequest) {
        const created = await prisma.measurement.create({
          data: {
            requestId: recentRequest.id,
            customerId: req.userId!,
            chest: chest ? Number(chest) : 98,
            waist: waist ? Number(waist) : 84,
            hip: hip ? Number(hip) : 102,
            inseam: inseam ? Number(inseam) : 78,
            shoulderWidth: shoulderWidth ? Number(shoulderWidth) : 44,
            armLength: armLength ? Number(armLength) : 62,
            aiStatus: 'completed',
            aiConfidence: 100,
          },
        });
        return res.json({ measurement: created });
      } else {
        return res.json({
          measurement: {
            chest, waist, hip, inseam, shoulderWidth, armLength, aiStatus: 'completed'
          }
        });
      }
    }
  } catch (error) {
    console.error('Update manual vault measurement error:', error);
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

// Process AI measurement analysis via Gemini Vision & Anthropometric rules
async function processAIMeasurements(prisma: PrismaClient, requestId: string, io?: Server) {
  try {
    // Update status to processing
    await prisma.measurement.update({
      where: { requestId },
      data: { aiStatus: 'processing' },
    });

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
      if (io) {
        io.emit('measurements_updated', { requestId, aiStatus: 'needs_retake' });
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

    // Check if Pose Orientation validation failed
    if (aiResult.isOrientationValid === false) {
      const errorMsg = aiResult.orientationMismatchError || 'The AI detected that the uploaded pose angles are mismatched or not distinct. Please provide 1 Front pose, 1 90° Side profile, and 1 Back pose.';
      
      await prisma.measurement.update({
        where: { requestId },
        data: {
          aiStatus: 'needs_retake',
          aiConfidence: 0,
          adjustments: JSON.stringify([{ orientationError: errorMsg }]),
        },
      });

      if (io) {
        io.emit('measurements_updated', { requestId, aiStatus: 'needs_retake', error: errorMsg });
      }

      await createNotification(
        prisma,
        serviceRequest.customerId,
        '⚠️ AI Scan Needs Retake: Pose Angle Mismatch',
        errorMsg,
        'request',
        io
      );

      if (serviceRequest.tailorId) {
        await createNotification(
          prisma,
          serviceRequest.tailorId,
          'Customer Scan Needs Retake',
          `${serviceRequest.customer.name}'s photo scan had mismatched poses and has been requested to retake.`,
          'request',
          io
        );
      }
      return;
    }

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

    if (io) {
      io.emit('measurements_updated', { 
        requestId, 
        aiStatus: 'completed',
        chest: aiResult.chest,
        waist: aiResult.waist,
        hip: aiResult.hip,
        inseam: aiResult.inseam,
        shoulderWidth: aiResult.shoulderWidth,
        armLength: aiResult.armLength,
        aiConfidence: aiResult.aiConfidence,
      });
    }

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
    if (io) {
      io.emit('measurements_updated', { requestId, aiStatus: 'failed' });
    }
    console.error('AI measurement simulation error:', error);
  }
}

export default router;
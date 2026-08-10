import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyPhotoToken } from '../utils/photoLinks';

const router = Router();

// Serve photo by token (redirect to actual URL if allowed)
router.get('/serve', async (req: any, res: Response) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const payload = verifyPhotoToken(token as string);
    if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });

    const prisma: PrismaClient = req.app.get('prisma');
    const measurement = await prisma.measurement.findUnique({ where: { requestId: payload.requestId } });
    if (!measurement) return res.status(404).json({ error: 'Measurement not found' });

    const fieldMap: any = { front: 'frontPhotoUrl', side: 'sidePhotoUrl', back: 'backPhotoUrl' };
    const url = (measurement as any)[fieldMap[payload.field]];
    if (!url) return res.status(404).json({ error: 'Photo not found' });

    // Redirect to the stored URL (could be S3 pre-signed URL)
    res.redirect(url);
  } catch (err) {
    console.error('Serve photo error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

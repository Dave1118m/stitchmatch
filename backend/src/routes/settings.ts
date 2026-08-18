import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { parseJson, serializeJson } from '../utils/jsonHelpers';

const router = Router();

const DEFAULT_SETTINGS: Record<string, any> = {
  commissionRate: '5.0',
  autoApproveTailors: false,
  maintenanceMode: false,
  announcementBanner: 'Welcome to StitchMatch Atelier Platform! Quality custom tailoring verified.',
  specialtiesList: ['Bespoke Suits', 'Tuxedos', 'Evening Gowns', 'Bridal Wear', 'Alterations', 'Silk Dresses', 'Overcoats'],
};

// GET /api/settings/public - Public platform configuration (e.g. announcements, available specialties)
router.get('/public', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const settings = await prisma.platformSetting.findMany();

    const settingsMap: Record<string, any> = { ...DEFAULT_SETTINGS };

    for (const item of settings) {
      settingsMap[item.key] = parseJson(item.value);
    }

    res.json({
      settings: {
        announcementBanner: settingsMap.announcementBanner,
        specialtiesList: settingsMap.specialtiesList,
        maintenanceMode: settingsMap.maintenanceMode,
      },
    });
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/settings - Admin: Retrieve all platform settings
router.get('/', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const settings = await prisma.platformSetting.findMany();

    const settingsMap: Record<string, any> = { ...DEFAULT_SETTINGS };

    for (const item of settings) {
      settingsMap[item.key] = parseJson(item.value);
    }

    res.json({ settings: settingsMap });
  } catch (error) {
    console.error('Get admin settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/settings - Admin: Update platform settings
router.put('/', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const updates: Record<string, any> = req.body;

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Settings object is required' });
    }

    const savedKeys: string[] = [];

    await prisma.$transaction(
      Object.entries(updates).map(([key, value]) =>
        prisma.platformSetting.upsert({
          where: { key },
          update: { value: serializeJson(value) || JSON.stringify(value) },
          create: { key, value: serializeJson(value) || JSON.stringify(value) },
        })
      )
    );

    // Retrieve updated settings map
    const allSettings = await prisma.platformSetting.findMany();
    const settingsMap: Record<string, any> = { ...DEFAULT_SETTINGS };

    for (const item of allSettings) {
      settingsMap[item.key] = parseJson(item.value);
    }

    res.json({ settings: settingsMap, message: 'Platform settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

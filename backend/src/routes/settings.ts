import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { parseJson, serializeJson } from '../utils/jsonHelpers';

const router = Router();

const DEFAULT_SETTINGS: Record<string, any> = {
  commissionRate: '5.0',
  autoApproveTailors: false,
  maintenanceMode: false,
  announcementBanner: 'Welcome to StitchMatch! Quality custom tailoring verified.',
  specialtiesList: ['Bespoke Suits', 'Tuxedos', 'Evening Gowns', 'Bridal Wear', 'Alterations', 'Silk Dresses', 'Overcoats'],
  aiProvider: 'gemini',
  aiApiKey: '',
  aiModel: 'gemini-flash-latest',
  aiApiBaseUrl: '',
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

// POST /api/settings/feedback - Customer & user platform feedback submission
router.post('/feedback', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { category, rating, message, email, name, userId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Feedback message is required' });
    }

    const cleanCategory = ['general', 'bug', 'feature', 'tailoring', 'ai_measurement'].includes(category)
      ? category
      : 'general';

    const feedbackEntry = {
      id: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      category: cleanCategory,
      message: message.trim(),
      email: email?.trim() || 'Anonymous',
      name: name?.trim() || 'User',
      userId: userId || null,
      createdAt: new Date().toISOString(),
    };

    console.log('[Platform Feedback Received]:', feedbackEntry);

    // Persist in platformSetting store
    try {
      const existing = await prisma.platformSetting.findUnique({ where: { key: 'platform_feedbacks' } });
      let currentList: any[] = [];
      if (existing?.value) {
        currentList = typeof existing.value === 'string' ? parseJson(existing.value) || [] : existing.value;
      }
      if (!Array.isArray(currentList)) currentList = [];
      const updatedList = [feedbackEntry, ...currentList].slice(0, 200);

      await prisma.platformSetting.upsert({
        where: { key: 'platform_feedbacks' },
        update: { value: JSON.stringify(updatedList) },
        create: { key: 'platform_feedbacks', value: JSON.stringify(updatedList) },
      });
    } catch (saveErr) {
      console.error('Failed to persist feedback list:', saveErr);
    }

    // Notify all admin users
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'admin', isActive: true },
        select: { id: true },
      });

      const io = req.app.get('io');
      const senderName = name || email || 'A customer';
      const categoryLabel = cleanCategory.replace('_', ' ').toUpperCase();

      for (const admin of admins) {
        const notif = await prisma.notification.create({
          data: {
            userId: admin.id,
            title: `New Customer Feedback (${categoryLabel})`,
            message: `${senderName}: "${message.trim().slice(0, 120)}${message.trim().length > 120 ? '...' : ''}"`,
            type: 'general',
          },
        });

        if (io) {
          io.to(`user_${admin.id}`).emit('notification', notif);
        }
      }
    } catch (notifErr) {
      console.error('Failed to notify admins of feedback:', notifErr);
    }

    res.status(201).json({
      success: true,
      message: 'Thank you for your feedback! Our team has received your submission.',
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/settings/feedback - Admin: Retrieve all customer feedback
router.get('/feedback', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const existing = await prisma.platformSetting.findUnique({ where: { key: 'platform_feedbacks' } });
    let feedbacks: any[] = [];
    if (existing?.value) {
      feedbacks = typeof existing.value === 'string' ? parseJson(existing.value) || [] : existing.value;
    }
    if (!Array.isArray(feedbacks)) feedbacks = [];
    res.json({ feedbacks });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/settings/feedback/:id - Admin: Delete / resolve feedback item
router.delete('/feedback/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { id } = req.params;

    const existing = await prisma.platformSetting.findUnique({ where: { key: 'platform_feedbacks' } });
    let feedbacks: any[] = [];
    if (existing?.value) {
      feedbacks = typeof existing.value === 'string' ? parseJson(existing.value) || [] : existing.value;
    }
    if (!Array.isArray(feedbacks)) feedbacks = [];
    const updated = feedbacks.filter((f) => f.id !== id);

    await prisma.platformSetting.upsert({
      where: { key: 'platform_feedbacks' },
      update: { value: JSON.stringify(updated) },
      create: { key: 'platform_feedbacks', value: JSON.stringify(updated) },
    });

    res.json({ success: true, message: 'Feedback removed' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/settings/test-ai - Admin: Test connection to AI Measurement Provider
router.post('/test-ai', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { provider, providerName, apiKey, model, baseUrl } = req.body;
    const cleanKey = (apiKey || '').trim();
    const cleanProvider = (provider || 'gemini').toLowerCase().trim();
    const displayName = providerName || (
      cleanProvider === 'bodygram' ? 'Bodygram Platform' :
        cleanProvider === 'gemini' ? 'Google Gemini' :
          cleanProvider === 'openai' ? 'OpenAI Vision' :
            cleanProvider === 'claude' ? 'Anthropic Claude' :
              cleanProvider === 'snapaimeasure' ? 'SnapAIMeasure' :
                cleanProvider === 'live_ai_measurement' ? 'Live_AI_Measurement' :
                  'Custom AI Provider'
    );

    if (!cleanKey) {
      return res.status(400).json({ error: 'API Key is required to test connection. Please paste an API key.' });
    }

    if (cleanProvider === 'gemini') {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(cleanKey);
      const m = genAI.getGenerativeModel({ model: model || 'gemini-flash-latest' });
      const result = await m.generateContent('Respond with "OK" if connected.');
      const txt = result.response.text();
      return res.json({
        success: true,
        message: `${displayName} connection verified! Model ${model || 'gemini-flash-latest'} responded: "${txt.trim()}"`,
      });
    } else if (cleanProvider === 'claude') {
      const endpoint = baseUrl || 'https://api.anthropic.com/v1/messages';
      const mName = model || 'claude-3-5-sonnet-20241022';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': cleanKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: mName,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Respond with "OK" if connected.' }],
        }),
      });

      if (!response.ok) {
        const errTxt = await response.text();
        return res.status(400).json({ error: `Connection failed (${response.status}): ${errTxt}` });
      }

      const data: any = await response.json();
      const txt = data.content?.[0]?.text || 'OK';
      return res.json({
        success: true,
        message: `${displayName} connection verified! Model ${mName} responded: "${txt.trim()}"`,
      });
    } else if (cleanProvider === 'bodygram' || cleanProvider === 'snapaimeasure' || cleanProvider === 'live_ai_measurement' || cleanProvider === 'custom') {
      // Specialized measurement endpoint or custom gateway
      let endpoint = baseUrl || (
        cleanProvider === 'bodygram' ? 'https://api.bodyscanner.bodygram.com/scanning/v0/create-session' :
          cleanProvider === 'snapaimeasure' ? 'https://api.snapaimeasure.com/v1/ping' :
            cleanProvider === 'live_ai_measurement' ? 'https://api.liveaimeasurement.com/v1/health' :
              'https://api.openai.com/v1/chat/completions'
      );

      // Auto-correct deprecated or dead Bodygram domain
      if (endpoint.includes('api.bodygram.com')) {
        endpoint = 'https://api.bodyscanner.bodygram.com/scanning/v0/create-session';
      }

      try {
        const isBodygram = cleanProvider === 'bodygram' || endpoint.includes('bodyscanner.bodygram.com');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanKey}`,
          'X-API-Key': cleanKey,
          'Client-ID': cleanKey,
        };
        const bodyPayload = isBodygram
          ? {
            clientId: cleanKey,
            clientScanningId: `probe_${Date.now()}`,
            scanningConfig: {
              languageCode: 'en',
              include3dAvatarInResults: true,
            },
          }
          : {
            apiKey: cleanKey,
            model: model || 'default',
            test: true,
            messages: [{ role: 'user', content: 'ping' }],
          };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyPayload),
        });

        const rawBody = await response.text();
        let parsed: any = null;
        try { parsed = JSON.parse(rawBody); } catch { }

        if (response.ok || response.status === 200 || response.status === 201) {
          return res.json({
            success: true,
            message: `${displayName} API connection verified! (HTTP ${response.status} OK${parsed?.scanningSessionId ? ` - Session: ${parsed.scanningSessionId}` : ''})`,
          });
        } else if (response.status === 403 && parsed?.error?.errorType === 'INVALID_CLIENT_ID') {
          return res.status(400).json({
            error: `Bodygram Platform reached successfully, but rejected your Client ID (HTTP 403): "${parsed.error.message}". Bodygram requires a registered "Client ID" (not an API secret) from developers.bodygram.com.`,
          });
        } else {
          return res.status(400).json({
            error: `${displayName} returned HTTP ${response.status}: ${parsed?.error?.message || rawBody.substring(0, 300) || 'Unauthorized or invalid credentials.'}`,
          });
        }
      } catch (pingErr: any) {
        return res.status(400).json({
          error: `Could not reach ${displayName} endpoint at ${endpoint}: ${pingErr.message || 'Network unreachable. Please check API URL.'}`,
        });
      }
    } else {
      // OpenAI or OpenAI-compatible Vision API
      const endpoint = baseUrl || 'https://api.openai.com/v1/chat/completions';
      const mName = model || 'gpt-4o';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanKey}`,
        },
        body: JSON.stringify({
          model: mName,
          messages: [{ role: 'user', content: 'Respond with "OK" if connected.' }],
          max_tokens: 10,
        }),
      });

      if (!response.ok) {
        const errTxt = await response.text();
        return res.status(400).json({ error: `Connection failed (${response.status}): ${errTxt}` });
      }

      const data: any = await response.json();
      const txt = data.choices?.[0]?.message?.content || 'OK';
      return res.json({
        success: true,
        message: `${displayName} connection verified! Model ${mName} responded: "${txt.trim()}"`,
      });
    }
  } catch (error: any) {
    console.error('Test AI connection error:', error);
    res.status(400).json({ error: error.message || 'Failed to connect to AI provider' });
  }
});

export default router;


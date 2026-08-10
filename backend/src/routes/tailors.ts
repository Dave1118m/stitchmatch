import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { parseJsonArray, serializeJson } from '../utils/jsonHelpers';
import { notifyTailorApproval } from '../helpers/notificationHelper';

const router = Router();

function normalizeTailor(tailor: any) {
  return {
    ...tailor,
    specialties: parseJsonArray(tailor.specialties),
    portfolioImages: parseJsonArray(tailor.portfolioImages),
  };
}

// Search tailors with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { location, specialty, minPrice, maxPrice, minRating, search } = req.query;

    console.log('Search params:', { location, specialty, minPrice, maxPrice, minRating, search });

    const where: any = {
      user: { isActive: true },
    };

    if (location) {
      where.user = {
        ...where.user,
        location: { contains: location as string },
      };
    }

    if (specialty) {
      where.specialties = { contains: specialty as string };
    }

    if (minPrice || maxPrice) {
      if (minPrice) {
        where.basePricingMin = { gte: parseFloat(minPrice as string) };
      }
      if (maxPrice) {
        where.basePricingMax = { lte: parseFloat(maxPrice as string) };
      }
    }

    if (search) {
      where.OR = [
        { bio: { contains: search as string } },
        { specialties: { contains: search as string } },
        { user: { name: { contains: search as string } } },
      ];
    }

    console.log('Where clause:', JSON.stringify(where, null, 2));

    const tailors = await prisma.tailor.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            location: true,
          },
        },
        _count: {
          select: { serviceRequests: true },
        },
      },
    });

    console.log('Found tailors:', tailors.length);

    // Get average ratings for tailors
    const tailorsWithRatings = await Promise.all(
      tailors.map(async (tailor) => {
        const ratings = await prisma.review.aggregate({
          where: { tailorId: tailor.id, isFlagged: false },
          _avg: { rating: true },
          _count: true,
        });
        return {
          ...normalizeTailor(tailor),
          averageRating: ratings._avg.rating || 0,
          reviewCount: ratings._count,
        };
      })
    );

    if (minRating) {
      const minR = parseFloat(minRating as string);
      return res.json({
        tailors: tailorsWithRatings.filter((t) => t.averageRating >= minR),
      });
    }

    res.json({ tailors: tailorsWithRatings });
  } catch (error) {
    console.error('Search tailors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get tailor by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { id } = req.params;

    console.log('Getting tailor by ID:', id);

    const tailor = await prisma.tailor.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            location: true,
            phone: true,
          },
        },
      },
    });

    if (!tailor) {
      console.log('Tailor not found with ID:', id);
      return res.status(404).json({ error: 'Tailor not found' });
    }

    console.log('Tailor found:', tailor.user.name);

    const ratings = await prisma.review.aggregate({
      where: { tailorId: id, isFlagged: false },
      _avg: { rating: true },
      _count: true,
    });

    const ratingDistribution = await prisma.review.groupBy({
      by: ['rating'],
      where: { tailorId: id, isFlagged: false },
      _count: true,
    });

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingDistribution.forEach((r) => {
      distribution[r.rating] = r._count;
    });

    const reviews = await prisma.review.findMany({
      where: { tailorId: id, isFlagged: false },
      include: {
        customer: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      tailor: {
        ...normalizeTailor(tailor),
        averageRating: ratings._avg.rating || 0,
        reviewCount: ratings._count,
        ratingDistribution: distribution,
        reviews,
      },
    });
  } catch (error) {
    console.error('Get tailor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update tailor profile (tailor only)
router.put('/profile', authenticate, authorize('tailor'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { bio, specialties, basePricingMin, basePricingMax, portfolioImages } = req.body;

    const tailor = await prisma.tailor.update({
      where: { id: req.userId },
      data: {
        ...(bio !== undefined && { bio }),
        ...(specialties !== undefined && { specialties: specialties === null ? null : serializeJson(specialties) ?? null }),
        ...(basePricingMin !== undefined && { basePricingMin }),
        ...(basePricingMax !== undefined && { basePricingMax }),
        ...(portfolioImages !== undefined && { portfolioImages: portfolioImages === null ? null : serializeJson(portfolioImages) ?? null }),
      },
    });

    res.json({ tailor: normalizeTailor(tailor) });
  } catch (error) {
    console.error('Update tailor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add portfolio image with title/description
router.post('/portfolio', authenticate, authorize('tailor'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { imageUrl, title, description } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    const tailor = await prisma.tailor.findUnique({ where: { id: req.userId } });
    if (!tailor) return res.status(404).json({ error: 'Tailor not found' });

    const portfolio = parseJsonArray(tailor.portfolioImages);
    const newItem = JSON.stringify({ imageUrl, title: title || '', description: description || '' });
    portfolio.push(newItem);

    const updated = await prisma.tailor.update({
      where: { id: req.userId },
      data: { portfolioImages: serializeJson(portfolio) },
    });

    res.json({ portfolio: parseJsonArray(updated.portfolioImages) });
  } catch (error) {
    console.error('Add portfolio error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete portfolio image by index
router.delete('/portfolio/:index', authenticate, authorize('tailor'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const index = parseInt(req.params.index);

    const tailor = await prisma.tailor.findUnique({ where: { id: req.userId } });
    if (!tailor) return res.status(404).json({ error: 'Tailor not found' });

    const portfolio = parseJsonArray(tailor.portfolioImages);
    if (index < 0 || index >= portfolio.length) {
      return res.status(400).json({ error: 'Invalid portfolio index' });
    }

    portfolio.splice(index, 1);

    const updated = await prisma.tailor.update({
      where: { id: req.userId },
      data: { portfolioImages: serializeJson(portfolio) },
    });

    res.json({ portfolio: parseJsonArray(updated.portfolioImages) });
  } catch (error) {
    console.error('Delete portfolio error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get pending tailor approvals
router.get('/admin/pending', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const pendingTailors = await prisma.tailor.findMany({
      where: { approvalStatus: 'pending' },
      include: {
        user: {
          select: { id: true, name: true, email: true, createdAt: true },
        },
      },
    });

    res.json({ tailors: pendingTailors.map(normalizeTailor) });
  } catch (error) {
    console.error('Get pending tailors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Approve or reject tailor
router.put('/admin/:id/approval', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { id } = req.params;
    const { approvalStatus } = req.body;

    if (!['approved', 'rejected'].includes(approvalStatus)) {
      return res.status(400).json({ error: 'Approval status must be approved or rejected' });
    }

    const tailor = await prisma.tailor.update({
      where: { id },
      data: { approvalStatus },
    });

    // Send notification to tailor
    await notifyTailorApproval(prisma, id, approvalStatus === 'approved');

    res.json({ tailor: normalizeTailor(tailor) });
  } catch (error) {
    console.error('Update tailor approval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
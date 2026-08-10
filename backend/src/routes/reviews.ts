import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// Create review (customer, after order completed)
router.post('/:requestId', authenticate, authorize('customer'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { requestId } = req.params;
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const serviceRequest = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
    if (!serviceRequest) return res.status(404).json({ error: 'Request not found' });
    if (serviceRequest.customerId !== req.userId) return res.status(403).json({ error: 'Access denied' });
    if (serviceRequest.status !== 'Completed') return res.status(400).json({ error: 'Order must be completed to leave a review' });

    // Check if review already exists
    const existingReview = await prisma.review.findUnique({ where: { requestId } });
    if (existingReview) return res.status(409).json({ error: 'Review already exists for this request' });

    const review = await prisma.review.create({
      data: {
        requestId,
        customerId: req.userId!,
        tailorId: serviceRequest.tailorId,
        rating,
        feedback,
      },
      include: {
        customer: { select: { id: true, name: true, avatarUrl: true } },
        tailor: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ review });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Tailor replies to review
router.put('/:id/reply', authenticate, authorize('tailor'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { id } = req.params;
    const { tailorReply } = req.body;

    if (!tailorReply) {
      return res.status(400).json({ error: 'Reply content is required' });
    }

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (review.tailorId !== req.userId) return res.status(403).json({ error: 'Access denied' });

    const updated = await prisma.review.update({
      where: { id },
      data: {
        tailorReply,
        replyAt: new Date(),
      },
    });

    res.json({ review: updated });
  } catch (error) {
    console.error('Reply to review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get reviews for a tailor (with sorting & filtering)
router.get('/tailor/:tailorId', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { tailorId } = req.params;
    const { sort, rating, page, limit } = req.query;

    const where: any = { tailorId, isFlagged: false };
    if (rating) {
      where.rating = parseInt(rating as string);
    }

    const orderBy: any = { createdAt: 'desc' };
    if (sort === 'oldest') orderBy.createdAt = 'asc';
    else if (sort === 'highest') orderBy.rating = 'desc';
    else if (sort === 'lowest') orderBy.rating = 'asc';

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [reviews, totalCount, aggregation] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.review.count({ where }),
      prisma.review.aggregate({
        where: { tailorId, isFlagged: false },
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    const distribution = await prisma.review.groupBy({
      by: ['rating'],
      where: { tailorId, isFlagged: false },
      _count: true,
      orderBy: { rating: 'asc' },
    });

    res.json({
      reviews,
      averageRating: aggregation._avg.rating || 0,
      totalReviews: aggregation._count,
      distribution: Object.fromEntries(distribution.map((d: any) => [d.rating, d._count])),
      totalPages: Math.ceil(totalCount / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    console.error('Get tailor reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: flag/unflag review
router.put('/admin/:id/flag', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { id } = req.params;
    const { isFlagged } = req.body;

    const review = await prisma.review.update({
      where: { id },
      data: { isFlagged },
    });

    res.json({ review });
  } catch (error) {
    console.error('Flag review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
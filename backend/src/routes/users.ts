import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { parseJsonArray } from '../utils/jsonHelpers';
import { validateBody } from '../middleware/validate';
import { UpdateUserSchema, SwitchRoleSchema } from '../utils/schemas';
import { JWT_SECRET } from '../utils/secrets';

const router = Router();

function normalizeUser(user: any) {
  if (!user) return user;
  if (user.tailor) {
    user.tailor = {
      ...user.tailor,
      specialties: parseJsonArray(user.tailor.specialties),
      portfolioImages: parseJsonArray(user.tailor.portfolioImages),
    };
  }
  return user;
}

// Get current user profile
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        tailor: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: normalizeUser(user) });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/me', authenticate, validateBody(UpdateUserSchema), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { name, phone, location, avatarUrl } = req.body;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(location !== undefined && { location }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      include: {
        tailor: true,
      },
    });

    res.json({ user: normalizeUser(user) });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Switch user role
router.put('/switch-role', authenticate, validateBody(SwitchRoleSchema), async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { role } = req.body;

    if (!role || !['customer', 'tailor', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Update user role
    await prisma.user.update({
      where: { id: req.userId },
      data: { role },
    });

    // If switching to tailor and profile doesn't exist, create tailor profile
    if (role === 'tailor') {
      const existingTailor = await prisma.tailor.findUnique({ where: { id: req.userId } });
      if (!existingTailor) {
        await prisma.tailor.create({
          data: {
            id: req.userId!,
            approvalStatus: 'approved',
          },
        });
      }
    }

    // Fetch updated user with tailor profile
    const finalUser = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { tailor: true },
    });

    // Generate new token with updated role
    const token = jwt.sign(
      { userId: req.userId, role: role },
      JWT_SECRET,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );

    res.json({ user: normalizeUser(finalUser), token });
  } catch (error) {
    console.error('Switch role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (soft delete)
router.delete('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    await prisma.user.update({
      where: { id: req.userId },
      data: { isActive: false },
    });

    res.json({ message: 'Account deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Get all users with filters
router.get('/admin/all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    const prisma: PrismaClient = req.app.get('prisma');
    const { role, search, status } = req.query;

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'deactivated') {
      where.isActive = false;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { email: { contains: search as string } },
        { location: { contains: search as string } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        tailor: true,
        _count: {
          select: {
            sentRequests: true,
            receivedRequests: true,
            reviewsGiven: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ users });
  } catch (error) {
    console.error('Admin get all users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Toggle active status
router.put('/admin/:id/toggle-active', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    const prisma: PrismaClient = req.app.get('prisma');
    const { id } = req.params;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !targetUser.isActive },
    });

    res.json({ user: updated });
  } catch (error) {
    console.error('Admin toggle user status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Delete user
router.delete('/admin/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    const prisma: PrismaClient = req.app.get('prisma');
    const { id } = req.params;

    // Soft delete by setting isActive to false
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'User account deactivated' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
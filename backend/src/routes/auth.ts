import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { email, password, name, role, phone, location, authProvider } = req.body;

    if (!email || !name || !role) {
      return res.status(400).json({ error: 'Email, name, and role are required' });
    }

    if (!['customer', 'tailor', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    let passwordHash: string | null = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role,
        phone,
        location,
        authProvider: authProvider || 'email',
      },
    });

    // If role is tailor, create tailor profile with auto-approval
    if (role === 'tailor') {
      await prisma.tailor.create({
        data: {
          id: user.id,
          approvalStatus: 'approved',
        },
      });
    }

        const token = jwt.sign(
      { userId: user.id, role: user.role },
      (process.env.JWT_SECRET || 'fallback-secret') as string,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        location: user.location,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.passwordHash) {
      return res.status(401).json({ error: 'This account uses OAuth. Please sign in with Google or Facebook.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account has been deactivated' });
    }

        const token = jwt.sign(
      { userId: user.id, role: user.role },
      (process.env.JWT_SECRET || 'fallback-secret') as string,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        location: user.location,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/oauth', async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { email, name, authProvider, providerId, role } = req.body;

    if (!email || !authProvider || !providerId) {
      return res.status(400).json({ error: 'Email, auth provider, and provider ID are required' });
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Update existing user's auth provider if needed
      if (user.authProvider !== authProvider) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { authProvider },
        });
      }
    } else {
      // Create new user via OAuth
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          role: role || 'customer',
          authProvider,
        },
      });

      if ((role || 'customer') === 'tailor') {
        await prisma.tailor.create({ data: { id: user.id } });
      }
    }

        const token = jwt.sign(
      { userId: user.id, role: user.role },
      (process.env.JWT_SECRET || 'fallback-secret') as string,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        location: user.location,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
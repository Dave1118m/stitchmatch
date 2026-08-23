import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { validateBody } from '../middleware/validate';
import {
  RegisterSchema,
  RegisterVerifySchema,
  LoginSchema,
  OAuthSchema,
  GoogleAuthSchema,
  ForgotPasswordSchema,
  VerifyCodeSchema,
  ResetPasswordSchema,
} from '../utils/schemas';

import { JWT_SECRET } from '../utils/secrets';
import { sendDirectEmail } from '../services/emailQueue';
import {
  generatePasswordResetEmail,
  generateVerificationCodeEmail,
  generatePasswordChangedEmail,
} from '../services/emailTemplates';


const router = Router();

const getGoogleClientId = () => (process.env.GOOGLE_CLIENT_ID || '').trim();
const getGoogleClientSecret = () => (process.env.GOOGLE_CLIENT_SECRET || '').trim();

const googleClient = new OAuth2Client(
  getGoogleClientId(),
  getGoogleClientSecret()
);

// GET /api/auth/google/config - Public config endpoint to share Google Client ID with frontend
router.get('/google/config', (req: Request, res: Response) => {
  const clientId = getGoogleClientId();
  res.json({
    clientId,
    configured: Boolean(clientId),
  });
});

// POST /api/auth/google - Authenticate / Register user via Google OAuth
router.post('/google', validateBody(GoogleAuthSchema), async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { credential, token, role } = req.body;

    let googleUser: {
      email: string;
      name?: string;
      picture?: string;
      sub?: string;
    };

    if (credential) {
      // ID Token verification (Google Identity Services / One-Tap)
      const clientId = getGoogleClientId();
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: clientId ? [clientId] : undefined,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return res.status(400).json({ error: 'Invalid Google ID token payload' });
      }
      googleUser = {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        sub: payload.sub,
      };
    } else if (token) {
      // OAuth2 Access Token flow
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errText = await response.text();
        console.error('Google userinfo fetch failed:', errText);
        return res.status(400).json({ error: 'Unable to retrieve profile from Google. Token may be invalid or expired.' });
      }
      const data: any = await response.json();
      if (!data || !data.email) {
        return res.status(400).json({ error: 'Google account profile does not contain an email address' });
      }
      googleUser = {
        email: data.email,
        name: data.name,
        picture: data.picture,
        sub: data.sub,
      };
    } else {
      return res.status(400).json({ error: 'Google credential or access token is required' });
    }

    const email = googleUser.email.toLowerCase().trim();
    const name = googleUser.name || email.split('@')[0];
    const avatarUrl = googleUser.picture || null;
    const targetRole = role === 'tailor' ? 'tailor' : 'customer';

    let user = await prisma.user.findUnique({
      where: { email },
      include: { tailor: true },
    });

    if (user) {
      if (!user.isActive) {
        return res.status(403).json({ error: 'Account has been deactivated. Please contact support.' });
      }

      // Update avatar if missing or sync authProvider
      const updateData: any = {};
      if (!user.avatarUrl && avatarUrl) {
        updateData.avatarUrl = avatarUrl;
      }
      if (user.authProvider !== 'google' && !user.passwordHash) {
        updateData.authProvider = 'google';
      }

      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
          include: { tailor: true },
        });
      }
    } else {
      // Create new user through Google registration
      user = await prisma.user.create({
        data: {
          email,
          name,
          role: targetRole,
          avatarUrl,
          authProvider: 'google',
          isActive: true,
        },
        include: { tailor: true },
      });

      if (targetRole === 'tailor') {
        const tailor = await prisma.tailor.create({
          data: {
            id: user.id,
            approvalStatus: 'approved',
          },
        });
        user.tailor = tailor;
      }
    }

    const appToken = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );

    return res.json({
      token: appToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        location: user.location,
        avatarUrl: user.avatarUrl,
        tailor: user.tailor,
      },
    });
  } catch (error: any) {
    console.error('Google authentication error:', error?.message || error);
    return res.status(500).json({
      error: error?.message || 'Google authentication failed. Please try again.',
    });
  }
});

// POST /api/auth/register - Step 1: Validate registration data and send 6-digit OTP to email
router.post('/register', validateBody(RegisterSchema), async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { email, password, name, role, phone, location } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    if (!cleanEmail || !name || !role) {
      return res.status(400).json({ error: 'Email, name, and role are required' });
    }

    if (!['customer', 'tailor', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role selected' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser && existingUser.isActive && existingUser.isEmailVerified) {
      return res.status(409).json({ error: 'This email is already registered. Please sign in or use Forgot Password.' });
    }


    // Invalidate previous unused email verification codes for this email
    await prisma.verificationCode.updateMany({
      where: { email: cleanEmail, type: 'email_verification', used: false },
      data: { used: true },
    });

    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.verificationCode.create({
      data: {
        email: cleanEmail,
        code,
        type: 'email_verification',
        expiresAt,
        used: false,
      },
    });

    const emailContent = generateVerificationCodeEmail(name, code);
    await sendDirectEmail({
      to: cleanEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    res.status(200).json({
      message: 'A 6-digit verification code has been sent to your email.',
      email: cleanEmail,
      requiresVerification: true,
    });
  } catch (error: any) {
    console.error('Registration init error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Failed to dispatch verification code. Please check your email or SMTP settings.' });
  }
});

// POST /api/auth/register-verify - Step 2: Verify 6-digit OTP and complete account creation
router.post('/register-verify', validateBody(RegisterVerifySchema), async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { code, name, password, role, phone, location } = req.body;
    const cleanEmail = req.body.email.toLowerCase().trim();

    const verificationRecord = await prisma.verificationCode.findFirst({
      where: {
        email: cleanEmail,
        code: code.trim(),
        type: 'email_verification',
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verificationRecord) {
      return res.status(400).json({ error: 'Invalid or expired verification code. Please request a new code.' });
    }

    let passwordHash: string | null = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 12);
    }

    let tailorProfile: any = null;

    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { tailor: true },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          name,
          role,
          phone,
          location,
          isEmailVerified: true,
          authProvider: 'email',
          isActive: true,
        },
        include: { tailor: true },
      });
      tailorProfile = user.tailor;
    } else {
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          passwordHash,
          name,
          role,
          phone,
          location,
          isEmailVerified: true,
          authProvider: 'email',
          isActive: true,
        },
        include: { tailor: true },
      });
      tailorProfile = user.tailor;
    }

    // If role is tailor, ensure tailor profile exists
    if (role === 'tailor') {
      const existingTailor = await prisma.tailor.findUnique({ where: { id: user.id } });
      if (!existingTailor) {
        tailorProfile = await prisma.tailor.create({
          data: {
            id: user.id,
            approvalStatus: 'approved',
          },
        });
      } else {
        tailorProfile = existingTailor;
      }
    }

    // Mark verification code as used
    await prisma.verificationCode.update({
      where: { id: verificationRecord.id },
      data: { used: true },
    });

    if (!user) {
      return res.status(500).json({ error: 'Failed to create or update user record' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
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
        tailor: tailorProfile,
      },
    });

  } catch (error: any) {
    console.error('Registration verification error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Failed to complete registration. Please try again.' });
  }
});


router.post('/login', validateBody(LoginSchema), async (req: Request, res: Response) => {
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
      JWT_SECRET,
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

router.post('/oauth', validateBody(OAuthSchema), async (req: Request, res: Response) => {
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
      JWT_SECRET,
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

function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/forgot-password - Request password reset code
router.post('/forgot-password', validateBody(ForgotPasswordSchema), async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const email = req.body.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't leak existence of email, return success response
      return res.json({ message: 'If an account is associated with this email, a verification code has been sent.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'This account has been deactivated. Please contact platform support.' });
    }

    // Invalidate previous active password reset codes for this email
    await prisma.verificationCode.updateMany({
      where: { email, type: 'password_reset', used: false },
      data: { used: true },
    });

    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.verificationCode.create({
      data: {
        email,
        code,
        type: 'password_reset',
        expiresAt,
        used: false,
      },
    });

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();
    const resetUrl = `${frontendUrl}/forgot-password?email=${encodeURIComponent(email)}&code=${code}`;

    const emailContent = generatePasswordResetEmail(user.name, code, resetUrl);
    await sendDirectEmail({
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    res.json({
      message: 'Verification code sent to your email address.',
      expiresInMinutes: 15,
    });
  } catch (error: any) {
    console.error('Forgot password error:', error?.message || error);
    res.status(500).json({ error: 'Failed to send password reset email. Please ensure SMTP credentials are configured.' });
  }
});

// POST /api/auth/verify-code - Verify 6-digit OTP code validity
router.post('/verify-code', validateBody(VerifyCodeSchema), async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { code, type = 'password_reset' } = req.body;
    const email = req.body.email.toLowerCase().trim();

    const verificationRecord = await prisma.verificationCode.findFirst({
      where: {
        email,
        code: code.trim(),
        type,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verificationRecord) {
      return res.status(400).json({ error: 'Invalid or expired verification code. Please request a new code.' });
    }

    res.json({ valid: true, message: 'Verification code is valid.' });
  } catch (error: any) {
    console.error('Verify code error:', error?.message || error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/reset-password - Reset password with 6-digit OTP
router.post('/reset-password', validateBody(ResetPasswordSchema), async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { code, newPassword } = req.body;
    const email = req.body.email.toLowerCase().trim();

    const verificationRecord = await prisma.verificationCode.findFirst({
      where: {
        email,
        code: code.trim(),
        type: 'password_reset',
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verificationRecord) {
      return res.status(400).json({ error: 'Invalid or expired verification code. Please request a new code.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, authProvider: 'email' },
      }),
      prisma.verificationCode.update({
        where: { id: verificationRecord.id },
        data: { used: true },
      }),
    ]);

    // Send confirmation email
    const confirmEmail = generatePasswordChangedEmail(user.name);
    sendDirectEmail({
      to: user.email,
      subject: confirmEmail.subject,
      html: confirmEmail.html,
      text: confirmEmail.text,
    }).catch((e) => console.error('Failed to send password changed notification:', e));

    res.json({ message: 'Your password has been successfully reset. You may now log in.' });
  } catch (error: any) {
    console.error('Reset password error:', error?.message || error);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

// POST /api/auth/send-verification - Send email address verification OTP
router.post('/send-verification', validateBody(ForgotPasswordSchema), async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const email = req.body.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    await prisma.verificationCode.updateMany({
      where: { email, type: 'email_verification', used: false },
      data: { used: true },
    });

    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.verificationCode.create({
      data: {
        email,
        code,
        type: 'email_verification',
        expiresAt,
        used: false,
      },
    });

    const emailContent = generateVerificationCodeEmail(user.name, code);
    await sendDirectEmail({
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    res.json({ message: 'Verification code sent to your email' });
  } catch (error: any) {
    console.error('Send verification error:', error?.message || error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});

// POST /api/auth/verify-email - Verify email address OTP
router.post('/verify-email', validateBody(VerifyCodeSchema), async (req: Request, res: Response) => {
  try {
    const prisma: PrismaClient = req.app.get('prisma');
    const { code } = req.body;
    const email = req.body.email.toLowerCase().trim();

    const record = await prisma.verificationCode.findFirst({
      where: {
        email,
        code: code.trim(),
        type: 'email_verification',
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { isEmailVerified: true },
      }),
      prisma.verificationCode.update({
        where: { id: record.id },
        data: { used: true },
      }),
    ]);

    res.json({ message: 'Email address verified successfully!' });
  } catch (error: any) {
    console.error('Verify email error:', error?.message || error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

export default router;

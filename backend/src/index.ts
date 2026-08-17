import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { FRONTEND_URLS } from './utils/secrets';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import tailorRoutes from './routes/tailors';
import requestRoutes from './routes/requests';
import messageRoutes from './routes/messages';
import measurementRoutes from './routes/measurements';
import orderRoutes from './routes/orders';
import reviewRoutes from './routes/reviews';
import negotiationRoutes from './routes/negotiations';
import notificationRoutes from './routes/notifications';
import photosRoutes from './routes/photos';
import productRoutes from './routes/products';
import uploadRoutes from './routes/uploads';
import { setupSocketHandlers } from './socket';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const prisma = new PrismaClient();

// ==========================================
// 1. HTTP Security Headers (Helmet)
// ==========================================
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows uploaded images to load on cross-origin frontends
    contentSecurityPolicy: false, // Managed by reverse proxy or frontend SPA
  })
);

// ==========================================
// 2. Multi-Origin Dynamic CORS
// ==========================================
const checkOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  if (!origin) return callback(null, true); // Allow server-to-server, mobile, curl

  const isExplicitlyAllowed = FRONTEND_URLS.some(
    (allowed) => allowed === '*' || allowed === origin || origin.startsWith(allowed)
  );

  // In development, or for preview deployments (e.g. *.vercel.app, *.onrender.com, localhost)
  const isDevelopmentOrPreview =
    process.env.NODE_ENV !== 'production' ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.endsWith('.vercel.app') ||
    origin.endsWith('.onrender.com');

  if (isExplicitlyAllowed || isDevelopmentOrPreview) {
    return callback(null, true);
  }

  callback(new Error(`CORS blocked: Origin ${origin} is not allowed.`));
};

const corsOptions: cors.CorsOptions = {
  origin: checkOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ==========================================
// 3. Rate Limiting Safeguards
// ==========================================
// General API Rate Limiter (300 requests / 15 minutes per IP)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again in 15 minutes.' },
});

// Strict Authentication Rate Limiter (15 attempts / 15 minutes per IP to prevent brute-force attacks)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
});

// Upload Rate Limiter (40 uploads / 15 minutes per IP to protect disk/memory)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload rate limit reached. Please wait before uploading additional files.' },
});

app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/uploads', uploadLimiter);

// ==========================================
// 4. Request Body Parsing
// ==========================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==========================================
// 5. Secure Static File Serving
// ==========================================
app.use(
  '/uploads',
  express.static(path.join(process.cwd(), 'uploads'), {
    dotfiles: 'deny',
    maxAge: '7d',
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  })
);

// Make prisma and io available to routes
app.set('prisma', prisma);

const io = new Server(httpServer, {
  cors: {
    origin: checkOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
app.set('io', io);

// ==========================================
// 6. Routes
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tailors', tailorRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/measurements', measurementRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/negotiations', negotiationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/photos', photosRoutes);
app.use('/api/products', productRoutes);
app.use('/api/uploads', uploadRoutes);

// Health check endpoint (for cloud monitoring / uptime checks)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Global 404 handler for API routes
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Setup WebSockets & WebRTC Signaling
setupSocketHandlers(io, prisma);

const PORT = Number(process.env.PORT) || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 StitchMatch Production Server running on port ${PORT}`);
  console.log(`🔒 Security active: Helmet enabled, Rate Limiters engaged`);
});

export { app, httpServer, io, prisma };
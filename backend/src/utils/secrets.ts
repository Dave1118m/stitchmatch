/**
 * Centralized Secret and Configuration Manager
 * Ensures critical secrets are defined in production and provides secure defaults for development.
 */

const isProduction = process.env.NODE_ENV === 'production';

export const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (isProduction) {
      throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable must be set in production.');
    }
    console.warn('⚠️ WARNING: Using fallback JWT_SECRET. Set JWT_SECRET in your .env file for production security.');
    return 'dev-insecure-jwt-secret-key-12345';
  }
  return secret;
})();

export const JWT_PHOTO_SECRET = (() => {
  const secret = process.env.JWT_PHOTO_SECRET;
  if (!secret) {
    if (isProduction) {
      throw new Error('FATAL SECURITY ERROR: JWT_PHOTO_SECRET environment variable must be set in production.');
    }
    return 'dev-insecure-photo-secret-key-67890';
  }
  return secret;
})();

export const FRONTEND_URLS = (() => {
  const raw = process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:3000';
  return raw.split(',').map((url) => url.trim()).filter(Boolean);
})();

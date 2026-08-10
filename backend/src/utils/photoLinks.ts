import jwt from 'jsonwebtoken';

const PHOTO_SECRET = process.env.JWT_PHOTO_SECRET || 'photo-fallback-secret';

export function generatePhotoToken(requestId: string, field: 'front' | 'side' | 'back', expiresInSeconds = 60 * 5) {
  return jwt.sign({ requestId, field }, PHOTO_SECRET, { expiresIn: expiresInSeconds });
}

export function verifyPhotoToken(token: string) {
  try {
    return jwt.verify(token, PHOTO_SECRET) as any;
  } catch (err) {
    return null;
  }
}

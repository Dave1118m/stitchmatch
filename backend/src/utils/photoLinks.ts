import jwt from 'jsonwebtoken';
import { JWT_PHOTO_SECRET } from './secrets';

export function generatePhotoToken(requestId: string, field: 'front' | 'side' | 'back', expiresInSeconds = 60 * 5) {
  return jwt.sign({ requestId, field }, JWT_PHOTO_SECRET, { expiresIn: expiresInSeconds });
}

export function verifyPhotoToken(token: string) {
  try {
    return jwt.verify(token, JWT_PHOTO_SECRET) as any;
  } catch (err) {
    return null;
  }
}


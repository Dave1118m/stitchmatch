export * from './aiMeasurementService';
import { analyzeBodyMeasurementsWithAI, BodyMeasurementsOutput } from './aiMeasurementService';

/**
 * Backward compatibility proxy for Gemini / Multi-Provider AI analyzer
 */
export async function analyzeBodyMeasurementsWithGemini(
  frontPhotoUrl: string,
  sidePhotoUrl: string,
  backPhotoUrl?: string | null,
  userHeightCm: number = 175,
  prisma?: any
): Promise<BodyMeasurementsOutput> {
  return analyzeBodyMeasurementsWithAI(frontPhotoUrl, sidePhotoUrl, backPhotoUrl, userHeightCm, prisma);
}

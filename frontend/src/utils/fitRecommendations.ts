/**
 * Anthropometric Fit Ease Calculator & Ready-to-Wear (RTW) Size Recommendation Engine
 */

export type FitType = 'slim' | 'regular' | 'relaxed';

export interface FitPreset {
  type: FitType;
  label: string;
  badge: string;
  description: string;
  ease: {
    chest: number;
    waist: number;
    hip: number;
  };
}

export const FIT_PRESETS: Record<FitType, FitPreset> = {
  slim: {
    type: 'slim',
    label: 'Slim Fit',
    badge: 'Modern Contour',
    description: 'Close to body silhouette with clean minimal drape (+2.0 cm ease)',
    ease: { chest: 2.0, waist: 2.0, hip: 2.0 },
  },
  regular: {
    type: 'regular',
    label: 'Tailored Regular',
    badge: 'Classic Bespoke',
    description: 'Balanced comfort and elegance, ideal for business suits (+4.5 cm ease)',
    ease: { chest: 4.5, waist: 4.0, hip: 4.0 },
  },
  relaxed: {
    type: 'relaxed',
    label: 'Classic Relaxed',
    badge: 'Comfort Drape',
    description: 'Generous ease for freedom of movement and traditional drape (+7.0 cm ease)',
    ease: { chest: 7.0, waist: 6.0, hip: 6.0 },
  },
};

export interface StandardSizeTier {
  sizeLabel: string;
  euSize: string;
  usSize: string;
  ukSize: string;
  chestMin: number;
  chestMax: number;
  waistMin: number;
  waistMax: number;
  hipMin: number;
  hipMax: number;
}

export const MENS_SIZE_CHART: StandardSizeTier[] = [
  { sizeLabel: 'XS (Extra Small)', euSize: 'EU 44', usSize: 'US 34', ukSize: 'UK 34', chestMin: 86, chestMax: 90, waistMin: 72, waistMax: 76, hipMin: 88, hipMax: 92 },
  { sizeLabel: 'S (Small)', euSize: 'EU 46', usSize: 'US 36', ukSize: 'UK 36', chestMin: 91, chestMax: 95, waistMin: 77, waistMax: 81, hipMin: 93, hipMax: 97 },
  { sizeLabel: 'M (Medium)', euSize: 'EU 48-50', usSize: 'US 38-40', ukSize: 'UK 38-40', chestMin: 96, chestMax: 103, waistMin: 82, waistMax: 89, hipMin: 98, hipMax: 105 },
  { sizeLabel: 'L (Large)', euSize: 'EU 52', usSize: 'US 42', ukSize: 'UK 42', chestMin: 104, chestMax: 111, waistMin: 90, waistMax: 97, hipMin: 106, hipMax: 113 },
  { sizeLabel: 'XL (Extra Large)', euSize: 'EU 54-56', usSize: 'US 44-46', ukSize: 'UK 44-46', chestMin: 112, chestMax: 119, waistMin: 98, waistMax: 105, hipMin: 114, hipMax: 121 },
  { sizeLabel: 'XXL (Double Extra Large)', euSize: 'EU 58-60', usSize: 'US 48-50', ukSize: 'UK 48-50', chestMin: 120, chestMax: 130, waistMin: 106, waistMax: 118, hipMin: 122, hipMax: 132 },
];

export interface RecommendationResult {
  fitPreset: FitPreset;
  tailoredDimensions: {
    chest: number;
    waist: number;
    hip: number;
    inseam: number;
    shoulderWidth: number;
    armLength: number;
  };
  matchedRTWSize: {
    label: string;
    eu: string;
    us: string;
    uk: string;
    matchScore: number;
  };
}

/**
 * Compute Fit Ease Dimensions and RTW Standard Size Match
 */
export function calculateFitRecommendations(
  rawMeasurements: {
    chest?: number | null;
    waist?: number | null;
    hip?: number | null;
    inseam?: number | null;
    shoulderWidth?: number | null;
    armLength?: number | null;
  },
  fitType: FitType = 'regular'
): RecommendationResult {
  const preset = FIT_PRESETS[fitType] || FIT_PRESETS.regular;

  const rawChest = Number(rawMeasurements.chest) || 98;
  const rawWaist = Number(rawMeasurements.waist) || 84;
  const rawHip = Number(rawMeasurements.hip) || 100;
  const rawInseam = Number(rawMeasurements.inseam) || 80;
  const rawShoulder = Number(rawMeasurements.shoulderWidth) || 46;
  const rawArm = Number(rawMeasurements.armLength) || 63;

  const tailoredDimensions = {
    chest: Math.round((rawChest + preset.ease.chest) * 10) / 10,
    waist: Math.round((rawWaist + preset.ease.waist) * 10) / 10,
    hip: Math.round((rawHip + preset.ease.hip) * 10) / 10,
    inseam: rawInseam,
    shoulderWidth: rawShoulder,
    armLength: rawArm,
  };

  // Find closest standard RTW size
  let bestMatch = MENS_SIZE_CHART[2]; // Default Medium
  let bestDiff = 999;

  for (const tier of MENS_SIZE_CHART) {
    const midChest = (tier.chestMin + tier.chestMax) / 2;
    const midWaist = (tier.waistMin + tier.waistMax) / 2;
    const diff = Math.abs(rawChest - midChest) + Math.abs(rawWaist - midWaist);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestMatch = tier;
    }
  }

  const matchScore = Math.max(85, Math.min(99, Math.round(100 - bestDiff * 1.2)));

  return {
    fitPreset: preset,
    tailoredDimensions,
    matchedRTWSize: {
      label: bestMatch.sizeLabel,
      eu: bestMatch.euSize,
      us: bestMatch.usSize,
      uk: bestMatch.ukSize,
      matchScore,
    },
  };
}

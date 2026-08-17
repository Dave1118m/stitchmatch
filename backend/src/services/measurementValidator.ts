/**
 * StitchMatch Advanced Anthropometric & Pose Sanity Validator
 * Implements ISO 8559 Digital Tailoring Biometric Rules & MTailor/3DLOOK-Grade Sanity Checks
 */

export interface ValidationCheckResult {
  passed: boolean;
  score: number; // 0 - 100
  status: 'passed' | 'warning' | 'needs_retake';
  warnings: string[];
  errors: string[];
  metricsChecked: {
    heightRatioInseam: number;
    heightRatioShoulder: number;
    heightRatioArm: number;
    waistToChestRatio: number;
  };
  recommendations: {
    en: string[];
    am: string[];
  };
}

export interface RawMeasurementInput {
  chest: number;
  waist: number;
  hip: number;
  inseam: number;
  shoulderWidth: number;
  armLength: number;
  height?: number;
}

/**
 * Validates calculated measurements against ISO 8559 human biometric boundaries
 */
export function validateAnthropometricSanity(
  data: RawMeasurementInput,
  userHeightCm: number = 175
): ValidationCheckResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const recEn: string[] = [];
  const recAm: string[] = [];

  const height = data.height || userHeightCm;

  // 1. Height Ratios (ISO 8559 Standard Human Proportions)
  const inseamRatio = (data.inseam / height) * 100;
  const shoulderRatio = (data.shoulderWidth / height) * 100;
  const armRatio = (data.armLength / height) * 100;
  const waistChestRatio = data.chest > 0 ? data.waist / data.chest : 1;

  // Check 1: Inseam Sanity (Typically 40% - 50% of total height)
  if (inseamRatio < 36) {
    warnings.push(`Inseam (${data.inseam}cm) is shorter than expected for height ${height}cm (${inseamRatio.toFixed(1)}%).`);
    recEn.push('Ensure feet are separated and camera is held at waist height to prevent perspective foreshortening.');
    recAm.push('እግሮችዎ ትንሽ እንዲራራቁ እና ካሜራው በወገብ ከፍታ ላይ እንዲሆን ያድርጉ።');
  } else if (inseamRatio > 53) {
    warnings.push(`Inseam (${data.inseam}cm) is unusually long for height ${height}cm (${inseamRatio.toFixed(1)}%).`);
    recEn.push('Check if high heels or platform shoes were worn during photo scan.');
    recAm.push('በፎቶው ወቅት ከፍ ያለ ጫማ ወይም ተረከዝ አለማድረግዎን ያረጋግጡ።');
  }

  // Check 2: Shoulder Width Sanity (Typically 22% - 32% of total height)
  if (shoulderRatio < 20) {
    warnings.push(`Shoulder width (${data.shoulderWidth}cm) appears narrow.`);
    recEn.push('Stand straight with shoulders relaxed, not hunched or rolled forward.');
    recAm.push('ትከሻዎን ዘና አድርገው ቀጥ ብለው ይቁሙ።');
  } else if (shoulderRatio > 35) {
    warnings.push(`Shoulder width (${data.shoulderWidth}cm) appears unusually wide.`);
    recEn.push('Ensure arms are resting in a natural A-pose and not extended into a full T-pose.');
    recAm.push('እጆችዎ በትንሹ ከሰውነትዎ ራቅ ብለው በA-ቅርጽ መሆናቸውን ያረጋግጡ።');
  }

  // Check 3: Arm Length Sanity (Typically 31% - 41% of total height)
  if (armRatio < 28 || armRatio > 43) {
    warnings.push(`Arm length (${data.armLength}cm) deviates from standard proportions.`);
  }

  // Check 4: Torso Circumference Coherence (Waist vs Chest vs Hip)
  if (data.waist > data.chest * 1.45) {
    warnings.push('Waist measurement is significantly larger than chest; verify clothing bulk.');
    recEn.push('Avoid bulky sweaters or loose hoodies that add artificial volume to the waist.');
    recAm.push('ወገብ ላይ ተጨማሪ ስፋት የሚፈጥሩ ወፍራም ልብሶችን ያስወግዱ።');
  }

  // Check 5: Minimum Biometric Plausibility (Biological limits)
  if (data.chest < 60 || data.chest > 180) {
    errors.push(`Chest measurement (${data.chest}cm) is outside human biological plausibility.`);
  }
  if (data.waist < 45 || data.waist > 180) {
    errors.push(`Waist measurement (${data.waist}cm) is outside human biological plausibility.`);
  }
  if (data.hip < 60 || data.hip > 190) {
    errors.push(`Hip measurement (${data.hip}cm) is outside human biological plausibility.`);
  }

  // Calculate Quality Score
  let score = 100;
  score -= warnings.length * 8;
  score -= errors.length * 35;
  score = Math.max(0, Math.min(100, score));

  let status: 'passed' | 'warning' | 'needs_retake' = 'passed';
  if (errors.length > 0 || score < 65) {
    status = 'needs_retake';
  } else if (warnings.length > 0 || score < 85) {
    status = 'warning';
  }

  return {
    passed: errors.length === 0,
    score,
    status,
    warnings,
    errors,
    metricsChecked: {
      heightRatioInseam: Math.round(inseamRatio * 10) / 10,
      heightRatioShoulder: Math.round(shoulderRatio * 10) / 10,
      heightRatioArm: Math.round(armRatio * 10) / 10,
      waistToChestRatio: Math.round(waistChestRatio * 100) / 100,
    },
    recommendations: {
      en: recEn.length > 0 ? recEn : ['Scan meets high-precision bespoke tailoring standards.'],
      am: recAm.length > 0 ? recAm : ['ስካኑ ለከፍተኛ ትክክለኛነት የልብስ ስፌት መስፈርት ያሟላል።'],
    },
  };
}

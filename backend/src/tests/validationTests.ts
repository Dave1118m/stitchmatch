/**
 * StitchMatch AI Validation Test Suite
 * Validates Anthropometric ISO 8559 rules, Edge Cases, Outlier Detection, and Gemini Integration
 */

import { validateAnthropometricSanity } from '../services/measurementValidator';

console.log('🧪 ==========================================');
console.log('🧪 Starting StitchMatch AI Validation Tests');
console.log('🧪 ==========================================\n');

let passedCount = 0;
let totalCount = 0;

function assert(description: string, condition: boolean, extraInfo?: string) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`✅ [PASS] ${description}`);
  } else {
    console.error(`❌ [FAIL] ${description} ${extraInfo ? `-> ${extraInfo}` : ''}`);
  }
}

// Test 1: Standard Male Bespoke Proportions (Height: 180cm)
const standardMale = {
  chest: 100,
  waist: 84,
  hip: 101,
  inseam: 82,
  shoulderWidth: 46,
  armLength: 64,
};
const res1 = validateAnthropometricSanity(standardMale, 180);
assert('Standard Male Profile passes validation', res1.passed);
assert('Standard Male Profile has high confidence score (>=95)', res1.score >= 95);
assert('Inseam to Height ratio is within normal range (~45.5%)', res1.metricsChecked.heightRatioInseam >= 40 && res1.metricsChecked.heightRatioInseam <= 50);

// Test 2: Standard Female Silhouette (Height: 165cm)
const standardFemale = {
  chest: 90,
  waist: 68,
  hip: 94,
  inseam: 74,
  shoulderWidth: 39,
  armLength: 57,
};
const res2 = validateAnthropometricSanity(standardFemale, 165);
assert('Standard Female Profile passes validation', res2.passed);
assert('Standard Female has status "passed"', res2.status === 'passed');

// Test 3: Edge Case - Oversized / Baggy Waist Outlier
const baggyProfile = {
  chest: 85,
  waist: 135, // Suspiciously large waist vs chest
  hip: 95,
  inseam: 75,
  shoulderWidth: 42,
  armLength: 58,
};
const res3 = validateAnthropometricSanity(baggyProfile, 170);
assert('Baggy/Outlier profile triggers warning', res3.warnings.length > 0);
assert('Quality score decreases for baggy profile', res3.score < 100);

// Test 4: Biological Implausibility Outlier (Chest < 60cm or > 180cm)
const invalidProfile = {
  chest: 220, // Impossible biological measurement
  waist: 80,
  hip: 90,
  inseam: 75,
  shoulderWidth: 40,
  armLength: 60,
};
const res4 = validateAnthropometricSanity(invalidProfile, 175);
assert('Extreme outlier is rejected (passed = false)', res4.passed === false);
assert('Status is "needs_retake"', res4.status === 'needs_retake');
assert('Error list contains biological plausibility notice', res4.errors.some(e => e.includes('biological plausibility')));

// Test 5: Inseam Perspective Foreshortening (Camera Tilted Down)
const shortInseamProfile = {
  chest: 95,
  waist: 80,
  hip: 96,
  inseam: 50, // Only 27% of height
  shoulderWidth: 44,
  armLength: 62,
};
const res5 = validateAnthropometricSanity(shortInseamProfile, 180);
assert('Tilted camera short inseam triggers warning', res5.warnings.some(w => w.includes('Inseam')));
assert('Provides Amharic and English recommendation', res5.recommendations.am.length > 0 && res5.recommendations.en.length > 0);

console.log('\n==========================================');
console.log(`📊 Test Results: ${passedCount}/${totalCount} tests passed (${Math.round((passedCount/totalCount)*100)}%)`);
console.log('==========================================\n');

if (passedCount === totalCount) {
  process.exit(0);
} else {
  process.exit(1);
}

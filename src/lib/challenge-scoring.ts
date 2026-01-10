// Hybrid scoring system for challenges (Option 3)
// 40% Relative Improvement + 30% Absolute Improvement + 30% Difficulty Bonus

import i18n from '@/i18n';

export interface BodyMetrics {
  weight?: number;
  body_fat_percentage?: number;
  muscle_mass?: number;
  measurement_date: string;
  source: 'inbody' | 'withings' | 'manual';
}

export interface ScoreBreakdown {
  totalPoints: number;
  relativeImprovementPoints: number;
  absoluteImprovementPoints: number;
  difficultyBonusPoints: number;
  activityPoints: number;
  hasBaselineData: boolean;
}

// Difficulty zones for body fat percentage
const BODY_FAT_DIFFICULTY_ZONES = [
  { threshold: 0, max: 10, multiplier: 4.0, labelKey: 'athlete' },      // <10% = extremely difficult
  { threshold: 10, max: 15, multiplier: 2.5, labelKey: 'low' },   // 10-15% = very difficult
  { threshold: 15, max: 25, multiplier: 1.5, labelKey: 'medium' },  // 15-25% = medium
  { threshold: 25, max: 100, multiplier: 1.0, labelKey: 'high' }, // >25% = relatively easy
];

// Scoring weights for hybrid formula
const SCORING_WEIGHTS = {
  relativeImprovement: 0.40,  // 40%
  absoluteImprovement: 0.30,  // 30%
  difficultyBonus: 0.30,      // 30%
  activityMultiplier: 0.2,    // Activity has lower weight
};

// Base points for activity
const ACTIVITY_POINTS = {
  workoutBase: 50,
  caloriesPer10: 1,
  measurementBase: 20,
  bodyCompBase: 30,
};

export function getDifficultyMultiplier(bodyFatPercent: number): { multiplier: number; label: string } {
  const zone = BODY_FAT_DIFFICULTY_ZONES.find(
    z => bodyFatPercent >= z.threshold && bodyFatPercent < z.max
  ) || BODY_FAT_DIFFICULTY_ZONES[BODY_FAT_DIFFICULTY_ZONES.length - 1];
  
  const label = i18n.t(`challenges:scoring.difficultyZones.${zone.labelKey}`);
  return { multiplier: zone.multiplier, label };
}

export function calculateProgressScore(
  baseline: BodyMetrics,
  current: BodyMetrics,
  activityData: {
    workouts: number;
    totalCalories: number;
    measurements: number;
    bodyCompEntries: number;
  }
): ScoreBreakdown {
  
  // If no baseline data — 0 points
  if (!baseline.body_fat_percentage || baseline.source === 'manual') {
    return {
      totalPoints: 0,
      relativeImprovementPoints: 0,
      absoluteImprovementPoints: 0,
      difficultyBonusPoints: 0,
      activityPoints: 0,
      hasBaselineData: false,
    };
  }

  let relativePoints = 0;
  let absolutePoints = 0;
  let difficultyPoints = 0;

  // === 1. RELATIVE IMPROVEMENT (40%) ===
  if (baseline.body_fat_percentage && current.body_fat_percentage) {
    const startFat = baseline.body_fat_percentage;
    const currentFat = current.body_fat_percentage;
    const fatLoss = startFat - currentFat;

    if (fatLoss > 0) {  // Only positive change
      const relativeImprovement = (fatLoss / startFat) * 100;
      relativePoints = relativeImprovement * 100;  // Scale
    }
  }

  // === 2. ABSOLUTE IMPROVEMENT (30%) ===
  if (baseline.body_fat_percentage && current.body_fat_percentage) {
    const fatLoss = baseline.body_fat_percentage - current.body_fat_percentage;
    if (fatLoss > 0) {
      absolutePoints = fatLoss * 200;  // 200 points per percentage point
    }
  }

  // Additional points for weight change (if available)
  if (baseline.weight && current.weight) {
    const weightChange = Math.abs(baseline.weight - current.weight);
    absolutePoints += weightChange * 50;  // 50 points per kg
  }

  // === 3. DIFFICULTY BONUS (30%) ===
  const { multiplier } = getDifficultyMultiplier(baseline.body_fat_percentage);
  difficultyPoints = (relativePoints + absolutePoints) * (multiplier - 1.0) * 0.3;

  // === 4. ACTIVITY (lower weight) ===
  let activityPoints = 0;
  activityPoints += activityData.workouts * ACTIVITY_POINTS.workoutBase;
  activityPoints += Math.floor(activityData.totalCalories / 10) * ACTIVITY_POINTS.caloriesPer10;
  activityPoints += activityData.measurements * ACTIVITY_POINTS.measurementBase;
  activityPoints += activityData.bodyCompEntries * ACTIVITY_POINTS.bodyCompBase;
  activityPoints *= SCORING_WEIGHTS.activityMultiplier;  // Only 20%

  // === FINAL SCORE ===
  const progressScore = 
    (relativePoints * SCORING_WEIGHTS.relativeImprovement) +
    (absolutePoints * SCORING_WEIGHTS.absoluteImprovement) +
    difficultyPoints;

  const totalPoints = Math.round(progressScore + activityPoints);

  return {
    totalPoints,
    relativeImprovementPoints: Math.round(relativePoints * SCORING_WEIGHTS.relativeImprovement),
    absoluteImprovementPoints: Math.round(absolutePoints * SCORING_WEIGHTS.absoluteImprovement),
    difficultyBonusPoints: Math.round(difficultyPoints),
    activityPoints: Math.round(activityPoints),
    hasBaselineData: true,
  };
}

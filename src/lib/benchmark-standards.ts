/**
 * Benchmark Standards for Health Metrics
 * Based on international health and fitness guidelines
 */

export type AudienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite';

export interface BenchmarkRange {
  min: number;
  target: number;
  max: number;
}

export interface BenchmarkStandard {
  beginner: BenchmarkRange;
  intermediate: BenchmarkRange;
  advanced: BenchmarkRange;
  elite: BenchmarkRange;
}

/**
 * Resting Heart Rate (bpm)
 * Source: American Heart Association, athletic performance research
 * Lower is better - indicates better cardiovascular fitness
 */
export const RHR_STANDARDS: BenchmarkStandard = {
  beginner: { min: 65, target: 68, max: 72 },
  intermediate: { min: 58, target: 62, max: 65 },
  advanced: { min: 50, target: 54, max: 58 },
  elite: { min: 40, target: 45, max: 50 }
};

/**
 * Heart Rate Variability (ms)
 * Source: Clinical research, HRV standards for athletes
 * Higher is better - indicates better autonomic nervous system health
 */
export const HRV_STANDARDS: BenchmarkStandard = {
  beginner: { min: 40, target: 50, max: 60 },
  intermediate: { min: 60, target: 70, max: 80 },
  advanced: { min: 80, target: 90, max: 100 },
  elite: { min: 100, target: 110, max: 120 }
};

/**
 * VO2 Max - Males (ml/kg/min)
 * Source: ACSM, Cooper Institute standards
 * Higher is better - aerobic capacity
 */
export const VO2MAX_MALE_STANDARDS: BenchmarkStandard = {
  beginner: { min: 35, target: 38, max: 42 },
  intermediate: { min: 42, target: 46, max: 50 },
  advanced: { min: 50, target: 55, max: 60 },
  elite: { min: 60, target: 68, max: 75 }
};

/**
 * VO2 Max - Females (ml/kg/min)
 * Source: ACSM, Cooper Institute standards
 * Higher is better - aerobic capacity (typically 10-15% lower than males)
 */
export const VO2MAX_FEMALE_STANDARDS: BenchmarkStandard = {
  beginner: { min: 27, target: 30, max: 35 },
  intermediate: { min: 35, target: 39, max: 43 },
  advanced: { min: 43, target: 48, max: 53 },
  elite: { min: 53, target: 60, max: 67 }
};

/**
 * Recovery Score (%)
 * Source: Whoop, Oura Ring research standards
 * Higher is better
 */
export const RECOVERY_SCORE_STANDARDS: BenchmarkStandard = {
  beginner: { min: 60, target: 65, max: 70 },
  intermediate: { min: 70, target: 75, max: 80 },
  advanced: { min: 80, target: 85, max: 90 },
  elite: { min: 90, target: 93, max: 97 }
};

/**
 * Sleep Duration (hours)
 * Source: National Sleep Foundation, athletic recovery research
 * Target range - optimal is 7-9 hours
 */
export const SLEEP_STANDARDS: BenchmarkStandard = {
  beginner: { min: 6.5, target: 7.0, max: 7.5 },
  intermediate: { min: 7.0, target: 7.5, max: 8.0 },
  advanced: { min: 7.5, target: 8.0, max: 8.5 },
  elite: { min: 8.0, target: 8.5, max: 9.0 }
};

/**
 * 5K Run Time (minutes)
 * Source: Running performance standards
 * Lower is better
 */
export const RUN_5K_STANDARDS: BenchmarkStandard = {
  beginner: { min: 28, target: 32, max: 38 },
  intermediate: { min: 23, target: 26, max: 28 },
  advanced: { min: 19, target: 21, max: 23 },
  elite: { min: 15, target: 17, max: 19 }
};

/**
 * Body Fat Percentage - Males (%)
 * Source: ACE, NSCA standards
 * Lower is typically better (within healthy range)
 */
export const BODYFAT_MALE_STANDARDS: BenchmarkStandard = {
  beginner: { min: 18, target: 20, max: 24 },
  intermediate: { min: 14, target: 16, max: 18 },
  advanced: { min: 10, target: 12, max: 14 },
  elite: { min: 6, target: 8, max: 10 }
};

/**
 * Body Fat Percentage - Females (%)
 * Source: ACE, NSCA standards
 * Lower is typically better (within healthy range, females naturally have higher essential fat)
 */
export const BODYFAT_FEMALE_STANDARDS: BenchmarkStandard = {
  beginner: { min: 25, target: 28, max: 32 },
  intermediate: { min: 21, target: 24, max: 25 },
  advanced: { min: 17, target: 19, max: 21 },
  elite: { min: 14, target: 16, max: 17 }
};

/**
 * Main lookup object for all standards
 */
export const BENCHMARK_STANDARDS: Record<string, BenchmarkStandard> = {
  rhr: RHR_STANDARDS,
  hrv: HRV_STANDARDS,
  vo2max_male: VO2MAX_MALE_STANDARDS,
  vo2max_female: VO2MAX_FEMALE_STANDARDS,
  recovery_score: RECOVERY_SCORE_STANDARDS,
  sleep: SLEEP_STANDARDS,
  run_5k: RUN_5K_STANDARDS,
  bodyfat_male: BODYFAT_MALE_STANDARDS,
  bodyfat_female: BODYFAT_FEMALE_STANDARDS
};

/**
 * Get the level label for display
 */
export const AUDIENCE_LEVEL_LABELS: Record<number, AudienceLevel> = {
  0: 'beginner',
  1: 'intermediate',
  2: 'advanced',
  3: 'elite'
};

/**
 * Helper function to calculate benchmark value within a standard range
 * @param standard - The benchmark standard to use
 * @param audienceLevel - Target audience level (0-3)
 * @param difficultyLevel - Challenge difficulty (0-3)
 * @returns Calculated benchmark value
 */
export function calculateStandardBenchmark(
  standard: BenchmarkStandard,
  audienceLevel: number,
  difficultyLevel: number
): number {
  const levelKey = AUDIENCE_LEVEL_LABELS[audienceLevel];
  const range = standard[levelKey];
  
  // Difficulty affects where in the range we target
  // 0 = min, 1 = closer to min, 2 = closer to max, 3 = max
  const rangeSpan = range.max - range.min;
  const difficultyRatio = difficultyLevel / 3; // 0.0 to 1.0
  
  const value = range.min + (rangeSpan * difficultyRatio);
  
  return Math.round(value * 10) / 10;
}

/**
 * Get display label with level
 * @param value - The benchmark value
 * @param unit - The unit of measurement
 * @param audienceLevel - The audience level (0-3)
 * @returns Formatted string like "54 bpm (Advanced)"
 */
export function getBenchmarkLabel(
  value: number,
  unit: string,
  audienceLevel: number
): string {
  const levelNames = ['Beginner', 'Intermediate', 'Advanced', 'Elite'];
  const levelName = levelNames[audienceLevel] || 'Unknown';
  return `${value} ${unit} (${levelName})`;
}

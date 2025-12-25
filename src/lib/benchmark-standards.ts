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
  beginner: { min: 58, target: 60, max: 65 },
  intermediate: { min: 52, target: 55, max: 58 },
  advanced: { min: 45, target: 48, max: 52 },
  elite: { min: 40, target: 41, max: 45 }
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
  elite: { min: 90, target: 95, max: 100 }
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
  elite: { min: 8.0, target: 8.25, max: 8.5 }
};

/**
 * Daily Steps
 * Source: WHO guidelines, fitness tracking research
 * Higher is better - daily activity level
 */
export const STEPS_STANDARDS: BenchmarkStandard = {
  beginner: { min: 7000, target: 8000, max: 9000 },
  intermediate: { min: 10000, target: 12000, max: 14000 },
  advanced: { min: 14000, target: 16000, max: 18000 },
  elite: { min: 18000, target: 20000, max: 22000 }
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

// ============= WHOOP-Compatible Standards =============

/**
 * WHOOP Recovery Score Standards (%)
 * Source: WHOOP performance analytics
 * Green zone: 67%+, Yellow: 34-66%, Red: 0-33%
 * Higher is better - indicates readiness for strain
 */
export const WHOOP_RECOVERY_STANDARDS: BenchmarkStandard = {
  beginner: { min: 50, target: 60, max: 66 },      // Yellow zone
  intermediate: { min: 66, target: 75, max: 84 },  // Low green zone
  advanced: { min: 84, target: 90, max: 95 },      // High green zone
  elite: { min: 95, target: 97, max: 100 }         // Peak performance
};

/**
 * WHOOP HRV Standards (ms)
 * Source: WHOOP research, clinical HRV studies
 * Higher is better - indicates better autonomic health and recovery
 */
export const WHOOP_HRV_STANDARDS: BenchmarkStandard = {
  beginner: { min: 30, target: 45, max: 55 },
  intermediate: { min: 55, target: 70, max: 85 },
  advanced: { min: 85, target: 100, max: 115 },
  elite: { min: 115, target: 130, max: 150 }
};

/**
 * WHOOP Resting Heart Rate Standards (bpm)
 * Source: WHOOP data, athletic performance research
 * Lower is better - indicates better cardiovascular fitness
 */
export const WHOOP_RHR_STANDARDS: BenchmarkStandard = {
  beginner: { min: 62, target: 68, max: 75 },
  intermediate: { min: 52, target: 58, max: 62 },
  advanced: { min: 45, target: 50, max: 52 },
  elite: { min: 38, target: 42, max: 45 }
};

/**
 * WHOOP Sleep Performance Standards (hours)
 * Source: WHOOP sleep coach, sleep research
 * Higher is better for athletes - 7-9+ hours optimal
 */
export const WHOOP_SLEEP_STANDARDS: BenchmarkStandard = {
  beginner: { min: 6.5, target: 7.0, max: 7.5 },
  intermediate: { min: 7.5, target: 8.0, max: 8.3 },
  advanced: { min: 8.3, target: 8.5, max: 9.0 },
  elite: { min: 9.0, target: 9.5, max: 10.0 }
};

/**
 * WHOOP Sleep Performance Standards (%)
 * Source: WHOOP sleep analysis
 * Higher is better - percentage of sleep need met
 */
export const WHOOP_SLEEP_PERFORMANCE_STANDARDS: BenchmarkStandard = {
  beginner: { min: 70, target: 80, max: 85 },
  intermediate: { min: 85, target: 90, max: 93 },
  advanced: { min: 93, target: 96, max: 98 },
  elite: { min: 98, target: 99, max: 100 }
};

/**
 * WHOOP Respiratory Rate Standards (breaths/min)
 * Source: WHOOP sleep analysis, clinical research
 * Lower is better during sleep - indicates relaxed state
 */
export const WHOOP_RESPIRATORY_STANDARDS: BenchmarkStandard = {
  beginner: { min: 14, target: 16, max: 18 },
  intermediate: { min: 13, target: 14, max: 15 },
  advanced: { min: 12, target: 13, max: 14 },
  elite: { min: 11, target: 12, max: 13 }
};

/**
 * WHOOP Sleep Consistency Standards (%)
 * Source: WHOOP sleep coaching
 * Higher is better - indicates regular sleep schedule
 */
export const WHOOP_SLEEP_CONSISTENCY_STANDARDS: BenchmarkStandard = {
  beginner: { min: 60, target: 70, max: 75 },
  intermediate: { min: 75, target: 82, max: 88 },
  advanced: { min: 88, target: 93, max: 97 },
  elite: { min: 97, target: 99, max: 100 }
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
  steps: STEPS_STANDARDS,
  run_5k: RUN_5K_STANDARDS,
  bodyfat_male: BODYFAT_MALE_STANDARDS,
  bodyfat_female: BODYFAT_FEMALE_STANDARDS,
  // WHOOP-compatible standards
  whoop_recovery: WHOOP_RECOVERY_STANDARDS,
  whoop_hrv: WHOOP_HRV_STANDARDS,
  whoop_rhr: WHOOP_RHR_STANDARDS,
  whoop_sleep: WHOOP_SLEEP_STANDARDS,
  whoop_sleep_performance: WHOOP_SLEEP_PERFORMANCE_STANDARDS,
  whoop_respiratory: WHOOP_RESPIRATORY_STANDARDS,
  whoop_sleep_consistency: WHOOP_SLEEP_CONSISTENCY_STANDARDS
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
 * @param direction - Direction of metric ('higher', 'lower', 'target')
 * @returns Calculated benchmark value
 */
export function calculateStandardBenchmark(
  standard: BenchmarkStandard,
  audienceLevel: number,
  difficultyLevel: number,
  direction: 'higher' | 'lower' | 'target' = 'higher'
): number {
  // Комбинируем audience и difficulty для определения эффективного уровня
  // audienceLevel определяет базовый диапазон, difficultyLevel смещает внутри и между диапазонами
  const combinedLevel = Math.min(3, Math.round((audienceLevel + difficultyLevel) / 2));
  const levelKey = AUDIENCE_LEVEL_LABELS[combinedLevel];
  const range = standard[levelKey];
  
  // Дополнительный сдвиг внутри диапазона на основе сложности
  const inRangeRatio = difficultyLevel / 3; // 0.0 to 1.0
  const rangeSpan = range.max - range.min;
  
  let value: number;
  
  if (direction === 'lower') {
    // Для "lower is better" (RHR): выше сложность = ниже значение (лучше)
    // При высокой сложности стремимся к min диапазона
    value = range.max - (rangeSpan * inRangeRatio);
  } else {
    // Для "higher is better" (HRV, Recovery, Sleep): выше сложность = выше значение
    // При высокой сложности стремимся к max диапазона
    value = range.min + (rangeSpan * inRangeRatio);
  }
  
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

/**
 * Benchmark Level Recalculation
 * Recalculates all difficulty levels based on a custom input value
 */

export interface RecalculatedLevels {
  beginner: number;
  intermediate: number;
  advanced: number;
  elite: number;
}

// Level multipliers relative to intermediate (base = 1.0)
const LEVEL_MULTIPLIERS = {
  higher: {
    beginner: 0.75,
    intermediate: 1.0,
    advanced: 1.25,
    elite: 1.5,
  },
  lower: {
    beginner: 1.35,
    intermediate: 1.0,
    advanced: 0.80,
    elite: 0.65,
  },
  target: {
    beginner: 0.95,
    intermediate: 1.0,
    advanced: 1.02,
    elite: 1.05,
  },
};

const LEVEL_INDEX_TO_KEY: Record<number, keyof RecalculatedLevels> = {
  0: 'beginner',
  1: 'intermediate',
  2: 'advanced',
  3: 'elite',
};

/**
 * Recalculate all difficulty levels based on a custom value
 * @param customValue - User-entered value
 * @param inputLevel - Level at which the value was entered (0-3)
 * @param direction - 'higher' | 'lower' | 'target'
 * @param constraints - Optional min/max constraints
 * @returns All four levels with recalculated values
 */
export function recalculateBenchmarkLevels(
  customValue: number,
  inputLevel: number,
  direction: 'higher' | 'lower' | 'target' = 'higher',
  constraints?: { min?: number; max?: number }
): RecalculatedLevels {
  const multipliers = LEVEL_MULTIPLIERS[direction];
  const inputLevelKey = LEVEL_INDEX_TO_KEY[inputLevel];
  const inputMultiplier = multipliers[inputLevelKey];
  
  // Calculate base value (normalize by input level's multiplier)
  const baseValue = customValue / inputMultiplier;
  
  // Calculate all levels
  const levels: RecalculatedLevels = {
    beginner: roundValue(baseValue * multipliers.beginner),
    intermediate: roundValue(baseValue * multipliers.intermediate),
    advanced: roundValue(baseValue * multipliers.advanced),
    elite: roundValue(baseValue * multipliers.elite),
  };
  
  // Apply constraints if provided
  if (constraints) {
    Object.keys(levels).forEach((key) => {
      const levelKey = key as keyof RecalculatedLevels;
      let value = levels[levelKey];
      if (constraints.min !== undefined) value = Math.max(constraints.min, value);
      if (constraints.max !== undefined) value = Math.min(constraints.max, value);
      levels[levelKey] = roundValue(value);
    });
  }
  
  return levels;
}

/**
 * Get display-friendly level labels
 */
export const LEVEL_LABELS: Record<keyof RecalculatedLevels, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  elite: 'Elite',
};

function roundValue(value: number): number {
  // Round to 1 decimal place for most values
  if (value >= 100) {
    return Math.round(value);
  }
  return Math.round(value * 10) / 10;
}

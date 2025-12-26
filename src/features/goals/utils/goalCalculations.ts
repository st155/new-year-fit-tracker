// Goal Calculations Utilities

/**
 * Check if a date is within the specified number of days from now
 */
export function isRecentDate(dateStr?: string, days: number = 30): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays <= days;
}

/**
 * Determine if goal type requires "lower is better" calculation
 */
export function isLowerBetterGoal(goalName: string): boolean {
  const nameLower = goalName.toLowerCase();
  
  const isDurationGoal = nameLower.includes('планка') || 
                        nameLower.includes('plank') ||
                        nameLower.includes('vo2');
  
  const isRunningGoal = nameLower.includes('бег') || 
                       nameLower.includes('run') ||
                       nameLower.includes('км');
  
  // "Lower is better" only for fat, weight, and running (not for plank!)
  return (nameLower.includes('жир') || 
          nameLower.includes('вес') ||
          isRunningGoal) && !isDurationGoal;
}

/**
 * Check if goal is a time-based goal
 */
export function isTimeGoal(goalName: string, targetUnit?: string | null): boolean {
  const nameLower = goalName.toLowerCase();
  const isTimeUnit = targetUnit && ['сек', 'мин', 'час', 'sec', 'min', 'hour'].some(u => 
    targetUnit.toLowerCase().includes(u)
  );
  
  return isTimeUnit || 
         nameLower.includes('время') ||
         nameLower.includes('бег');
}

/**
 * Check if goal is a body composition goal
 */
export function isBodyCompositionGoal(goalName: string): boolean {
  const nameLower = goalName.toLowerCase();
  return nameLower.includes('вес') || 
         nameLower.includes('weight') ||
         nameLower.includes('жир') || 
         nameLower.includes('fat') ||
         nameLower.includes('мышц') || 
         nameLower.includes('muscle');
}

/**
 * Calculate progress percentage based on current, target, and baseline values
 */
export function calculateProgress(
  currentValue: number,
  targetValue: number | null,
  baselineValue: number | null,
  isLowerBetter: boolean
): number {
  if (!targetValue || !currentValue) {
    return 0;
  }

  if (isLowerBetter) {
    // Lower is better (body fat, weight, running time)
    if (currentValue <= targetValue) {
      return 100;
    } else if (baselineValue && baselineValue > targetValue && baselineValue !== currentValue) {
      const totalRange = baselineValue - targetValue;
      const progressMade = baselineValue - currentValue;
      return Math.max(0, Math.min(100, (progressMade / totalRange) * 100));
    } else {
      // Fallback when no baseline: assume started 50% worse than current
      const assumedStart = currentValue * 1.5;
      const totalRange = assumedStart - targetValue;
      const progressMade = assumedStart - currentValue;
      return Math.max(0, Math.min(100, (progressMade / totalRange) * 100));
    }
  } else {
    // Higher is better (duration, strength, reps) - allow >100% for overachievement
    if (baselineValue && baselineValue < targetValue && baselineValue !== currentValue) {
      const totalRange = targetValue - baselineValue;
      const progressMade = currentValue - baselineValue;
      return Math.max(0, (progressMade / totalRange) * 100);
    } else {
      // Fallback when no baseline: show simple ratio
      return Math.max(0, (currentValue / targetValue) * 100);
    }
  }
}

/**
 * Calculate trend based on sparkline data
 */
export function calculateTrend(
  sparklineData: Array<{ value: number; measurement_date: string }>
): { trend: 'up' | 'down' | 'stable'; trendPercentage: number } {
  if (sparklineData.length < 2) {
    return { trend: 'stable', trendPercentage: 0 };
  }

  const latest = sparklineData[0].value;
  const previous = sparklineData[1].value;
  
  const diff = latest - previous;
  const trendPercentage = previous ? (diff / previous) * 100 : 0;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(trendPercentage) > 0.5) {
    trend = diff > 0 ? 'up' : 'down';
  }

  return { trend, trendPercentage };
}

/**
 * Get metric name mappings for unified metrics
 */
export function getMetricNameVariants(goalName: string): string[] {
  const nameLower = goalName.toLowerCase();
  
  if (nameLower === 'recovery score' || nameLower.includes('recovery score')) {
    return ['Recovery Score', 'Recovery'];
  }
  
  if (nameLower === 'hrv' || nameLower === 'hrv (heart rate variability)') {
    return ['HRV', 'HRV RMSSD', 'Sleep HRV RMSSD', 'Heart Rate Variability'];
  }
  
  if (nameLower === 'resting heart rate' || nameLower.includes('resting heart rate')) {
    return ['Resting Heart Rate', 'Resting HR', 'RHR', 'Sleep Resting Heart Rate'];
  }
  
  if (nameLower === 'sleep hours' || nameLower.includes('sleep hours')) {
    return ['Sleep Duration', 'Sleep Hours', 'Total Sleep'];
  }
  
  return [goalName];
}

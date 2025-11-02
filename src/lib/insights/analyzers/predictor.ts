/**
 * Prediction Utilities
 * Simple forecasting for metric trends and goal completion
 */

export type Trend = 'up' | 'down' | 'stable';

/**
 * Calculate trend direction based on linear regression slope
 */
export function calculateTrend(values: number[]): Trend {
  if (values.length < 3) return 'stable';

  const slope = calculateSlope(values);
  const threshold = Math.abs(values[0]) * 0.05; // 5% threshold

  if (slope > threshold) return 'up';
  if (slope < -threshold) return 'down';
  return 'stable';
}

/**
 * Calculate slope using simple linear regression
 */
function calculateSlope(values: number[]): number {
  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = values[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
}

/**
 * Predict next value using linear regression
 */
export function predictNextValue(historicalValues: number[], daysAhead: number = 1): number {
  if (historicalValues.length < 3) return historicalValues[0] || 0;

  const n = historicalValues.length;
  const slope = calculateSlope(historicalValues);
  
  // Calculate intercept
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += historicalValues[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  const intercept = meanY - slope * meanX;

  // Predict
  const nextX = n - 1 + daysAhead;
  return slope * nextX + intercept;
}

/**
 * Predict days until goal completion based on current trend
 */
export function predictGoalCompletion(
  currentValue: number,
  targetValue: number,
  historicalValues: number[]
): number {
  if (historicalValues.length < 3) return -1;

  const slope = calculateSlope(historicalValues);
  
  // If no progress or going in wrong direction
  if (slope === 0) return -1;
  if ((targetValue > currentValue && slope <= 0) || (targetValue < currentValue && slope >= 0)) {
    return -1;
  }

  const difference = targetValue - currentValue;
  const daysNeeded = Math.abs(difference / slope);

  // Cap at reasonable values
  if (daysNeeded > 365) return -1;
  if (daysNeeded < 0) return -1;

  return Math.ceil(daysNeeded);
}

/**
 * Calculate moving average for smoothing
 */
export function calculateMovingAverage(values: number[], windowSize: number = 7): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = values.slice(start, i + 1);
    const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
    result.push(avg);
  }

  return result;
}

/**
 * Calculate percent change over period
 */
export function calculatePercentChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Pattern Detection Utilities
 * Detects temporal patterns and optimal times for activities
 */

export interface TimePattern {
  metricName: string;
  timeOfDay?: string;
  dayOfWeek?: string;
  averageValue: number;
  occurrences: number;
}

/**
 * Detect time-of-day patterns in metrics
 */
export function detectTimePatterns(metricsWithTimestamp: any[]): TimePattern[] {
  const patterns = new Map<string, { sum: number; count: number }>();

  metricsWithTimestamp.forEach((item) => {
    const timestamp = item.timestamp || item.created_at;
    if (!timestamp) return;

    const hour = new Date(timestamp).getHours();
    const timeSlot = getTimeSlot(hour);
    const key = `${item.metric_name}-${timeSlot}`;

    if (!patterns.has(key)) {
      patterns.set(key, { sum: 0, count: 0 });
    }

    const data = patterns.get(key)!;
    data.sum += item.value;
    data.count += 1;
  });

  const results: TimePattern[] = [];
  patterns.forEach((data, key) => {
    const [metricName, timeOfDay] = key.split('-');
    results.push({
      metricName,
      timeOfDay,
      averageValue: data.sum / data.count,
      occurrences: data.count,
    });
  });

  return results.sort((a, b) => b.averageValue - a.averageValue);
}

/**
 * Get time slot label from hour
 */
function getTimeSlot(hour: number): string {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Detect day-of-week patterns
 */
export function detectWeekdayPatterns(metricsWithTimestamp: any[]): TimePattern[] {
  const patterns = new Map<string, { sum: number; count: number }>();

  metricsWithTimestamp.forEach((item) => {
    const timestamp = item.timestamp || item.created_at;
    if (!timestamp) return;

    const date = new Date(timestamp);
    const dayOfWeek = date.toLocaleDateString('ru-RU', { weekday: 'long' });
    const key = `${item.metric_name}-${dayOfWeek}`;

    if (!patterns.has(key)) {
      patterns.set(key, { sum: 0, count: 0 });
    }

    const data = patterns.get(key)!;
    data.sum += item.value;
    data.count += 1;
  });

  const results: TimePattern[] = [];
  patterns.forEach((data, key) => {
    const [metricName, dayOfWeek] = key.split('-');
    results.push({
      metricName,
      dayOfWeek,
      averageValue: data.sum / data.count,
      occurrences: data.count,
    });
  });

  return results.sort((a, b) => b.averageValue - a.averageValue);
}

/**
 * Find optimal time for an activity based on historical performance
 */
export function findOptimalTime(metricName: string, data: any[]): string | null {
  const relevantData = data.filter((item) => item.metric_name === metricName);
  if (relevantData.length < 7) return null;

  const patterns = detectTimePatterns(relevantData);
  const metricPatterns = patterns.filter((p) => p.metricName === metricName);

  if (metricPatterns.length === 0) return null;

  // Return time slot with highest average value
  const best = metricPatterns[0];
  return best.timeOfDay || null;
}

/**
 * Detect weekend vs weekday differences
 */
export function detectWeekendEffect(metricName: string, data: any[]): {
  weekdayAvg: number;
  weekendAvg: number;
  difference: number;
} | null {
  const relevantData = data.filter((item) => item.metric_name === metricName);
  if (relevantData.length < 14) return null;

  let weekdaySum = 0;
  let weekdayCount = 0;
  let weekendSum = 0;
  let weekendCount = 0;

  relevantData.forEach((item) => {
    const timestamp = item.timestamp || item.created_at;
    if (!timestamp) return;

    const date = new Date(timestamp);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend) {
      weekendSum += item.value;
      weekendCount += 1;
    } else {
      weekdaySum += item.value;
      weekdayCount += 1;
    }
  });

  if (weekdayCount === 0 || weekendCount === 0) return null;

  const weekdayAvg = weekdaySum / weekdayCount;
  const weekendAvg = weekendSum / weekendCount;
  const difference = ((weekendAvg - weekdayAvg) / weekdayAvg) * 100;

  return { weekdayAvg, weekendAvg, difference };
}

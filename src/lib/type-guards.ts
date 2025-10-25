/**
 * Runtime type guards for type safety
 */

import { UnifiedMetric, DataSource, MetricType, BodyComposition } from '@/types/metrics';

/**
 * Check if value is a valid UnifiedMetric
 */
export function isUnifiedMetric(data: unknown): data is UnifiedMetric {
  if (typeof data !== 'object' || data === null) return false;
  
  const metric = data as Record<string, unknown>;
  
  return (
    typeof metric.metric_id === 'string' &&
    typeof metric.user_id === 'string' &&
    typeof metric.value === 'number' &&
    typeof metric.unit === 'string' &&
    typeof metric.source === 'string' &&
    typeof metric.measurement_date === 'string'
  );
}

/**
 * Check if value is a valid DataSource
 */
export function isDataSource(value: unknown): value is DataSource {
  return (
    typeof value === 'string' &&
    Object.values(DataSource).includes(value as DataSource)
  );
}

/**
 * Check if value is a valid BodyComposition
 */
export function isBodyComposition(data: unknown): data is BodyComposition {
  if (typeof data !== 'object' || data === null) return false;
  
  const body = data as Record<string, unknown>;
  
  return (
    typeof body.id === 'string' &&
    typeof body.user_id === 'string' &&
    typeof body.test_date === 'string' &&
    typeof body.source === 'string'
  );
}

/**
 * Assert that a value is defined (not null or undefined)
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message: string = 'Value must be defined'
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

/**
 * Assert exhaustiveness in switch statements
 */
export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(x)}`);
}

/**
 * Type guard for checking if error is an Error instance
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Type guard for checking if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard for checking if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard for checking if value is an array
 */
export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Type guard for checking if value is a valid ISO date string
 */
export function isISODateString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && value === date.toISOString();
}

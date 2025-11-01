/**
 * UI Helper Functions for Data Quality Visualization
 */

import type { BadgeProps } from '@/components/ui/badge';

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'hsl(var(--success))';
  if (confidence >= 60) return 'hsl(var(--primary))';
  if (confidence >= 40) return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
}

export function getConfidenceBadgeVariant(confidence: number): BadgeProps['variant'] {
  if (confidence >= 80) return 'excellent';
  if (confidence >= 60) return 'good';
  if (confidence >= 40) return 'fair';
  return 'poor';
}

export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 80) return 'Отлично';
  if (confidence >= 60) return 'Хорошо';
  if (confidence >= 40) return 'Средне';
  return 'Плохо';
}

export function getConfidenceIcon(confidence: number): string {
  if (confidence >= 80) return '✓';
  if (confidence >= 60) return '○';
  if (confidence >= 40) return '△';
  return '!';
}

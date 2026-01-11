/**
 * UI Helper Functions for Data Quality Visualization
 */

import type { BadgeProps } from '@/components/ui/badge';
import i18n from '@/i18n';

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
  if (confidence >= 80) return i18n.t('common:dataQuality.excellent');
  if (confidence >= 60) return i18n.t('common:dataQuality.good');
  if (confidence >= 40) return i18n.t('common:dataQuality.fair');
  return i18n.t('common:dataQuality.poor');
}

export function getConfidenceIcon(confidence: number): string {
  if (confidence >= 80) return '✓';
  if (confidence >= 60) return '○';
  if (confidence >= 40) return '△';
  return '!';
}

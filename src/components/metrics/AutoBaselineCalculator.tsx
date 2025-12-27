/**
 * Component that triggers automatic baseline calculation on app load
 */

import { useAutoCalculateBaselines } from '@/hooks/metrics/useAutoCalculateBaselines';

export function AutoBaselineCalculator() {
  useAutoCalculateBaselines();
  return null; // This component doesn't render anything
}

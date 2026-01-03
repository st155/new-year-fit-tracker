import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTodayMetrics } from '@/hooks/metrics/useTodayMetrics';

export type RecoveryModeReason = 
  | 'high_rhr' 
  | 'low_recovery' 
  | 'low_hrv' 
  | 'combined' 
  | null;

export interface RecoveryModeState {
  isActive: boolean;
  reason: RecoveryModeReason;
  metrics: {
    rhr: number;
    recovery: number;
    hrv: number;
  };
  canOverride: boolean;
  loading: boolean;
}

// Thresholds for detecting illness/recovery mode
const THRESHOLDS = {
  RHR_HIGH: 65,            // RHR > 65 bpm = elevated (illness indicator)
  RHR_ELEVATED: 55,        // RHR > 55 bpm = slightly elevated (check with recovery)
  RECOVERY_CRITICAL: 25,   // Recovery < 25% = critical
  RECOVERY_LOW: 40,        // Recovery < 40% = low (check with RHR)
  HRV_CRITICAL: 20,        // HRV < 20 ms = very low
};

export function useRecoveryMode(): RecoveryModeState {
  const { user } = useAuth();
  const { metrics, loading } = useTodayMetrics(user?.id);

  const state = useMemo(() => {
    const { rhr, recovery, hrv } = metrics;
    
    // Default state
    const result: RecoveryModeState = {
      isActive: false,
      reason: null,
      metrics: { rhr, recovery, hrv },
      canOverride: true,
      loading,
    };

    // Skip if no data yet
    if (loading || (rhr === 0 && recovery === 0 && hrv === 0)) {
      return result;
    }

    // Check localStorage for manual override today
    const today = new Date().toISOString().split('T')[0];
    const overrideKey = `recovery_mode_override_${today}`;
    if (localStorage.getItem(overrideKey) === 'true') {
      return result; // User overrode recovery mode today
    }

    // Condition 1: Very high RHR (definitely sick)
    if (rhr > THRESHOLDS.RHR_HIGH) {
      return {
        ...result,
        isActive: true,
        reason: 'high_rhr' as const,
      };
    }

    // Condition 2: Critical recovery score
    if (recovery > 0 && recovery < THRESHOLDS.RECOVERY_CRITICAL) {
      return {
        ...result,
        isActive: true,
        reason: 'low_recovery' as const,
      };
    }

    // Condition 3: Critical HRV
    if (hrv > 0 && hrv < THRESHOLDS.HRV_CRITICAL) {
      return {
        ...result,
        isActive: true,
        reason: 'low_hrv' as const,
      };
    }

    // Condition 4: Combined elevated RHR + low recovery
    if (rhr > THRESHOLDS.RHR_ELEVATED && recovery > 0 && recovery < THRESHOLDS.RECOVERY_LOW) {
      return {
        ...result,
        isActive: true,
        reason: 'combined' as const,
      };
    }

    return result;
  }, [metrics, loading]);

  return state;
}

// Function to override recovery mode for today
export function overrideRecoveryModeToday(): void {
  const today = new Date().toISOString().split('T')[0];
  const overrideKey = `recovery_mode_override_${today}`;
  localStorage.setItem(overrideKey, 'true');
}

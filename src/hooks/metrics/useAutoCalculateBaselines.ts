/**
 * Auto-calculates personal baselines on app load
 * Runs once per session when user has enough data
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCalculateBaselines, usePersonalBaselines } from './usePersonalBaselines';
import { supabase } from '@/integrations/supabase/client';

const RECALCULATION_INTERVAL_DAYS = 7;

export function useAutoCalculateBaselines() {
  const { user } = useAuth();
  const { data: baselines } = usePersonalBaselines();
  const { mutate: calculateBaselines, isPending } = useCalculateBaselines();
  const hasCalculatedRef = useRef(false);
  
  useEffect(() => {
    if (!user?.id || isPending || hasCalculatedRef.current) return;
    
    const checkAndCalculate = async () => {
      // Check if we have any baselines at all
      const existingBaselines = Object.values(baselines || {});
      
      if (existingBaselines.length === 0) {
        // No baselines yet - try to calculate
        console.log('[AutoBaselines] No baselines found, calculating...');
        hasCalculatedRef.current = true;
        calculateBaselines(undefined);
        return;
      }
      
      // Check if recalculation is needed (older than 7 days)
      const oldestCalculation = existingBaselines.reduce((oldest, b) => {
        if (!b.calculation_date) return oldest;
        const date = new Date(b.calculation_date);
        return date < oldest ? date : oldest;
      }, new Date());
      
      const daysSinceCalculation = Math.floor(
        (Date.now() - oldestCalculation.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceCalculation >= RECALCULATION_INTERVAL_DAYS) {
        console.log(`[AutoBaselines] Recalculating (${daysSinceCalculation} days old)...`);
        hasCalculatedRef.current = true;
        calculateBaselines(undefined);
      }
    };
    
    // Small delay to not block initial render
    const timeout = setTimeout(checkAndCalculate, 2000);
    return () => clearTimeout(timeout);
  }, [user?.id, baselines, calculateBaselines, isPending]);
}

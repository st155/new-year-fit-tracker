/**
 * Hook for fetching and managing personal metric baselines
 * Uses user_metric_baselines table to store personalized thresholds
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import i18n from '@/i18n';

export interface PersonalBaseline {
  id: string;
  user_id: string;
  metric_name: string;
  personal_best: number | null;
  personal_average: number | null;
  personal_low: number | null;  // 25th percentile
  personal_high: number | null; // 75th percentile
  days_of_data: number;
  calculation_date: string | null;
  is_active: boolean;
}

export interface PersonalBaselinesMap {
  [metricName: string]: PersonalBaseline;
}

// Query keys for personal baselines
export const personalBaselinesKeys = {
  all: ['personal-baselines'] as const,
  user: (userId: string) => [...personalBaselinesKeys.all, userId] as const,
  metric: (userId: string, metricName: string) => 
    [...personalBaselinesKeys.user(userId), metricName] as const,
};

/**
 * Fetch all personal baselines for a user
 */
export function usePersonalBaselines() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: personalBaselinesKeys.user(user?.id || ''),
    queryFn: async (): Promise<PersonalBaselinesMap> => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('user_metric_baselines')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      if (error) throw error;
      
      // Convert array to map keyed by metric_name
      const map: PersonalBaselinesMap = {};
      data?.forEach(baseline => {
        map[baseline.metric_name.toLowerCase()] = baseline as PersonalBaseline;
      });
      
      return map;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,   // 30 minutes cache
  });
}

/**
 * Fetch personal baselines for another user (for trainers viewing clients)
 */
export function useUserPersonalBaselines(userId: string | undefined) {
  return useQuery({
    queryKey: personalBaselinesKeys.user(userId || ''),
    queryFn: async (): Promise<PersonalBaselinesMap> => {
      if (!userId) throw new Error('User ID required');
      
      const { data, error } = await supabase
        .from('user_metric_baselines')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      if (error) throw error;
      
      const map: PersonalBaselinesMap = {};
      data?.forEach(baseline => {
        map[baseline.metric_name.toLowerCase()] = baseline as PersonalBaseline;
      });
      
      return map;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Calculate and save baselines for a user based on their historical data
 */
export function useCalculateBaselines() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (metricNames?: string[]) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      // Get last 45 days of data from unified_metrics
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 45);
      
      let query = supabase
        .from('unified_metrics')
        .select('metric_name, value, measurement_date')
        .eq('user_id', user.id)
        .gte('measurement_date', cutoffDate.toISOString().split('T')[0])
        .order('measurement_date', { ascending: true });
      
      if (metricNames && metricNames.length > 0) {
        query = query.in('metric_name', metricNames);
      }
      
      const { data: metrics, error: metricsError } = await query;
      if (metricsError) throw metricsError;
      
      if (!metrics || metrics.length === 0) {
        return { calculated: 0 };
      }
      
      // Group by metric_name
      const byMetric: Record<string, number[]> = {};
      const datesByMetric: Record<string, Set<string>> = {};
      
      metrics.forEach(m => {
        const name = m.metric_name;
        if (!byMetric[name]) {
          byMetric[name] = [];
          datesByMetric[name] = new Set();
        }
        byMetric[name].push(Number(m.value));
        datesByMetric[name].add(m.measurement_date);
      });
      
      // Calculate baselines for each metric
      const baselines: Omit<PersonalBaseline, 'id' | 'created_at' | 'updated_at'>[] = [];
      
      for (const [metricName, values] of Object.entries(byMetric)) {
        const daysOfData = datesByMetric[metricName].size;
        
        // Need at least 14 days of data
        if (daysOfData < 14) continue;
        
        const sorted = [...values].sort((a, b) => a - b);
        const n = sorted.length;
        
        // Calculate percentiles
        const p25Index = Math.floor(n * 0.25);
        const p75Index = Math.floor(n * 0.75);
        
        const personal_low = sorted[p25Index];
        const personal_high = sorted[p75Index];
        const personal_average = values.reduce((a, b) => a + b, 0) / n;
        
        // Personal best depends on whether lower is better
        const lowerIsBetter = isLowerBetterMetric(metricName);
        const personal_best = lowerIsBetter ? sorted[0] : sorted[n - 1];
        
        baselines.push({
          user_id: user.id,
          metric_name: metricName,
          personal_best,
          personal_average,
          personal_low,
          personal_high,
          days_of_data: daysOfData,
          calculation_date: new Date().toISOString().split('T')[0],
          is_active: true,
        });
      }
      
      if (baselines.length === 0) {
        return { calculated: 0 };
      }
      
      // Upsert baselines
      const { error: upsertError } = await supabase
        .from('user_metric_baselines')
        .upsert(
          baselines,
          { onConflict: 'user_id,metric_name' }
        );
      
      if (upsertError) throw upsertError;
      
      return { calculated: baselines.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personalBaselinesKeys.all });
    },
  });
}

// Helper to determine if lower values are better for a metric
function isLowerBetterMetric(metricName: string): boolean {
  const name = metricName.toLowerCase();
  return name.includes('fat') || 
         name.includes('weight') || 
         name.includes('resting hr') ||
         name.includes('resting heart') ||
         name.includes('stress');
}

/**
 * Get personalized quality color based on user's baseline
 * Returns null if should fall back to population thresholds
 */
export function getPersonalizedQualityColor(
  metricName: string,
  value: number,
  baseline: PersonalBaseline | undefined
): { color: string; isPersonalized: boolean } | null {
  // Need at least 30 days of data for personalized assessment
  if (!baseline || baseline.days_of_data < 30) {
    return null;
  }
  
  const { personal_best, personal_low, personal_high } = baseline;
  
  if (personal_low === null || personal_high === null || personal_best === null) {
    return null;
  }
  
  const lowerIsBetter = isLowerBetterMetric(metricName);
  
  // Check if at or beyond personal best (super green)
  if (lowerIsBetter) {
    if (value <= personal_best) {
      return { color: '#22c55e', isPersonalized: true }; // Bright green - personal best
    }
  } else {
    if (value >= personal_best) {
      return { color: '#22c55e', isPersonalized: true };
    }
  }
  
  // Within normal range (p25-p75)
  if (value >= personal_low && value <= personal_high) {
    return { color: '#10b981', isPersonalized: true }; // Green - within personal norm
  }
  
  // Calculate deviation from normal range
  const range = personal_high - personal_low;
  
  if (lowerIsBetter) {
    // For metrics where lower is better
    if (value > personal_high) {
      const deviation = (value - personal_high) / range;
      if (deviation > 1) {
        return { color: '#ef4444', isPersonalized: true }; // Red - significantly worse
      }
      return { color: '#eab308', isPersonalized: true }; // Yellow - slightly worse
    }
    // Below p25 is actually good for "lower is better"
    return { color: '#10b981', isPersonalized: true };
  } else {
    // For metrics where higher is better
    if (value < personal_low) {
      const deviation = (personal_low - value) / range;
      if (deviation > 1) {
        return { color: '#ef4444', isPersonalized: true }; // Red - significantly worse
      }
      return { color: '#eab308', isPersonalized: true }; // Yellow - slightly worse
    }
    // Above p75 is actually good for "higher is better"
    return { color: '#10b981', isPersonalized: true };
  }
}

/**
 * Get personalized quality label
 */
export function getPersonalizedQualityLabel(
  metricName: string,
  value: number,
  baseline: PersonalBaseline | undefined
): { icon: string; text: string; color: string; isPersonalized: boolean } | null {
  if (!baseline || baseline.days_of_data < 30) {
    return null;
  }
  
  const { personal_best, personal_low, personal_high, personal_average } = baseline;
  
  if (personal_low === null || personal_high === null || personal_best === null) {
    return null;
  }
  
  const lowerIsBetter = isLowerBetterMetric(metricName);
  
  // At personal best
  const atBest = lowerIsBetter ? value <= personal_best : value >= personal_best;
  if (atBest) {
    return { 
      icon: '🏆', 
      text: i18n.t('health:personalBaseline.personalRecord'), 
      color: '#22c55e',
      isPersonalized: true 
    };
  }
  
  // Better than average
  const betterThanAvg = lowerIsBetter 
    ? (personal_average !== null && value < personal_average)
    : (personal_average !== null && value > personal_average);
  
  // Within normal range
  if (value >= personal_low && value <= personal_high) {
    return { 
      icon: betterThanAvg ? '✅' : '😊', 
      text: betterThanAvg ? i18n.t('health:personalBaseline.aboveAverage') : i18n.t('health:personalBaseline.yourNormal'), 
      color: '#10b981',
      isPersonalized: true 
    };
  }
  
  // Outside normal range
  const range = personal_high - personal_low;
  
  if (lowerIsBetter) {
    if (value > personal_high) {
      const deviation = (value - personal_high) / range;
      if (deviation > 1) {
        return { icon: '🔴', text: i18n.t('health:personalBaseline.belowNormal'), color: '#ef4444', isPersonalized: true };
      }
      return { icon: '⚠️', text: i18n.t('health:personalBaseline.slightlyBelow'), color: '#eab308', isPersonalized: true };
    }
    // Below p25 is good for lower-is-better
    return { icon: '✅', text: i18n.t('health:personalBaseline.betterThanNormal'), color: '#10b981', isPersonalized: true };
  } else {
    if (value < personal_low) {
      const deviation = (personal_low - value) / range;
      if (deviation > 1) {
        return { icon: '🔴', text: i18n.t('health:personalBaseline.belowNormal'), color: '#ef4444', isPersonalized: true };
      }
      return { icon: '⚠️', text: i18n.t('health:personalBaseline.slightlyBelow'), color: '#eab308', isPersonalized: true };
    }
    // Above p75 is good for higher-is-better
    return { icon: '✅', text: i18n.t('health:personalBaseline.betterThanNormal'), color: '#10b981', isPersonalized: true };
  }
}

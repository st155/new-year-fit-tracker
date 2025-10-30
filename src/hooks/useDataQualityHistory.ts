import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';

interface QualityHistoryPoint {
  date: string;
  avgConfidence: number;
}

export function useDataQualityHistory(userId: string | undefined) {
  return useQuery({
    queryKey: ['data-quality-history', userId],
    queryFn: async (): Promise<QualityHistoryPoint[]> => {
      if (!userId) throw new Error('User ID required');

      const sevenDaysAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd');
      const today = format(new Date(), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('unified_metrics')
        .select('measurement_date, confidence_score')
        .eq('user_id', userId)
        .gte('measurement_date', sevenDaysAgo)
        .lte('measurement_date', today);

      if (error) throw error;

      // Group by date and calculate average confidence
      const byDate = new Map<string, number[]>();
      
      data?.forEach(metric => {
        const date = metric.measurement_date;
        if (!byDate.has(date)) {
          byDate.set(date, []);
        }
        if (metric.confidence_score !== null) {
          byDate.get(date)!.push(metric.confidence_score);
        }
      });

      // Build result array for last 7 days
      const result: QualityHistoryPoint[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        const scores = byDate.get(date) || [];
        const avgConfidence = scores.length > 0
          ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
          : 0;
        
        result.push({ date, avgConfidence });
      }

      return result;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
}

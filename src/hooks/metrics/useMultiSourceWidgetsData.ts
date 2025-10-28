import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { widgetKeys, type Widget } from '@/hooks/useWidgetsQuery';
import { getAliasSet } from '@/lib/metric-aliases';

export interface SourceData {
  value: number;
  unit: string;
  measurement_date: string;
  source: string;
  confidence?: number;
  age_hours: number;
}

export interface MultiSourceWidgetData {
  sources: SourceData[];
  primarySource?: string;
}

interface UseMultiSourceWidgetsDataResult {
  data: Map<string, MultiSourceWidgetData>;
  isLoading: boolean;
  error: any;
}

export function useMultiSourceWidgetsData(
  userId: string | undefined,
  widgets: Widget[]
): UseMultiSourceWidgetsDataResult {
  const query = useQuery({
    queryKey: [...widgetKeys.all, 'multi-source-batch', userId, widgets.map(w => w.id)],
    queryFn: async () => {
      if (!userId || widgets.length === 0) return new Map<string, MultiSourceWidgetData>();

      // Build metric name list including aliases
      const metricNamesSet = new Set<string>();
      for (const w of widgets) {
        const aliasSet = getAliasSet(w.metric_name);
        aliasSet.forEach(alias => metricNamesSet.add(alias));
      }
      const metricNames = Array.from(metricNamesSet);

      // Time window: last 7 days for multi-source comparison
      const now = new Date();
      const fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const from = fromDate.toISOString().split('T')[0];

      // Query all metrics from all sources
      const { data, error } = await supabase
        .from('unified_metrics')
        .select('metric_name, source, value, unit, measurement_date, created_at, priority, confidence_score')
        .eq('user_id', userId)
        .in('metric_name', metricNames)
        .gte('measurement_date', from)
        .order('measurement_date', { ascending: false })
        .order('priority', { ascending: true })
        .order('confidence_score', { ascending: false });

      if (error) throw error;
      const rows = data || [];

      // Group by widget -> source -> latest value
      const result = new Map<string, MultiSourceWidgetData>();

      for (const w of widgets) {
        const acceptable = getAliasSet(w.metric_name);
        
        // Group by source
        const sourceMap = new Map<string, any>();
        
        for (const row of rows) {
          if (!acceptable.has(row.metric_name)) continue;
          
          const existing = sourceMap.get(row.source);
          if (!existing) {
            sourceMap.set(row.source, row);
          } else {
            // Keep the newest
            const existingDate = new Date(existing.measurement_date).getTime();
            const rowDate = new Date(row.measurement_date).getTime();
            if (rowDate > existingDate) {
              sourceMap.set(row.source, row);
            }
          }
        }

        // Fallback for Max Heart Rate from daily_health_summary
        if (acceptable.has('Max Heart Rate') && !sourceMap.has('terra')) {
          const today = new Date().toISOString().split('T')[0];
          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          
          const { data: summaryData } = await supabase
            .from('daily_health_summary')
            .select('heart_rate_max, date')
            .eq('user_id', userId)
            .in('date', [today, yesterday])
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (summaryData && summaryData.heart_rate_max) {
            sourceMap.set('terra', {
              value: summaryData.heart_rate_max,
              unit: 'bpm',
              measurement_date: summaryData.date,
              source: 'terra',
              created_at: new Date().toISOString(),
              priority: 50,
            });
          }
        }

        if (sourceMap.size > 0) {
          const sources: SourceData[] = Array.from(sourceMap.values()).map(row => {
            const day = new Date(row.measurement_date);
            const hours = Math.max(0, Math.floor((Date.now() - day.getTime()) / (1000 * 60 * 60)));
            
            return {
              value: Number(row.value),
              unit: row.unit,
              measurement_date: row.measurement_date,
              source: row.source,
              confidence: typeof row.confidence_score === 'number' ? row.confidence_score : undefined,
              age_hours: hours,
            };
          });

          // Sort by priority (if available) and measurement date
          sources.sort((a, b) => {
            const aDate = new Date(a.measurement_date).getTime();
            const bDate = new Date(b.measurement_date).getTime();
            if (aDate !== bDate) return bDate - aDate; // newest first
            return 0;
          });

          const primarySource = sources[0]?.source;

          result.set(w.id, {
            sources,
            primarySource,
          });
        }
      }

      return result;
    },
    enabled: !!userId && widgets.length > 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: 500,
  });

  return {
    data: query.data ?? new Map(),
    isLoading: query.isLoading,
    error: query.error,
  };
}

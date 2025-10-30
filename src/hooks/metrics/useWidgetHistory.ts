import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { widgetKeys, type Widget } from '@/hooks/useWidgetsQuery';
import { getAliasSet } from '@/lib/metric-aliases';

export interface WidgetHistoryData {
  date: string;          // YYYY-MM-DD
  value: number;
}

interface UseWidgetHistoryResult {
  data: Map<string, WidgetHistoryData[]>; // key: widget.id -> last 7 days
  isLoading: boolean;
  error: any;
}

/**
 * Fetches 7-day history for all widgets in a single batch query
 * Returns sparkline data for background charts
 */
export function useWidgetHistory(
  userId: string | undefined, 
  widgets: Widget[]
): UseWidgetHistoryResult {
  const query = useQuery({
    queryKey: [...widgetKeys.all, 'history-batch', userId, widgets.map(w => w.id)],
    queryFn: async () => {
      if (!userId || widgets.length === 0) return new Map();

      // Build metric name list including aliases
      const metricNamesSet = new Set<string>();
      const metricToWidgets = new Map<string, string[]>(); // metric_name -> widget.ids
      
      for (const w of widgets) {
        const aliases = getAliasSet(w.metric_name);
        aliases.forEach(name => {
          metricNamesSet.add(name);
          const widgetIds = metricToWidgets.get(name) || [];
          widgetIds.push(w.id);
          metricToWidgets.set(name, widgetIds);
        });
      }
      const metricNames = Array.from(metricNamesSet);

      // Time window: last 7 days
      const now = new Date();
      const fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const from = fromDate.toISOString().split('T')[0];

      // Single batch query for all widgets
      const { data, error } = await supabase
        .from('unified_metrics')
        .select('metric_name, value, measurement_date, priority, confidence_score')
        .eq('user_id', userId)
        .in('metric_name', metricNames)
        .gte('measurement_date', from)
        .order('measurement_date', { ascending: true })
        .order('priority', { ascending: true })
        .order('confidence_score', { ascending: false });

      if (error) throw error;
      const rows = data || [];

      // 🔍 DEBUG: Log Recovery Score data
      const recoveryRows = rows.filter(r => 
        r.metric_name.toLowerCase().includes('recovery')
      );
      if (recoveryRows.length > 0) {
        console.log('🔍 [useWidgetHistory] Recovery Score data:', {
          rowCount: recoveryRows.length,
          dates: recoveryRows.map(r => r.measurement_date),
          values: recoveryRows.map(r => r.value),
          priorities: recoveryRows.map(r => r.priority)
        });
      }

      // Group by widget.id and date, pick best value per day
      const result = new Map<string, WidgetHistoryData[]>();

      for (const w of widgets) {
        const acceptable = getAliasSet(w.metric_name);
        const dailyBest = new Map<string, any>(); // date -> best row

        for (const row of rows) {
          if (!acceptable.has(row.metric_name)) continue;
          
          const date = row.measurement_date;
          const current = dailyBest.get(date);
          
          // Pick best: lower priority -> higher confidence -> first seen
          if (!current) {
            dailyBest.set(date, row);
          } else {
            const currentPr = current.priority ?? Number.MAX_SAFE_INTEGER;
            const rowPr = row.priority ?? Number.MAX_SAFE_INTEGER;
            
            if (rowPr < currentPr) {
              dailyBest.set(date, row);
            } else if (rowPr === currentPr) {
              const currentConf = current.confidence_score ?? 0;
              const rowConf = row.confidence_score ?? 0;
              if (rowConf > currentConf) {
                dailyBest.set(date, row);
              }
            }
          }
        }

        // Convert to array sorted by date
        const history = Array.from(dailyBest.entries())
          .map(([date, row]) => ({
            date,
            value: Number(row.value),
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        if (history.length > 0) {
          result.set(w.id, history);
        }
      }

      return result;
    },
    enabled: !!userId && widgets.length > 0,
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 10 * 60 * 1000,     // 10 minutes
    retry: 1,
    retryDelay: 500,
  });

  return {
    data: query.data ?? new Map(),
    isLoading: query.isLoading,
    error: query.error,
  };
}

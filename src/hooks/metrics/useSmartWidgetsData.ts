import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { widgetKeys, type Widget } from '@/hooks/useWidgetsQuery';
import { getAliasSet, METRIC_ALIASES } from '@/lib/metric-aliases';

export interface SmartWidgetData {
  value: number;
  unit: string;
  measurement_date: string; // YYYY-MM-DD
  source: string;           // actual selected source
  confidence?: number;      // from client_unified_metrics.confidence_score if available
}

interface UseSmartWidgetsDataResult {
  data: Map<string, SmartWidgetData>; // key: widget.id
  ages: Map<string, number>;          // key: widget.id -> age in hours
  isLoading: boolean;
  error: any;
}

// Compare two metric rows to pick the best one
// Preference: newer measurement_date -> lower priority -> newer created_at
const isBetter = (a: any, b: any) => {
  if (!b) return true;
  const aDate = new Date(a.measurement_date).getTime();
  const bDate = new Date(b.measurement_date).getTime();
  if (aDate !== bDate) return aDate > bDate;
  const aPr = a.priority ?? Number.MAX_SAFE_INTEGER;
  const bPr = b.priority ?? Number.MAX_SAFE_INTEGER;
  if (aPr !== bPr) return aPr < bPr;
  const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
  const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
  return aCreated > bCreated;
};

export function useSmartWidgetsData(userId: string | undefined, widgets: Widget[]): UseSmartWidgetsDataResult {
  const query = useQuery({
    queryKey: [...widgetKeys.all, 'smart-batch', userId, widgets.map(w => w.id)],
    queryFn: async () => {
      if (!userId || widgets.length === 0) return { data: new Map(), ages: new Map() };

      // Build metric name list including aliases
      const metricNamesSet = new Set<string>();
      for (const w of widgets) {
        metricNamesSet.add(w.metric_name);
        const aliases = METRIC_ALIASES[w.metric_name];
        if (aliases) aliases.forEach(a => metricNamesSet.add(a));
      }
      const metricNames = Array.from(metricNamesSet);

      // Time window: last 14 days (expanded for better coverage)
      const now = new Date();
      const fromDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const from = fromDate.toISOString().split('T')[0];

      // Single query: all needed fields, all sources
      const { data, error } = await supabase
        .from('client_unified_metrics')
        .select('metric_name, source, value, unit, measurement_date, created_at, priority, confidence_score')
        .eq('user_id', userId)
        .in('metric_name', metricNames)
        .gte('measurement_date', from)
        .order('measurement_date', { ascending: false })
        .order('created_at', { ascending: false })
        .order('priority', { ascending: true });

      if (error) throw error;
      const rows = data || [];

      // For each widget, pick best row among its metric name and aliases
      const result = new Map<string, SmartWidgetData>();
      const ages = new Map<string, number>();

      // Precompute acceptable names per widget
      const acceptableByWidget = new Map<string, Set<string>>();
      for (const w of widgets) acceptableByWidget.set(w.id, getAliasSet(w.metric_name));

      // Pick best per widget
      for (const w of widgets) {
        const acceptable = acceptableByWidget.get(w.id)!;
        let best: any | null = null;
        for (const row of rows) {
          if (!acceptable.has(row.metric_name)) continue;
          if (isBetter(row, best)) best = row;
        }
        
        // Fallback for Max Heart Rate from daily_health_summary
        if (!best && acceptable.has('Max Heart Rate')) {
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
            best = {
              value: summaryData.heart_rate_max,
              unit: 'bpm',
              measurement_date: summaryData.date,
              source: 'terra',
              created_at: new Date().toISOString(),
              priority: 50,
            };
          }
        }
        
        if (best) {
          result.set(w.id, {
            value: Number(best.value),
            unit: best.unit,
            measurement_date: best.measurement_date,
            source: best.source,
            confidence: typeof best.confidence_score === 'number' ? best.confidence_score : undefined,
          });
          // Age in hours
          const day = new Date(best.measurement_date);
          const hours = Math.max(0, Math.floor((Date.now() - day.getTime()) / (1000 * 60 * 60)));
          ages.set(w.id, hours);
        }
      }

      return { data: result, ages };
    },
    enabled: !!userId && widgets.length > 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: 500,
  });

  // Normalize return shape
  return {
    data: (query.data as any)?.data ?? new Map(),
    ages: (query.data as any)?.ages ?? new Map(),
    isLoading: query.isLoading,
    error: query.error,
  };
}

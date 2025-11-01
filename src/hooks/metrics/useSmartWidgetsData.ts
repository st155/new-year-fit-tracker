import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ConfidenceScorer, ConflictResolver, ResolutionStrategy } from '@/lib/data-quality';
import { widgetKeys, type Widget } from '@/hooks/useWidgetsQuery';
import { getAliasSet, METRIC_ALIASES } from '@/lib/metric-aliases';

export interface SmartWidgetData {
  value: number;
  unit: string;
  measurement_date: string; // YYYY-MM-DD
  source: string;           // actual selected source
  confidence_score?: number; // V2: confidence score from conflict resolution
}

interface UseSmartWidgetsDataResult {
  data: Map<string, SmartWidgetData>; // key: widget.id
  ages: Map<string, number>;          // key: widget.id -> age in hours
  confidenceMap: Map<string, number>; // V2: key: widget.id -> confidence score
  isLoading: boolean;
  error: any;
}

// Helper to select resolution strategy based on metric name
function selectStrategyForMetric(metricName: string): ResolutionStrategy {
  const lower = metricName.toLowerCase();
  
  // WHOOP expert metrics - ALWAYS use source priority
  if (
    lower.includes('recovery') ||
    lower.includes('strain') ||
    lower.includes('sleep') ||
    lower.includes('hrv')
  ) {
    return ResolutionStrategy.HIGHEST_PRIORITY;
  }
  
  // Cardiovascular metrics - WHOOP priority
  if (lower.includes('heart') && !lower.includes('max')) {
    return ResolutionStrategy.HIGHEST_PRIORITY;
  }
  
  // Body composition - InBody/Withings priority
  if (lower.includes('weight') || lower.includes('body_fat') || lower.includes('muscle')) {
    return ResolutionStrategy.HIGHEST_PRIORITY;
  }
  
  // Activity metrics - prefer device priority over averaging
  if (lower.includes('steps') || lower.includes('calories')) {
    return ResolutionStrategy.HIGHEST_PRIORITY;
  }
  
  // Manual entry always wins
  if (lower.includes('manual')) {
    return ResolutionStrategy.MANUAL_OVERRIDE;
  }
  
  // Default: highest priority (favor known devices)
  return ResolutionStrategy.HIGHEST_PRIORITY;
}

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
        .from('unified_metrics')
        .select('id, metric_name, source, value, unit, measurement_date, created_at, priority, confidence_score')
        .eq('user_id', userId)
        .in('metric_name', metricNames)
        .gte('measurement_date', from)
        .order('measurement_date', { ascending: false })
        .order('priority', { ascending: true })
        .order('confidence_score', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows = data || [];

      // V2: For each widget, use conflict resolution to pick best data point
      const result = new Map<string, SmartWidgetData>();
      const ages = new Map<string, number>();
      const confidenceMap = new Map<string, number>();

      // Precompute acceptable names per widget
      const acceptableByWidget = new Map<string, Set<string>>();
      for (const w of widgets) acceptableByWidget.set(w.id, getAliasSet(w.metric_name));

      // Pick best per widget using V2 conflict resolution
      for (const w of widgets) {
        const acceptable = acceptableByWidget.get(w.id)!;
        const candidates = rows.filter(row => acceptable.has(row.metric_name));
        
        if (candidates.length === 0) {
          // Fallback for Max Heart Rate from daily_health_summary
          if (acceptable.has('Max Heart Rate')) {
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
              result.set(w.id, {
                value: summaryData.heart_rate_max,
                unit: 'bpm',
                measurement_date: summaryData.date,
                source: 'terra',
                confidence_score: 100,
              });
              
              const hours = Math.max(0, Math.floor((Date.now() - new Date(summaryData.date).getTime()) / (1000 * 60 * 60)));
              ages.set(w.id, hours);
              confidenceMap.set(w.id, 100);
            }
          }
          continue;
        }

        // V2: Use confidence scoring and conflict resolution
        const metricsWithConfidence = ConfidenceScorer.calculateBatch(
          candidates.map(c => ({
            metric_id: c.id || '',
            user_id: userId,
            metric_name: c.metric_name,
            metric_type: c.metric_name as any,
            value: c.value,
            unit: c.unit,
            source: c.source as any,
            measurement_date: c.measurement_date,
            created_at: c.created_at || new Date().toISOString(),
            priority: c.priority || 5,
          }))
        );

        // If only one candidate, use it directly
        const winner = metricsWithConfidence.length === 1
          ? metricsWithConfidence[0]
          : ConflictResolver.resolve(metricsWithConfidence, {
              strategy: selectStrategyForMetric(w.metric_name),
              minConfidenceThreshold: 30,
            });

        result.set(w.id, {
          value: winner.metric.value,
          unit: winner.metric.unit,
          measurement_date: winner.metric.measurement_date,
          source: winner.metric.source,
          confidence_score: winner.confidence,
        });

        const hours = Math.max(0, Math.floor((Date.now() - new Date(winner.metric.measurement_date).getTime()) / (1000 * 60 * 60)));
        ages.set(w.id, hours);
        confidenceMap.set(w.id, winner.confidence);
      }

      return { data: result, ages, confidenceMap };
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
    confidenceMap: (query.data as any)?.confidenceMap ?? new Map(),
    isLoading: query.isLoading,
    error: query.error,
  };
}

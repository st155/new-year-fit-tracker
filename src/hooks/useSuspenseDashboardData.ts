import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { widgetKeys } from '@/hooks/useWidgetsQuery';

interface DashboardData {
  widgets: any[];
  latestMetrics: Map<string, any>;
}

async function fetchAllDashboardData(userId: string): Promise<DashboardData> {
  // Fetch widgets напрямую из Supabase без типизации
  const { data: widgets } = await supabase
    .from('dashboard_widgets')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true });

  if (!widgets || widgets.length === 0) {
    return { widgets: [], latestMetrics: new Map() };
  }

  // Собираем все уникальные metric_name (с явной типизацией)
  const metricNames = [...new Set(widgets.map((w: any) => w.metric_name as string))] as string[];
  
  // ОДИН SQL запрос для всех метрик
  const { data: metrics } = await supabase
    .from('unified_metrics')
    .select('*')
    .eq('user_id', userId)
    .in('metric_name', metricNames)
    .order('measurement_date', { ascending: false });

  // Группируем метрики по metric_name (берем самую свежую по дате)
  const latestMetrics = new Map<string, any>();
  
  if (metrics) {
    metrics.forEach(metric => {
      const key = metric.metric_name;
      const existing = latestMetrics.get(key);
      
      if (!existing) {
        latestMetrics.set(key, metric);
      } else {
        // Prioritize by date (fresher is better)
        const existingDate = new Date(existing.measurement_date);
        const currentDate = new Date(metric.measurement_date);
        
        if (currentDate > existingDate) {
          latestMetrics.set(key, metric);
        } else if (existingDate.getTime() === currentDate.getTime()) {
          // Same date: use priority as tiebreaker
          if ((metric.priority || 999) < (existing.priority || 999)) {
            latestMetrics.set(key, metric);
          }
        }
      }
    });
  }

  return { widgets, latestMetrics };
}

export function useDashboardData(userId: string | undefined) {
  return useQuery({
    queryKey: [...widgetKeys.all, 'dashboard', userId],
    queryFn: () => fetchAllDashboardData(userId!),
    staleTime: 2 * 60 * 1000, // 2 минуты
    enabled: !!userId,
  });
}

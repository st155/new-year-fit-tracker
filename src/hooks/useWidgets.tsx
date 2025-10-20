import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getFallbackMetrics, convertMetricValue } from '@/lib/metric-mappings';

export interface Widget {
  id: string;
  metric_name: string;
  source: string;
  position: number;
  is_visible: boolean;
}

interface WidgetMetricData {
  value: number | string;
  unit: string;
  date: string;
  trend?: number;
}

const DEFAULT_WIDGETS = [
  { metric_name: 'Recovery Score', source: 'whoop' },
  { metric_name: 'Day Strain', source: 'whoop' },
  { metric_name: 'Sleep Duration', source: 'whoop' },
  { metric_name: 'Steps', source: 'garmin' },
  { metric_name: 'Training Readiness', source: 'garmin' },
  { metric_name: 'Sleep Efficiency', source: 'garmin' },
  { metric_name: 'HRV RMSSD', source: 'ultrahuman' },
  { metric_name: 'VO2Max', source: 'garmin' },
  { metric_name: 'Weight', source: 'withings' },
  { metric_name: 'Body Fat Percentage', source: 'withings' },
  { metric_name: 'Max Heart Rate', source: 'garmin' },
  { metric_name: 'Resting Heart Rate', source: 'whoop' },
];

export const useWidgets = (userId: string | undefined) => {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      fetchWidgets();
    }
  }, [userId]);

  const fetchWidgets = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('user_id', userId)
        .eq('is_visible', true)
        .order('position');

      if (error) throw error;

      // If no widgets, create default ones
      if (!data || data.length === 0) {
        await initializeDefaultWidgets();
        return;
      }

      setWidgets(data as Widget[]);
    } catch (error) {
      console.error('Error fetching widgets:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить виджеты',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultWidgets = async () => {
    if (!userId) return;

    try {
      const widgetsToCreate = DEFAULT_WIDGETS.map((w, index) => ({
        user_id: userId,
        metric_name: w.metric_name,
        source: w.source,
        position: index,
        is_visible: true,
      }));

      const { data, error } = await supabase
        .from('dashboard_widgets')
        .insert(widgetsToCreate)
        .select();

      if (error) throw error;

      setWidgets(data as Widget[]);
    } catch (error) {
      console.error('Error initializing default widgets:', error);
    }
  };

  const addWidget = async (metricName: string, source: string) => {
    if (!userId) return;

    try {
      const maxPosition = Math.max(...widgets.map(w => w.position), -1);

      const { data, error } = await supabase
        .from('dashboard_widgets')
        .insert({
          user_id: userId,
          metric_name: metricName,
          source: source,
          position: maxPosition + 1,
          is_visible: true,
        })
        .select()
        .single();

      if (error) throw error;

      setWidgets([...widgets, data as Widget]);
      toast({
        title: 'Виджет добавлен',
        description: `${metricName} (${source})`,
      });
    } catch (error) {
      console.error('Error adding widget:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось добавить виджет',
        variant: 'destructive',
      });
    }
  };

  const removeWidget = async (widgetId: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('dashboard_widgets')
        .delete()
        .eq('id', widgetId);

      if (error) throw error;

      setWidgets(widgets.filter(w => w.id !== widgetId));
      toast({
        title: 'Виджет удален',
      });
    } catch (error) {
      console.error('Error removing widget:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить виджет',
        variant: 'destructive',
      });
    }
  };

  const reorderWidgets = async (newOrder: Widget[]) => {
    if (!userId) return;

    try {
      const updates = newOrder.map((w, index) => ({
        id: w.id,
        position: index,
      }));

      for (const update of updates) {
        await supabase
          .from('dashboard_widgets')
          .update({ position: update.position })
          .eq('id', update.id);
      }

      setWidgets(newOrder);
    } catch (error) {
      console.error('Error reordering widgets:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить порядок',
        variant: 'destructive',
      });
    }
  };

  return {
    widgets,
    loading,
    addWidget,
    removeWidget,
    reorderWidgets,
    refetch: fetchWidgets,
  };
};

export const fetchWidgetData = async (
  userId: string,
  metricName: string,
  source: string
): Promise<WidgetMetricData | null> => {
  try {
    // Use local dates to match timezone-aware backend
    const now = new Date();
    const todayLocal = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    const todayStr = todayLocal.toISOString().split('T')[0];
    
    const sevenDaysAgoLocal = new Date(todayLocal.getTime() - 7 * 86400000);
    const sevenDaysAgo = sevenDaysAgoLocal.toISOString().split('T')[0];

    // JOIN запрос - получаем свежие данные независимо от unit или user_metrics.id
    const { data: latestRows, error: latestError } = await supabase
      .from('metric_values')
      .select('value, measurement_date, created_at, user_metrics!inner(metric_name, unit, source)')
      .eq('user_id', userId)
      .eq('user_metrics.metric_name', metricName)
      .eq('user_metrics.source', source.toLowerCase())
      .gte('measurement_date', sevenDaysAgo)
      .lte('measurement_date', todayStr)
      .order('measurement_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20);

    if (latestError) {
      console.error('Error fetching latest metric:', latestError);
      return null;
    }

    let latest: any = null;
    let actualMetricName = metricName;
    let needsConversion = false;
    let unit = '';

    // Для Steps - берем максимум за сегодня
    const isSteps = metricName.toLowerCase().includes('step');
    if (isSteps && latestRows && latestRows.length > 0) {
      const todaySteps = latestRows.filter(r => r.measurement_date === todayStr);
      if (todaySteps.length > 0) {
        latest = todaySteps.reduce((max, r) => r.value > max.value ? r : max, todaySteps[0]);
      } else {
        latest = latestRows[0]; // последний доступный день
      }
      unit = (latest.user_metrics as any).unit || 'steps';
    }
    // Для Workout Strain - берем MAX за сегодня (может быть несколько тренировок)
    else if (metricName === 'Workout Strain' && latestRows && latestRows.length > 0) {
      const todayWorkouts = latestRows.filter(r => r.measurement_date === todayStr);
      if (todayWorkouts.length > 0) {
        latest = todayWorkouts.reduce((max, r) => r.value > max.value ? r : max, todayWorkouts[0]);
      } else {
        latest = latestRows[0];
      }
      unit = (latest.user_metrics as any).unit || 'score';
    }
    // Для Max Heart Rate - берем MAX за сегодня
    else if (metricName === 'Max Heart Rate' && latestRows && latestRows.length > 0) {
      const todayHR = latestRows.filter(r => r.measurement_date === todayStr);
      if (todayHR.length > 0) {
        latest = todayHR.reduce((max, r) => r.value > max.value ? r : max, todayHR[0]);
      } else {
        latest = latestRows[0];
      }
      unit = (latest.user_metrics as any).unit || 'bpm';
    }
    else if (latestRows && latestRows.length > 0) {
      // Для Day Strain и Workout Strain - приоритет сегодняшней дате
      const isDayStrain = metricName === 'Day Strain';
      const isWorkoutStrain = metricName === 'Workout Strain';
      
      if ((isDayStrain || isWorkoutStrain) && source.toLowerCase() === 'whoop') {
        const todayRow = latestRows.find(r => r.measurement_date === todayStr);
        latest = todayRow ?? latestRows[0];
      } else {
        latest = latestRows[0];
      }
      unit = (latest.user_metrics as any).unit || '';
    }

    // Если не нашли, пробуем fallback метрики
    if (!latest) {
      const fallbackMetrics = getFallbackMetrics(metricName, source);
      
      for (const fallback of fallbackMetrics) {
        const { data: fallbackRows } = await supabase
          .from('metric_values')
          .select('value, measurement_date, created_at, user_metrics!inner(metric_name, unit, source)')
          .eq('user_id', userId)
          .eq('user_metrics.metric_name', fallback)
          .eq('user_metrics.source', source.toLowerCase())
          .gte('measurement_date', sevenDaysAgo)
          .lte('measurement_date', todayStr)
          .order('measurement_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (fallbackRows && fallbackRows.length > 0) {
          latest = fallbackRows[0];
          actualMetricName = fallback;
          needsConversion = true;
          unit = (latest.user_metrics as any).unit || '';
          break;
        }
      }
    }

    if (!latest) return null;

    // Логирование для диагностики
    console.log(`[Widget] ${metricName} (${source}):`, {
      date: latest.measurement_date,
      value: latest.value,
      unit,
      actualMetricName,
      needsConversion
    });

    // Проверяем на дубликаты за одну дату
    const { data: duplicatesCheck } = await supabase
      .from('metric_values')
      .select('id, value, created_at, user_metrics!inner(metric_name, source)')
      .eq('user_id', userId)
      .eq('user_metrics.source', source.toLowerCase())
      .eq('user_metrics.metric_name', actualMetricName)
      .eq('measurement_date', latest.measurement_date);
    
    if (duplicatesCheck && duplicatesCheck.length > 1) {
      console.warn(`⚠️ Multiple ${metricName} values found for ${latest.measurement_date}:`, 
        duplicatesCheck.map(d => ({ value: d.value, created_at: d.created_at }))
      );
    }

    console.log(`📊 Fetched widget data for ${metricName}:`, {
      date: latest.measurement_date,
      value: latest.value,
      unit: latest.user_metrics.unit,
      actualMetricName: latest.user_metrics.metric_name,
      wasConverted: needsConversion ? 'yes' : 'no',
      duplicatesFound: duplicatesCheck?.length || 0
    });

    // Для тренда - берем предыдущий день (с учетом локального времени)
    const latestDate = latest.measurement_date;
    const latestDateObj = new Date(latestDate + 'T00:00:00');
    const previousDateObj = new Date(latestDateObj.getTime() - 86400000);
    const previousDate = previousDateObj.toISOString().split('T')[0];

    const { data: previousRows } = await supabase
      .from('metric_values')
      .select('value, measurement_date, created_at, user_metrics!inner(metric_name, unit, source)')
      .eq('user_id', userId)
      .eq('user_metrics.metric_name', actualMetricName)
      .eq('user_metrics.source', source.toLowerCase())
      .eq('measurement_date', previousDate)
      .order('created_at', { ascending: false })
      .limit(1);

    const previous = previousRows && previousRows.length > 0 ? previousRows[0] : null;

    let trend: number | undefined;
    if (previous && previous.value > 0) {
      trend = ((latest.value - previous.value) / previous.value) * 100;
    }

    // Применяем конверсию если используется fallback метрика
    const finalValue = needsConversion 
      ? convertMetricValue(latest.value, actualMetricName, metricName, source)
      : latest.value;

    return {
      value: finalValue,
      unit: needsConversion ? '%' : unit,
      date: latest.measurement_date,
      trend,
    };
  } catch (error) {
    console.error('Error fetching widget data:', error);
    return null;
  }
};

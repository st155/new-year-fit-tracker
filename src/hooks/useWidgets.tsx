import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getFallbackMetrics, convertMetricValue, METRIC_ALIASES } from '@/lib/metric-mappings';

// Утилита для генерации вариантов написания источника (case-insensitive)
const sourceVariants = (src: string): string[] => {
  const lower = (src || '').toLowerCase();
  const cap = lower.charAt(0).toUpperCase() + lower.slice(1);
  const upper = lower.toUpperCase();
  return Array.from(new Set([lower, cap, upper]));
};

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
  console.log('🔍 [fetchWidgetData] Starting fetch:', { userId, metricName, source });
  
  // 🧹 Очистка кэшей
  const cacheKeys = [
    `widgets_${userId}`,
    `widget_${metricName}_${source}_${userId}`,
    `metric_${metricName}`,
    `latest_metrics_${userId}`,
  ];
  
  cacheKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log('🧹 Cleared cache:', key);
  });

  try {
    const fallbackMetrics = getFallbackMetrics(metricName, source);
    const metricVariants = [metricName, ...fallbackMetrics];
    
    // Учитываем алиасы
    const aliasEntry = METRIC_ALIASES[metricName];
    if (aliasEntry?.unifiedName && !metricVariants.includes(aliasEntry.unifiedName)) {
      metricVariants.push(aliasEntry.unifiedName);
    }
    
    console.log('📋 [fetchWidgetData] Metric variants:', metricVariants);

    // ==================== ШАГ 1: Найти metric_id ====================
    console.log('🔎 [STEP 1] Querying user_metrics...');
    
    const { data: userMetrics, error: metricsError } = await supabase
      .from('user_metrics')
      .select('id, metric_name, unit, source')
      .eq('user_id', userId)
      .ilike('source', source) // case-insensitive
      .in('metric_name', metricVariants)
      .order('created_at', { ascending: false });

    if (metricsError) {
      console.error('❌ [STEP 1] Error querying user_metrics:', metricsError);
      return null;
    }

    if (!userMetrics || userMetrics.length === 0) {
      console.warn('⚠️ [STEP 1] No user_metrics found for:', { metricVariants, source });
      return null;
    }

    const metricIds = userMetrics.map(m => m.id);
    const unit = userMetrics[0].unit;
    
    console.log('✅ [STEP 1] Found metric_ids:', metricIds);
    console.log('📊 [STEP 1] Using unit:', unit);

    // ==================== ШАГ 2: Найти последние данные ====================
    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    console.log('🔎 [STEP 2] Querying metric_values (last 7 days)...', { 
      from: sevenDaysAgoStr, 
      to: todayStr,
      todayStr 
    });

    const { data: metricValues, error: valuesError } = await supabase
      .from('metric_values')
      .select('*')
      .in('metric_id', metricIds)
      .gte('measurement_date', sevenDaysAgoStr)
      .lte('measurement_date', todayStr)
      .order('measurement_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100);

    if (valuesError) {
      console.error('❌ [STEP 2] Error querying metric_values:', valuesError);
      return null;
    }

    let candidateData = metricValues || [];
    console.log(`📊 [STEP 2] Found ${candidateData.length} records in last 7 days`);
    
    const todayRecords = candidateData.filter(r => r.measurement_date === todayStr);
    console.log(`📅 Today (${todayStr}): ${todayRecords.length} records`);

    // Fallback: если нет данных за 7 дней - запросить без ограничений
    if (candidateData.length === 0) {
      console.log('⚠️ [STEP 2] No data in 7 days, trying fallback query...');
      
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('metric_values')
        .select('*')
        .in('metric_id', metricIds)
        .order('measurement_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);

      if (fallbackError) {
        console.error('❌ [FALLBACK] Error:', fallbackError);
        return null;
      }

      candidateData = fallbackData || [];
      console.log(`📊 [FALLBACK] Found ${candidateData.length} records total`);
    }

    if (candidateData.length === 0) {
      console.warn('⚠️ No metric_values found at all');
      return null;
    }

    // Показать топ-3 кандидата для диагностики
    console.log('🔝 Top 3 candidates:', candidateData.slice(0, 3).map(r => ({
      date: r.measurement_date,
      value: r.value,
      created: r.created_at
    })));

    // ==================== ШАГ 3: Применить правила выбора ====================
    let selectedRow: any = null;

    if (metricName === 'Steps') {
      // Steps: максимум за сегодня, иначе последний день
      const todaySteps = candidateData.filter(r => r.measurement_date === todayStr);
      if (todaySteps.length > 0) {
        selectedRow = todaySteps.reduce((max, curr) => 
          curr.value > max.value ? curr : max
        );
        console.log('🚶 [Steps] Selected max for today:', selectedRow.value);
      } else {
        const lastDate = candidateData[0].measurement_date;
        const lastDaySteps = candidateData.filter(r => r.measurement_date === lastDate);
        selectedRow = lastDaySteps.reduce((max, curr) => 
          curr.value > max.value ? curr : max
        );
        console.log('🚶 [Steps] Selected max for last day:', { date: lastDate, value: selectedRow.value });
      }
    } else if (metricName === 'Workout Strain' || metricName === 'Day Strain') {
      // Strain: максимум за сегодня, иначе максимум за последний день с данными
      const todayStrain = candidateData.filter(r => r.measurement_date === todayStr);
      if (todayStrain.length > 0) {
        selectedRow = todayStrain.reduce((max, curr) => 
          curr.value > max.value ? curr : max
        );
        console.log(`💪 [${metricName}] Selected max for today:`, selectedRow.value);
      } else {
        const lastDate = candidateData[0].measurement_date;
        const lastDayStrain = candidateData.filter(r => r.measurement_date === lastDate);
        selectedRow = lastDayStrain.reduce((max, curr) => 
          curr.value > max.value ? curr : max
        );
        console.log(`💪 [${metricName}] Selected max for last day:`, { date: lastDate, value: selectedRow.value });
      }
    } else if (metricName === 'Max Heart Rate' || metricName === 'Max HR') {
      // Max HR: максимум за сегодня, иначе максимум за последний день
      const todayHR = candidateData.filter(r => r.measurement_date === todayStr);
      if (todayHR.length > 0) {
        selectedRow = todayHR.reduce((max, curr) => 
          curr.value > max.value ? curr : max
        );
        console.log('❤️ [Max HR] Selected max for today:', selectedRow.value);
      } else {
        const lastDate = candidateData[0].measurement_date;
        const lastDayHR = candidateData.filter(r => r.measurement_date === lastDate);
        selectedRow = lastDayHR.reduce((max, curr) => 
          curr.value > max.value ? curr : max
        );
        console.log('❤️ [Max HR] Selected max for last day:', { date: lastDate, value: selectedRow.value });
      }
    } else {
      // Все остальные метрики: просто последняя запись
      selectedRow = candidateData[0];
      console.log('📈 [Default] Selected latest record:', { 
        date: selectedRow.measurement_date, 
        value: selectedRow.value 
      });
    }

    if (!selectedRow) {
      console.warn('⚠️ No row selected after applying rules');
      return null;
    }

    console.log('✅ [FINAL] Selected row:', {
      date: selectedRow.measurement_date,
      value: selectedRow.value,
      unit,
      created: selectedRow.created_at
    });

    // ==================== ШАГ 4: Рассчитать тренд ====================
    const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const { data: previousData } = await supabase
      .from('metric_values')
      .select('value')
      .in('metric_id', metricIds)
      .eq('measurement_date', yesterdayStr)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let trend: number | undefined = undefined;
    if (previousData?.value) {
      trend = selectedRow.value - previousData.value;
      console.log('📊 Trend calculated:', { current: selectedRow.value, previous: previousData.value, trend });
    }

    // ==================== ШАГ 5: Применить конверсию если нужно ====================
    let finalValue = selectedRow.value;
    
    // Проверяем, нужна ли конверсия через fallback
    const usedMetricName = userMetrics.find(m => m.id === selectedRow.metric_id)?.metric_name || metricName;
    if (usedMetricName !== metricName) {
      finalValue = convertMetricValue(selectedRow.value, usedMetricName, metricName, source);
      console.log('🔄 Applied converter:', { original: selectedRow.value, converted: finalValue });
    }

    return {
      value: finalValue,
      unit,
      date: selectedRow.measurement_date,
      trend
    };

  } catch (error) {
    console.error('❌ [fetchWidgetData] Unexpected error:', error);
    return null;
  }
};

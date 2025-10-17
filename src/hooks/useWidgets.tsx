import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  { metric_name: 'Steps', source: 'ultrahuman' },
  { metric_name: 'Steps', source: 'garmin' },
  { metric_name: 'Day Strain', source: 'whoop' },
  { metric_name: 'Recovery Score', source: 'whoop' },
  { metric_name: 'Weight', source: 'withings' },
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
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    // Сначала получаем metric_id для конкретной метрики и источника
    const { data: metricData } = await supabase
      .from('user_metrics')
      .select('id, unit')
      .eq('user_id', userId)
      .eq('metric_name', metricName)
      .eq('source', source.toLowerCase())
      .limit(1)
      .single();

    if (!metricData) return null;

    // Fetch latest value from last 30 days
    const { data, error } = await supabase
      .from('metric_values')
      .select('value, measurement_date, created_at')
      .eq('user_id', userId)
      .eq('metric_id', metricData.id)
      .gte('measurement_date', thirtyDaysAgo)
      .lte('measurement_date', today)
      .order('measurement_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(2);

    if (error) throw error;
    if (!data || data.length === 0) return null;

    const latest = data[0];
    const previous = data[1];

    let trend: number | undefined;
    if (previous) {
      trend = ((latest.value - previous.value) / previous.value) * 100;
    }

    return {
      value: latest.value,
      unit: metricData.unit,
      date: latest.measurement_date,
      trend,
    };
  } catch (error) {
    console.error('Error fetching widget data:', error);
    return null;
  }
};

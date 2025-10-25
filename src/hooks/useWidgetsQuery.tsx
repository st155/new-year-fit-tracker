import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Widget } from './useWidgets';
import { fetchWidgetData } from './useWidgets';

// Structured query keys for React Query
export const widgetKeys = {
  all: ['widgets'] as const,
  lists: () => [...widgetKeys.all, 'list'] as const,
  list: (userId: string) => [...widgetKeys.lists(), userId] as const,
  data: (userId: string, metricName: string, source: string) => 
    [...widgetKeys.list(userId), 'data', metricName, source] as const,
};

const DEFAULT_WIDGETS = [
  { metric_name: 'Recovery Score', source: 'whoop' },
  { metric_name: 'Day Strain', source: 'whoop' },
  { metric_name: 'Sleep Duration', source: 'whoop' },
  { metric_name: 'Steps', source: 'garmin' },
  { metric_name: 'Steps', source: 'ultrahuman' },
  { metric_name: 'Training Readiness', source: 'garmin' },
  { metric_name: 'Sleep Efficiency', source: 'garmin' },
  { metric_name: 'HRV RMSSD', source: 'ultrahuman' },
  { metric_name: 'VO2Max', source: 'garmin' },
  { metric_name: 'Weight', source: 'withings' },
  { metric_name: 'Body Fat Percentage', source: 'withings' },
  { metric_name: 'Max Heart Rate', source: 'garmin' },
  { metric_name: 'Resting Heart Rate', source: 'whoop' },
];

/**
 * Hook for fetching user's dashboard widgets
 */
export function useWidgetsQuery(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: widgetKeys.list(userId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('user_id', userId!)
        .eq('is_visible', true)
        .order('position');

      if (error) throw error;

      // If no widgets exist, create defaults
      if (!data || data.length === 0) {
        const widgetsToCreate = DEFAULT_WIDGETS.map((w, index) => ({
          user_id: userId!,
          metric_name: w.metric_name,
          source: w.source,
          position: index,
          is_visible: true,
        }));

        const { data: newWidgets, error: insertError } = await supabase
          .from('dashboard_widgets')
          .insert(widgetsToCreate)
          .select();

        if (insertError) throw insertError;
        return newWidgets as Widget[];
      }

      return data as Widget[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes - widgets config rarely changes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for fetching data for a specific widget
 */
export function useWidgetDataQuery(
  userId: string | undefined,
  metricName: string,
  source: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: widgetKeys.data(userId!, metricName, source),
    queryFn: () => fetchWidgetData(userId!, metricName, source),
    enabled: !!userId && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes for metric data
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

/**
 * Mutation for adding a new widget
 */
export function useAddWidgetMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      metricName, 
      source, 
      position 
    }: { 
      userId: string; 
      metricName: string; 
      source: string; 
      position: number 
    }) => {
      const { data, error } = await supabase
        .from('dashboard_widgets')
        .insert({
          user_id: userId,
          metric_name: metricName,
          source: source,
          position: position,
          is_visible: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: widgetKeys.list(variables.userId) });
      toast({
        title: 'Виджет добавлен',
        description: `${variables.metricName} (${variables.source})`,
      });
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось добавить виджет',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Mutation for removing a widget
 */
export function useRemoveWidgetMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, widgetId }: { userId: string; widgetId: string }) => {
      const { error } = await supabase
        .from('dashboard_widgets')
        .delete()
        .eq('id', widgetId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: widgetKeys.list(variables.userId) });
      toast({
        title: 'Виджет удален',
      });
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить виджет',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Mutation for reordering widgets
 */
export function useReorderWidgetsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, widgets }: { userId: string; widgets: Widget[] }) => {
      const updates = widgets.map((widget, index) => 
        supabase
          .from('dashboard_widgets')
          .update({ position: index })
          .eq('id', widget.id)
      );

      await Promise.all(updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: widgetKeys.list(variables.userId) });
    },
  });
}

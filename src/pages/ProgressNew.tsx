import { useAuth } from '@/hooks/useAuth';
import { 
  useWidgetsQuery, 
  useAddWidgetMutation, 
  useRemoveWidgetMutation, 
  useReorderWidgetsMutation,
  widgetKeys 
} from '@/hooks/useWidgetsQuery';
// import { useWidgetsBatch } from '@/hooks/useWidgetsBatch';
import { useSmartWidgetsData } from '@/hooks/metrics/useSmartWidgetsData';
import { useMetricsRealtime } from '@/hooks/metrics/useMetricsRealtime';
import { useQueryClient } from '@tanstack/react-query';
import { WidgetCard } from '@/components/dashboard/WidgetCard';
import { WidgetSettings } from '@/components/dashboard/WidgetSettings';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { WidgetErrorBoundary } from '@/components/error/WidgetErrorBoundary';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useMemo } from 'react';

export default function ProgressNew() {
  const { user } = useAuth();
  const { data: widgets = [], isLoading: widgetsLoading } = useWidgetsQuery(user?.id);
  
  // ✅ Smart auto-source batch для всех метрик виджетов
  const { data: smartData, isLoading: metricsLoading } = useSmartWidgetsData(
    user?.id,
    widgets
  );
  
  const loading = widgetsLoading || metricsLoading;
  
  const addWidgetMutation = useAddWidgetMutation();
  const removeWidgetMutation = useRemoveWidgetMutation();
  const reorderWidgetsMutation = useReorderWidgetsMutation();
  const queryClient = useQueryClient();
  
  // Real-time subscription for metrics updates
  useMetricsRealtime(!!user?.id);

  const addWidget = (metricName: string) => {
    if (!user?.id) return;
    addWidgetMutation.mutate({ userId: user.id, metricName });
  };

  const removeWidget = (widgetId: string) => {
    if (!user?.id) return;
    removeWidgetMutation.mutate({ userId: user.id, widgetId });
  };

  const reorderWidgets = (newOrder: any[]) => {
    if (!user?.id) return;
    reorderWidgetsMutation.mutate({ userId: user.id, widgets: newOrder });
  };

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: widgetKeys.all });
    queryClient.invalidateQueries({ queryKey: ['metrics'] });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Прогресс</h1>
            <p className="text-muted-foreground mt-1">
              Настройте виджеты для отслеживания прогресса
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Обновить
            </Button>
            <WidgetSettings
              widgets={widgets}
              onAdd={addWidget}
              onRemove={removeWidget}
              onReorder={reorderWidgets}
            />
          </div>
        </div>

        {/* Widgets Grid */}
        {widgets.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <p className="text-muted-foreground mb-4">
              Нет виджетов. Добавьте их через настройки.
            </p>
            <WidgetSettings
              widgets={widgets}
              onAdd={addWidget}
              onRemove={removeWidget}
              onReorder={reorderWidgets}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {widgets.map((widget) => (
              <WidgetErrorBoundary key={widget.id} widgetName={widget.metric_name}>
                <WidgetCard
                  widget={widget}
                  data={smartData?.get(widget.id)}
                />
              </WidgetErrorBoundary>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

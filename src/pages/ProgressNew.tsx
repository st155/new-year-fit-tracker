import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
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
import { RefreshCw, BarChart3 } from 'lucide-react';
import { WidgetErrorBoundary } from '@/components/error/WidgetErrorBoundary';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animations-v3';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/page-loader';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function ProgressNew() {
  const { t } = useTranslation('progress');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: widgets = [], isLoading: widgetsLoading } = useWidgetsQuery(user?.id);
  
  // ✅ Smart auto-source batch для всех метрик виджетов
  const { data: smartData, isLoading: metricsLoading } = useSmartWidgetsData(
    user?.id,
    widgets
  );
  
  const loading = widgetsLoading || metricsLoading;
  const [showLoader, setShowLoader] = useState(true);
  
  const addWidgetMutation = useAddWidgetMutation();
  const removeWidgetMutation = useRemoveWidgetMutation();
  const reorderWidgetsMutation = useReorderWidgetsMutation();
  const queryClient = useQueryClient();
  
  // Real-time subscription for metrics updates
  useMetricsRealtime(!!user?.id);

  // Show loader for max 2.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoader(false);
      if (loading) {
        toast.info(t('dataLoadingSlow'), {
          action: {
            label: t('refresh'),
            onClick: () => window.location.reload()
          }
        });
      }
    }, 2500);

    if (!loading) {
      setShowLoader(false);
    }

    return () => clearTimeout(timer);
  }, [loading, t]);

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
    toast.success(t('dataUpdated'));
  };

  if (loading && showLoader) {
    return <PageLoader message={t('loading.widgets')} />;
  }

  // Empty state after loading
  if (!loading && widgets.length === 0) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
              <p className="text-muted-foreground mt-1">
                {t('description')}
              </p>
            </div>
          </div>
          
          <EmptyState
            icon={BarChart3}
            title={t('empty.title')}
            description={t('empty.description')}
            action={{
              label: t('empty.toChallenges'),
              onClick: () => navigate("/challenges")
            }}
          />
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
            <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('description')}
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
              {t('refresh')}
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
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
            {widgets.map((widget) => (
              <motion.div key={widget.id} variants={staggerItem}>
                <WidgetErrorBoundary widgetName={widget.metric_name}>
                  <WidgetCard
                    widget={widget}
                    data={smartData?.get(widget.id)}
                  />
                </WidgetErrorBoundary>
              </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

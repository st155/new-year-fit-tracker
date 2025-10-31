import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  useWidgetsQuery, 
  useAddWidgetMutation, 
  useRemoveWidgetMutation, 
  useReorderWidgetsMutation,
  widgetKeys,
  type Widget 
} from '@/hooks/useWidgetsQuery';
// import { useWidgetsBatch } from '@/hooks/useWidgetsBatch';
import { useSmartWidgetsData } from '@/hooks/metrics/useSmartWidgetsData';
import { useMultiSourceWidgetsData } from '@/hooks/metrics/useMultiSourceWidgetsData';
import { useWidgetHistory } from '@/hooks/metrics/useWidgetHistory';
import { WidgetCard } from '@/components/dashboard/WidgetCard';
import { WidgetSettings } from '@/components/dashboard/WidgetSettings';
import { Leaderboard } from '@/components/dashboard/leaderboard';
import { HabitsSection } from '@/components/dashboard/HabitsSection';
import { QuickActionsPanel } from '@/components/dashboard/QuickActionsPanel';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DataQualityWidget } from '@/components/dashboard/DataQualityWidget';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plug } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TrainerIndexPage from './TrainerIndexPage';
import { useQueryClient } from '@tanstack/react-query';
import { useAutoSync } from '@/hooks/useAutoSync';
import { useMetricsRealtime } from '@/hooks/metrics/useMetricsRealtime';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { WidgetErrorBoundary } from '@/components/error/WidgetErrorBoundary';
import { EnhancedAIInsights } from '@/components/dashboard/EnhancedAIInsights';
import { CompactDataQualityLine } from '@/components/dashboard/CompactDataQualityLine';

const Index = () => {
  const { user, isTrainer, role, loading: authLoading, rolesLoading } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  console.log('🏠 [Index] Render state:', { 
    userId: user?.id, 
    isTrainer, 
    role, 
    authLoading,
    rolesLoading
  });
  
  // Use React Query hooks
  const { data: widgets = [], isLoading: widgetsLoading } = useWidgetsQuery(user?.id);
  
  console.log('📊 [Index] Widgets state:', { 
    widgetsCount: widgets.length, 
    widgetsLoading 
  });
  
  // Separate widgets by display mode
  const singleWidgets = useMemo(() => 
    widgets.filter(w => w.display_mode !== 'multi'), 
    [widgets]
  );
  const multiWidgets = useMemo(() => 
    widgets.filter(w => w.display_mode === 'multi'), 
    [widgets]
  );
  
  // ✅ Smart auto-source batch for single-mode widgets
  const { data: smartData, ages, isLoading: singleMetricsLoading } = useSmartWidgetsData(
    user?.id,
    singleWidgets
  );
  
  // ✅ Multi-source batch for multi-mode widgets
  const { data: multiData, isLoading: multiMetricsLoading } = useMultiSourceWidgetsData(
    user?.id,
    multiWidgets
  );
  
  console.log('📈 [Index] Metrics state:', { 
    singleDataSize: smartData?.size,
    multiDataSize: multiData?.size, 
    singleMetricsLoading,
    multiMetricsLoading
  });
  
  const loading = widgetsLoading || singleMetricsLoading || multiMetricsLoading;
  
  const addWidgetMutation = useAddWidgetMutation();
  const removeWidgetMutation = useRemoveWidgetMutation();
  const reorderWidgetsMutation = useReorderWidgetsMutation();
  
  // Auto-sync for fresh data
  const { syncAllData, isSyncing } = useAutoSync(user?.id);
  
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

  const reorderWidgets = (newOrder: Widget[]) => {
    if (!user?.id) return;
    reorderWidgetsMutation.mutate({ userId: user.id, widgets: newOrder });
  };
  

  const handleRefresh = async () => {
    console.log('🔄 Manual refresh triggered - syncing all sources');
    await syncAllData(); // Trigger real sync
    queryClient.invalidateQueries({ queryKey: widgetKeys.all });
    queryClient.invalidateQueries({ queryKey: ['metrics'] });
  };
  
  // Sort widgets by position
  const processedWidgets = useMemo(() => {
    return [...widgets].sort((a, b) => a.position - b.position);
  }, [widgets]);
  
  // ✅ 7-day history for sparkline charts (after processedWidgets is defined)
  const { data: widgetHistory, isLoading: historyLoading } = useWidgetHistory(
    user?.id,
    processedWidgets
  );

  // Wait for auth to load first
  if (authLoading || rolesLoading) {
    console.log('⏳ [Index] Waiting for auth/roles...');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    console.log('⏳ [Index] Waiting for widgets/metrics...');
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

  // If trainer - show AI-centric interface
  if (isTrainer) {
    console.log('👨‍🏫 [Index] Redirecting to trainer dashboard...');
    return <TrainerIndexPage />;
  }
  
  console.log('✅ [Index] Rendering client dashboard with', processedWidgets.length, 'widgets');

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-3 md:space-y-4">
        {/* Compact Dashboard Header with AI Insights + Quality */}
        <DashboardHeader />
        
        {/* Controls Bar - Compact */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Left: Title */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Мои метрики</h1>
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Refresh Button - Icon only */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isSyncing}
              title="Обновить данные"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </Button>
            
            {/* Widget Settings */}
            <WidgetSettings
              widgets={widgets}
              onAdd={addWidget}
              onRemove={removeWidget}
              onReorder={reorderWidgets}
            />
            
            {/* Integrations Button */}
            <Button
              variant="outline"
              size="default"
              onClick={() => navigate('/fitness-data?tab=connections')}
              className="gap-2"
            >
              <Plug className="h-4 w-4" />
              <span>Интеграции</span>
            </Button>
          </div>
        </div>

        {/* Enhanced AI Insights */}
        <ErrorBoundary>
          <EnhancedAIInsights userId={user?.id} />
        </ErrorBoundary>

        {/* Enhanced Data Quality */}
        <ErrorBoundary>
          <CompactDataQualityLine userId={user?.id} />
        </ErrorBoundary>

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
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {processedWidgets.map((widget) => {
              const isSingleMode = widget.display_mode !== 'multi';
              const singleData = isSingleMode ? smartData?.get(widget.id) : undefined;
              const multiSourceData = !isSingleMode ? multiData?.get(widget.id) : undefined;
              const sparklineData = widgetHistory?.get(widget.id);
              
              // 🔍 DEBUG: Log Recovery Score sparkline data
              if (widget.metric_name.toLowerCase().includes('recovery')) {
                console.log('🔍 [Index] Recovery Score sparkline:', {
                  widgetId: widget.id,
                  metricName: widget.metric_name,
                  sparklineData: sparklineData,
                  dataLength: sparklineData?.length
                });
              }
              
              return (
                <WidgetCard
                  key={widget.id}
                  widget={widget}
                  data={singleData}
                  multiSourceData={multiSourceData}
                  sparklineData={sparklineData}
                />
              );
            })}
          </div>
        )}

        {/* Habits Section - MOVED ABOVE LEADERBOARD */}
        <ErrorBoundary>
          <HabitsSection />
        </ErrorBoundary>

        {/* Leaderboard Section */}
        <div className="mt-8">
          <Leaderboard />
        </div>
      </div>

      {/* Quick Actions Panel */}
      <QuickActionsPanel />
    </div>
  );
};

export default Index;

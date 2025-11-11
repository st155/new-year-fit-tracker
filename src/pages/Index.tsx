import { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AnimatedPage } from '@/components/layout/AnimatedPage';
import { useProgressiveLoad } from '@/hooks/useProgressiveLoad';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { MobileDebugOverlay } from '@/components/debug/MobileDebugOverlay';
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
import { HabitsV3Section } from '@/components/dashboard/HabitsV3Section';

import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DataQualityWidget } from '@/components/dashboard/DataQualityWidget';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plug, Target, CheckCircle, Trophy, Activity } from 'lucide-react';
import { FAB } from '@/components/ui/fab';
import { useNavigate } from 'react-router-dom';
import TrainerIndexPage from './TrainerIndexPage';
import { useQueryClient } from '@tanstack/react-query';
import { useAutoSync } from '@/hooks/useAutoSync';
import { useMetricsRealtime } from '@/hooks/metrics/useMetricsRealtime';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { WidgetErrorBoundary } from '@/components/error/WidgetErrorBoundary';
import { EnhancedAIInsights } from '@/components/dashboard/EnhancedAIInsights';
import { useDataQuality } from '@/hooks/useDataQuality';
import { useConfidenceRecalculation } from '@/hooks/useConfidenceRecalculation';

const Index = () => {
  const { user, isTrainer, role, loading: authLoading, rolesLoading } = useAuth();
  const { shouldLoad } = useProgressiveLoad();
  const leaderboardRef = useRef<HTMLDivElement>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
  // Health Score data
  const { 
    averageConfidence, 
    metricsByQuality, 
    isLoading: healthLoading 
  } = useDataQuality();
  const { recalculate, isRecalculating } = useConfidenceRecalculation();

  // Intersection Observer for Leaderboard lazy loading
  useEffect(() => {
    if (!shouldLoad('low') || !leaderboardRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShowLeaderboard(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(leaderboardRef.current);

    return () => observer.disconnect();
  }, [shouldLoad]);

  const handleHealthRefresh = () => {
    if (user?.id) {
      recalculate({ user_id: user.id });
    }
  };
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [forceReady, setForceReady] = useState(false);
  
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
  
  // 🔄 Force invalidate queries on mount for fresh data
  useEffect(() => {
    if (user?.id) {
      console.log('🔄 [Index] Force invalidating queries for fresh data');
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      queryClient.invalidateQueries({ queryKey: ['widgets'] });
    }
  }, [user?.id, queryClient]);
  
  // 🔥 Force rendering after 10 seconds if stuck loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.warn('⚠️ [Index] Force rendering after 10s timeout');
      setForceReady(true);
    }, 10000);
    
    return () => clearTimeout(timeout);
  }, []);
  
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
  
  // Sort widgets by position and filter out empty ones
  const processedWidgets = useMemo(() => {
    const sorted = [...widgets].sort((a, b) => a.position - b.position);
    
    // Habits 3.0 widgets don't need metrics data
    const habitsWidgets = ['🏆 Habit Level', '🔥 Habit Streaks', '🤝 Habit Social'];
    
    // Filter out widgets without data (except Habits 3.0 widgets)
    return sorted.filter(widget => {
      if (habitsWidgets.includes(widget.metric_name)) {
        return true; // Always show Habits 3.0 widgets
      }
      
      const isSingleMode = widget.display_mode !== 'multi';
      const hasData = isSingleMode 
        ? smartData?.has(widget.id)
        : multiData?.has(widget.id) && multiData.get(widget.id)?.sources?.length > 0;
      return hasData;
    });
  }, [widgets, smartData, multiData]);
  
  // ✅ 7-day history for sparkline charts (after processedWidgets is defined)
  const { data: widgetHistory, isLoading: historyLoading } = useWidgetHistory(
    user?.id,
    processedWidgets
  );

  // Wait for auth to load first (with force timeout)
  if ((authLoading || rolesLoading) && !forceReady) {
    console.log('⏳ [Index] Waiting for auth/roles...');
    return (
      <>
        <MobileDebugOverlay />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">Загрузка профиля...</p>
          </div>
        </div>
      </>
    );
  }

  if (loading && !forceReady) {
    console.log('⏳ [Index] Waiting for widgets/metrics...');
    return (
      <>
        <MobileDebugOverlay />
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
      </>
    );
  }

  // ✅ Trainer redirect handled by RoleBasedRoute wrapper - no need for duplicate check here
  console.log('✅ [Index] Rendering client dashboard with', processedWidgets.length, 'widgets');

  return (
    <AnimatedPage>
      <MobileDebugOverlay />
      <div className="min-h-screen bg-background p-4 md:p-6 pb-24 md:pb-6">
      <div className="max-w-7xl mx-auto space-y-3 md:space-y-4">
        {/* Compact Dashboard Header with AI Insights + Quality - Hidden on mobile */}
        <Suspense fallback={
          <div className="hidden md:block w-full bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-border/50 rounded-lg py-3 animate-pulse">
            <div className="flex items-center gap-3 px-4">
              <div className="h-4 w-4 bg-primary/20 rounded" />
              <div className="h-4 w-48 bg-muted rounded" />
            </div>
          </div>
        }>
          <div className="hidden md:block">
            <DashboardHeader />
          </div>
        </Suspense>
        
        {/* Controls Bar - Compact */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Left: Title */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Мои метрики</h1>
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Refresh Button - icon only on mobile */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isSyncing}
              className="md:w-auto md:px-4 md:gap-2 h-10 md:h-9"
              title="Обновить"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Обновить</span>
            </Button>
            
            {/* Widget Settings */}
            <WidgetSettings
              widgets={widgets}
              onAdd={addWidget}
              onRemove={removeWidget}
              onReorder={reorderWidgets}
            />
            
            {/* Integrations Button - icon only on mobile */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/fitness-data?tab=connections')}
              className="md:w-auto md:px-4 md:gap-2 h-10 md:h-9"
              title="Интеграции"
            >
              <Plug className="h-4 w-4" />
              <span className="hidden md:inline">Интеграции</span>
            </Button>
          </div>
        </div>

        {/* Critical: AI Insights + Widgets */}
        {shouldLoad('critical') && (
          <>
            <ErrorBoundary>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <EnhancedAIInsights 
                  userId={user?.id}
                  healthScore={{
                    averageConfidence,
                    metricsByQuality,
                    isLoading: healthLoading,
                    isRecalculating,
                    onRefresh: handleHealthRefresh,
                  }}
                />
              </motion.div>
            </ErrorBoundary>

            {/* Widgets Grid */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
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
        </motion.div>
          </>
        )}

        {/* High Priority: Habits V3 Section */}
        {shouldLoad('high') && (
          <ErrorBoundary fallback={
            <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-lg">
              <p className="text-sm text-destructive">❌ Habits section failed to load</p>
            </div>
          }>
            <HabitsV3Section />
          </ErrorBoundary>
        )}

        {/* Low Priority: Leaderboard Section (lazy loaded on scroll) */}
        <div ref={leaderboardRef} className="min-h-[200px]">
          {shouldLoad('low') && showLeaderboard && (
            <ErrorBoundary fallback={
              <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-lg">
                <p className="text-sm text-destructive">❌ Leaderboard failed to load</p>
              </div>
            }>
              <motion.div 
                className="mt-8"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                <Leaderboard />
              </motion.div>
            </ErrorBoundary>
          )}
        </div>
      </div>

      
      {/* Floating Action Button */}
      <FAB
        actions={[
          {
            label: 'Создать цель',
            icon: Target,
            onClick: () => navigate('/goals?action=create'),
          },
          {
            label: 'Добавить привычку',
            icon: CheckCircle,
            onClick: () => navigate('/habits-v3?action=create'),
          },
          {
            label: 'Новый челлендж',
            icon: Trophy,
            onClick: () => navigate('/challenges?action=create'),
          },
          {
            label: 'Внести данные',
            icon: Activity,
            onClick: () => navigate('/fitness-data?tab=manual'),
          },
        ]}
      />
      </div>
    </AnimatedPage>
  );
};

export default Index;

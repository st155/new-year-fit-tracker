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
import { WidgetCard } from '@/components/dashboard/WidgetCard';
import { WidgetSettings } from '@/components/dashboard/WidgetSettings';
import { Leaderboard } from '@/components/dashboard/leaderboard';
import { HabitsSection } from '@/components/dashboard/HabitsSection';
import { CompactAIInsights } from '@/components/dashboard/CompactAIInsights';
import { QuickActionsPanel } from '@/components/dashboard/QuickActionsPanel';
import { DataQualitySummary } from '@/components/dashboard/DataQualitySummary';
import { GlobalTicker } from '@/components/ui/global-ticker';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RefreshCw } from 'lucide-react';
import TrainerIndexPage from './TrainerIndexPage';
import { useQueryClient } from '@tanstack/react-query';
import { useAutoSync } from '@/hooks/useAutoSync';
import { useMetricsRealtime } from '@/hooks/metrics/useMetricsRealtime';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { WidgetErrorBoundary } from '@/components/error/WidgetErrorBoundary';

const Index = () => {
  const { user, isTrainer, role, loading: authLoading, rolesLoading } = useAuth();
  const queryClient = useQueryClient();
  
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
  
  const [showOnlyRecent, setShowOnlyRecent] = useState(() => {
    return localStorage.getItem('show_only_recent') === 'true';
  });
  const [showOnlyHighQuality, setShowOnlyHighQuality] = useState(false);
  const [widgetAges, setWidgetAges] = useState<Record<string, number>>({});

  // 🧹 ONE-TIME cleanup of legacy localStorage on mount (migration to React Query)
  useEffect(() => {
    if (!user) return;
    
    console.log('🧹 [Dashboard] Migrating to React Query - cleaning legacy cache...');
    
    // Clean ALL widget-related localStorage (we now use React Query exclusively)
    let clearedCount = 0;
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('widget_') || 
          key.startsWith('widgets_') ||
          key.includes('whoop') || 
          key.includes('fitness') || 
          key.startsWith('progress_cache_')) {
        localStorage.removeItem(key);
        clearedCount++;
        console.log(`🧹 Cleared legacy cache: ${key}`);
      }
    });

    if (clearedCount > 0) {
      console.log(`✅ Migrated to React Query: cleared ${clearedCount} legacy cache entries`);
    }
  }, []); // Run once on mount

  const handleRefresh = async () => {
    console.log('🔄 Manual refresh triggered - syncing all sources');
    await syncAllData(); // Trigger real sync
    queryClient.invalidateQueries({ queryKey: widgetKeys.all });
    queryClient.invalidateQueries({ queryKey: ['metrics'] });
    setWidgetAges({}); // Clear ages on refresh
  };
  
  // Filter and sort widgets
  const processedWidgets = useMemo(() => {
    const now = Date.now();
    
    // Sort by data freshness first (fresh data < 24h first), then by position
    let sorted = [...widgets].sort((a, b) => {
      const aAge = ages.get(a.id) ?? 0; // hours
      const bAge = ages.get(b.id) ?? 0;
      
      const aFresh = aAge < 24;
      const bFresh = bAge < 24;
      
      if (aFresh && !bFresh) return -1;
      if (bFresh && !aFresh) return 1;
      
      return a.position - b.position;
    });
    
    // Apply recency filter if enabled
    if (showOnlyRecent) {
      sorted = sorted.filter(widget => {
        const age = ages.get(widget.id);
        return age === undefined || age <= 72; // hours <= 72 (3 days)
      });
    }
    
    // Apply quality filter if enabled
    if (showOnlyHighQuality) {
      sorted = sorted.filter(widget => {
        const data = smartData?.get(widget.id);
        if (!data) return false;
        // Show only if confidence >= 60% or if no confidence data (assume good)
        return data.confidence === undefined || data.confidence >= 60;
      });
    }
    
    return sorted;
  }, [widgets, widgetAges, showOnlyRecent, showOnlyHighQuality, smartData]);

  const hiddenCount = widgets.length - processedWidgets.length;

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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Global Ticker at the top */}
        <GlobalTicker />
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Мои метрики</h1>
            <p className="text-muted-foreground mt-1">
              Настройте виджеты для отображения важных показателей
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-background">
                <Switch
                  checked={showOnlyRecent}
                  onCheckedChange={(checked) => {
                    setShowOnlyRecent(checked);
                    localStorage.setItem('show_only_recent', String(checked));
                  }}
                />
                <span className="text-sm text-muted-foreground">Только актуальные</span>
              </div>
              
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-background">
                <Switch
                  checked={showOnlyHighQuality}
                  onCheckedChange={setShowOnlyHighQuality}
                />
                <span className="text-sm text-muted-foreground">Качественные (≥60%)</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="gap-2"
              disabled={isSyncing}
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Синхронизация...' : 'Обновить всё'}
            </Button>
            <WidgetSettings
              widgets={widgets}
              onAdd={addWidget}
              onRemove={removeWidget}
              onReorder={reorderWidgets}
            />
          </div>
        </div>

        {/* Hidden widgets message */}
        {showOnlyRecent && hiddenCount > 0 && (
          <div className="text-sm text-muted-foreground text-center py-2">
            Скрыто {hiddenCount} неактивных виджетов{' '}
            <Button 
              variant="link" 
              size="sm"
              className="h-auto p-0 text-sm"
              onClick={() => setShowOnlyRecent(false)}
            >
              Показать все
            </Button>
          </div>
        )}

        {/* AI Insights - Compact Ticker */}
        <CompactAIInsights />

        {/* Data Quality Summary */}
        <DataQualitySummary />

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
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-2 sm:gap-4">
            {processedWidgets.map((widget) => {
              const isSingleMode = widget.display_mode !== 'multi';
              const singleData = isSingleMode ? smartData?.get(widget.id) : undefined;
              const multiSourceData = !isSingleMode ? multiData?.get(widget.id) : undefined;
              
              return (
                <WidgetCard
                  key={widget.id}
                  widget={widget}
                  data={singleData}
                  multiSourceData={multiSourceData}
                />
              );
            })}
          </div>
        )}

        {/* Habits Section - MOVED ABOVE LEADERBOARD */}
        <HabitsSection />

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

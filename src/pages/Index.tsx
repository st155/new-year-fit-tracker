import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useWidgets } from '@/hooks/useWidgets';
import { WidgetCard } from '@/components/dashboard/WidgetCard';
import { WidgetSettings } from '@/components/dashboard/WidgetSettings';
import { IntegrationsCard } from '@/components/dashboard/integrations-card';
import { Leaderboard } from '@/components/dashboard/leaderboard';
import { HabitsSection } from '@/components/dashboard/HabitsSection';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { clearStaleWhoopCache } from '@/lib/cache-utils';
import { supabase } from '@/integrations/supabase/client';
import TrainerIndexPage from './TrainerIndexPage';

const Index = () => {
  const { user } = useAuth();
  const { isTrainer, role, loading: roleLoading } = useUserRole();
  const { widgets, loading, addWidget, removeWidget, reorderWidgets, refetch } = useWidgets(user?.id);
  const [refreshKey, setRefreshKey] = useState(0);

  // 🧹 АВТОМАТИЧЕСКАЯ ОЧИСТКА КЕШЕЙ и проверка токенов
  useEffect(() => {
    const checkTokensAndClearCache = async () => {
      if (!user) return;
      
      console.log('🔍 [Index] Checking Terra Whoop connection and cache freshness');
      
      // Check if user has active Terra token for Whoop
      const { data: terraToken } = await supabase
        .from('terra_tokens')
        .select('is_active')
        .eq('user_id', user.id)
        .eq('provider', 'WHOOP')
        .eq('is_active', true)
        .maybeSingle();
      
      if (!terraToken) {
        console.log('⚠️ [Index] No active Terra Whoop token - clearing Whoop caches');
        // Clear all Whoop-related caches
        ['fitness_metrics_cache', 'fitness_data_cache_whoop', 'fitness_data_cache'].forEach(key => {
          localStorage.removeItem(key);
        });
        Object.keys(localStorage).forEach(key => {
          if (key.includes('whoop') || key.includes('fitness') || key.startsWith('progress_cache_')) {
            localStorage.removeItem(key);
          }
        });
      } else {
        // Token exists - just clear stale data (>24h)
        const clearedCount = clearStaleWhoopCache();
        if (clearedCount > 0) {
          console.log(`🧹 [Index] Cleared ${clearedCount} stale cache entries`);
        }
      }
    };
    
    checkTokensAndClearCache();
  }, [user]); // Re-check when user changes

  console.log('🏠 [Index] Render', {
    timestamp: new Date().toISOString(),
    userId: user?.id,
    isTrainer,
    role,
    roleLoading,
    widgetsLoading: loading,
    widgetsCount: widgets.length
  });

  const handleRefresh = () => {
    refetch();
    setRefreshKey(prev => prev + 1);
  };

  if (loading || roleLoading) {
    console.log('⏳ [Index] Loading state', { loading, roleLoading });
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
    console.log('👔 [Index] Redirecting to TrainerIndexPage');
    return <TrainerIndexPage />;
  }

  console.log('👤 [Index] Rendering user dashboard', {
    widgetsCount: widgets.length
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Мои метрики</h1>
            <p className="text-muted-foreground mt-1">
              Настройте виджеты для отображения важных показателей
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
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
              <WidgetCard
                key={widget.id}
                metricName={widget.metric_name}
                source={widget.source}
                refreshKey={refreshKey}
              />
            ))}
          </div>
        )}

        {/* Habits Section */}
        <HabitsSection />

        {/* Integrations Section */}
        <div className="mt-8">
          <IntegrationsCard />
        </div>

        {/* Leaderboard Section */}
        <div className="mt-8">
          <Leaderboard />
        </div>
      </div>
    </div>
  );
};

export default Index;

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Minus, Activity, Footprints, Zap, Scale, Heart, Flame, Moon, Droplet, AlertCircle, RefreshCw, Link as LinkIcon } from 'lucide-react';
import { fetchWidgetData } from '@/hooks/useWidgets';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WidgetCardProps {
  metricName: string;
  source: string;
  refreshKey?: number;
}

const getMetricIcon = (metricName: string) => {
  const name = metricName.toLowerCase();
  if (name.includes('step')) return Footprints;
  if (name.includes('strain')) return Flame;
  if (name.includes('recovery')) return Heart;
  if (name.includes('weight')) return Scale;
  if (name.includes('sleep')) return Moon;
  if (name.includes('hr') || name.includes('heart')) return Heart;
  if (name.includes('hrv')) return Heart;
  if (name.includes('calorie')) return Droplet;
  if (name.includes('vo2')) return Zap;
  return Activity;
};

const getMetricColor = (metricName: string) => {
  const name = metricName.toLowerCase();
  if (name.includes('step')) return '#3b82f6'; // blue
  if (name.includes('strain') || name.includes('workout')) return '#f97316'; // orange
  if (name.includes('recovery')) return '#10b981'; // green
  if (name.includes('weight')) return '#8b5cf6'; // purple
  if (name.includes('sleep')) return '#6366f1'; // indigo
  if (name.includes('hr') || name.includes('heart')) return '#ef4444'; // red
  if (name.includes('hrv')) return '#06b6d4'; // cyan
  if (name.includes('calorie')) return '#f59e0b'; // amber
  if (name.includes('vo2')) return '#14b8a6'; // teal
  if (name.includes('fat')) return '#ec4899'; // pink
  return '#3b82f6'; // default blue
};

// Метрики где снижение = улучшение
const isLowerBetter = (metricName: string) => {
  const name = metricName.toLowerCase();
  return name.includes('fat') || 
         name.includes('weight') || 
         name.includes('resting hr') ||
         name.includes('stress');
};

const getTrendColor = (trend: number, metricName: string) => {
  const lowerIsBetter = isLowerBetter(metricName);
  const isImproving = lowerIsBetter ? trend < 0 : trend > 0;
  
  if (Math.abs(trend) < 0.5) return '#6b7280'; // gray для нейтрального
  return isImproving ? '#10b981' : '#ef4444'; // green для улучшения, red для ухудшения
};

const formatValue = (value: number | string, metricName: string, unit: string): string => {
  if (typeof value === 'string') return value;
  
  if (metricName.toLowerCase().includes('sleep') && metricName.toLowerCase().includes('duration')) {
    const hours = Math.floor(value);
    const minutes = Math.round((value - hours) * 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }
  
  if (metricName === 'Steps') {
    return Math.round(value).toLocaleString();
  }
  
  return value % 1 === 0 ? value.toString() : value.toFixed(1);
};

const getSourceDisplayName = (source: string): string => {
  const nameMap: Record<string, string> = {
    whoop: 'Whoop',
    ultrahuman: 'Ultrahuman',
    garmin: 'Garmin',
    withings: 'Withings',
  };
  return nameMap[source.toLowerCase()] || source;
};

export function WidgetCard({ metricName, source, refreshKey }: WidgetCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [hasActiveToken, setHasActiveToken] = useState<boolean | null>(null);
  const [data, setData] = useState<{
    value: number | string;
    unit: string;
    date: string;
    trend?: number;
  } | null>(null);

  // Check if user has active Terra token for Whoop (for Whoop widgets only)
  useEffect(() => {
    if (!user || source.toLowerCase() !== 'whoop') {
      setHasActiveToken(true); // Not a Whoop widget, no check needed
      return;
    }
    
    const checkToken = async () => {
      const { data: token } = await supabase
        .from('terra_tokens')
        .select('is_active')
        .eq('user_id', user.id)
        .eq('provider', 'WHOOP')
        .eq('is_active', true)
        .maybeSingle();
      
      setHasActiveToken(!!token);
      
      if (!token && data) {
        console.log('⚠️ [WidgetCard] Showing cached Whoop data without active Terra token');
      }
    };
    
    checkToken();
  }, [user, source, data]);

  useEffect(() => {
    loadData();
  }, [metricName, source, user, refreshKey]);

  // Realtime подписка на новые метрики
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`metric-updates-${user.id}-${metricName}-${source}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'metric_values',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('📊 New metric value inserted:', payload);
          // Перезагружаем данные виджета
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, metricName, source]);


  // Слушаем глобальное событие принудительного обновления всех виджетов
  useEffect(() => {
    const handleHardRefetch = () => {
      console.log('📢 [WidgetCard] Received widgets-hard-refetch event');
      loadData();
    };

    window.addEventListener('widgets-hard-refetch', handleHardRefetch);
    return () => {
      window.removeEventListener('widgets-hard-refetch', handleHardRefetch);
    };
  }, []);

  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    const result = await fetchWidgetData(user.id, metricName, source);
    
    const hoursOld = result?.date ? 
      (new Date().getTime() - new Date(result.date).getTime()) / (1000 * 60 * 60) : 0;
    
    console.log(`📊 [WidgetCard] ${metricName}/${source}:`, {
      value: result?.value,
      date: result?.date,
      hoursOld: Math.floor(hoursOld),
      isFresh: hoursOld <= 24
    });
    
    setData(result);
    setLoading(false);
  };

  const syncWhoopData = async () => {
    if (!user) return;
    
    setSyncing(true);
    try {
      console.log('🔄 [WidgetCard] Starting Whoop sync from widget...');
      
      // Clear all caches
      localStorage.removeItem(`widgets_${user.id}`);
      localStorage.removeItem(`widget_${metricName}_${source}_${user.id}`);
      localStorage.removeItem(`latest_metrics_${user.id}`);
      
      const { error } = await supabase.functions.invoke('terra-integration', {
        body: { action: 'sync-data' }
      });
      
      if (error) throw error;
      
      console.log('✅ Whoop sync completed');
      toast({
        title: 'Синхронизация запущена',
        description: 'Whoop данные обновляются...',
      });
      
      // Dispatch global refetch event for all widgets
      setTimeout(() => {
        console.log('📢 Dispatching widgets-hard-refetch event');
        window.dispatchEvent(new Event('widgets-hard-refetch'));
      }, 2000);
      
    } catch (error: any) {
      console.error('❌ Whoop sync failed:', error);
      toast({
        title: 'Ошибка синхронизации',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleCardClick = async () => {
    if (!user) return;
    // Force refresh: clear cache and reload
    localStorage.removeItem(`widget_${metricName}_${source}_${user.id}`);
    console.log(`🔄 [WidgetCard] Force refresh: ${metricName}/${source}`);
    await loadData();
  };

  const Icon = getMetricIcon(metricName);
  const color = getMetricColor(metricName);

  if (loading) {
    return (
      <Card className="overflow-hidden border-border/40 hover:shadow-lg transition-all">
        <CardContent className="p-6">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card 
        className="overflow-hidden border-border/40 cursor-pointer hover:bg-accent/50 hover:shadow-lg transition-all hover:scale-[1.02]"
        onClick={() => navigate('/integrations')}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {metricName}
              </p>
              <p className="text-xs text-muted-foreground/60">
                {getSourceDisplayName(source)}
              </p>
            </div>
            <Icon className="h-5 w-5 opacity-40" style={{ color }} />
          </div>
          <p className="text-sm text-muted-foreground mb-2">Нет данных</p>
          <p className="text-xs text-primary/70 flex items-center gap-1">
            <LinkIcon className="h-3 w-3" />
            Нажмите для подключения
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasTrend = data.trend !== undefined && !isNaN(data.trend);
  const trendColor = hasTrend ? getTrendColor(data.trend!, metricName) : undefined;
  
  // Проверка на устаревшие данные с двумя уровнями
  const hoursOld = data?.date ? 
    (new Date().getTime() - new Date(data.date).getTime()) / (1000 * 60 * 60) : 0;
  const isDataWarning = hoursOld > 24 && hoursOld <= 48; // Желтый: 24-48 часов
  const isDataStale = hoursOld > 48; // Красный: >48 часов
  const isWhoopSource = source.toLowerCase() === 'whoop';
  
  // Проверка на кешированные данные без активного токена
  const isCachedWithoutToken = isWhoopSource && hasActiveToken === false && data;
  
  const getDataAgeMessage = () => {
    if (isCachedWithoutToken) return 'Whoop не подключен. Показаны кешированные данные';
    if (hoursOld <= 24) return 'Данные актуальны';
    if (hoursOld <= 48) return `Данные не обновлялись ${Math.floor(hoursOld)} часов`;
    const daysOld = Math.floor(hoursOld / 24);
    return `Данные не обновлялись ${daysOld} ${daysOld === 1 ? 'день' : 'дней'}`;
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer relative"
      onClick={handleCardClick}
      style={{
        background: `linear-gradient(135deg, ${color}08, transparent)`,
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: isCachedWithoutToken ? '#ef4444' : isDataStale ? '#ef4444' : isDataWarning ? '#eab308' : (trendColor || `${color}30`),
      }}
    >
      <CardContent className="p-6">
        {(isDataWarning || isDataStale || isCachedWithoutToken) && isWhoopSource && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="absolute top-2 right-2 flex gap-2">
                  <Badge 
                    variant={isDataStale || isCachedWithoutToken ? "destructive" : "outline"} 
                    className="text-xs"
                    style={isDataWarning ? { 
                      backgroundColor: '#fef3c7', 
                      color: '#854d0e',
                      borderColor: '#eab308'
                    } : undefined}
                  >
                    {isCachedWithoutToken ? '❌ Кеш' : isDataStale ? '⚠️ Устарело' : '⏱️ Не обновлялось'}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{getDataAgeMessage()}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground mb-1">
              {metricName}
            </p>
            <p className="text-xs text-muted-foreground/60">
              {getSourceDisplayName(source)}
            </p>
          </div>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <Icon className="h-6 w-6" style={{ color }} />
          <span className="text-3xl font-bold" style={{ color }}>
            {formatValue(data.value, metricName, data.unit)}
          </span>
          {data.unit && (
            <span className="text-sm text-muted-foreground">
              {data.unit}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {(() => {
              const now = new Date();
              const dataDate = new Date(data.date);
              const daysDiff = Math.floor((now.getTime() - dataDate.getTime()) / (1000 * 60 * 60 * 24));
              
              const isSleepMetric = metricName.toLowerCase().includes('sleep');
              const isRecoveryScore = metricName === 'Recovery Score';
              const isWorkoutMetric = metricName.toLowerCase().includes('workout') || 
                                     metricName.toLowerCase().includes('strain');
              
              // Recovery Score: если данные за вчера/сегодня → "Сегодня"
              if (isRecoveryScore && daysDiff <= 1) {
                return <span className="text-muted-foreground">Сегодня</span>;
              }
              
              // Sleep: если данные за сегодня → "Сегодня"
              if (isSleepMetric && daysDiff === 0) {
                return <span className="text-muted-foreground">Сегодня</span>;
              }
              
              // Workout метрики: "Последняя: [дата]" если > 1 дня
              if (isWorkoutMetric && daysDiff > 1) {
                return (
                  <>
                    <span className="text-muted-foreground">Последняя:</span>
                    <span className="text-muted-foreground">
                      {dataDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                  </>
                );
              }
              
              // Остальные метрики: "Сегодня" / "Вчера" / дата
              if (daysDiff === 0) {
                return <span className="text-muted-foreground">Сегодня</span>;
              } else if (daysDiff === 1) {
                return <span className="text-muted-foreground">Вчера</span>;
              } else {
                return (
                  <>
                    <span className="text-muted-foreground">
                      {dataDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                    {daysDiff > 1 && (
                      <span className="text-xs text-yellow-600 font-medium">
                        ({daysDiff} дн. назад)
                      </span>
                    )}
                  </>
                );
              }
            })()}
          </div>
          
          {hasTrend && (
            <div 
              className="flex items-center gap-1 font-medium"
              style={{ color: trendColor }}
            >
              {data.trend! > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : data.trend! < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              <span>{Math.abs(data.trend!).toFixed(1)}%</span>
            </div>
          )}
        </div>

        {(isDataWarning || isDataStale || isCachedWithoutToken) && isWhoopSource && (
          <div className="mt-3 pt-3 border-t">
            {isCachedWithoutToken ? (
              <Button 
                size="sm" 
                variant="destructive" 
                className="w-full text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/integrations');
                }}
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                Подключить Whoop
              </Button>
            ) : hoursOld > 168 ? (
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/integrations');
                }}
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                Переподключить
              </Button>
            ) : (
              <Button 
                size="sm" 
                variant="default" 
                className="w-full text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  syncWhoopData();
                }}
                disabled={syncing}
              >
                {syncing ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Синхронизация...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Обновить Whoop
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

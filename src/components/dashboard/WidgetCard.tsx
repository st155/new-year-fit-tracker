import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, Activity, Footprints, Zap, Scale, Heart, Flame, Moon, Droplet, AlertCircle } from 'lucide-react';
import { fetchWidgetData } from '@/hooks/useWidgets';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

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
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    value: number | string;
    unit: string;
    date: string;
    trend?: number;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, [metricName, source, user, refreshKey]);

  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    const result = await fetchWidgetData(user.id, metricName, source);
    setData(result);
    setLoading(false);
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
      <Card className="overflow-hidden border-border/40">
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
          <p className="text-sm text-muted-foreground">Нет данных</p>
        </CardContent>
      </Card>
    );
  }

  const hasTrend = data.trend !== undefined && !isNaN(data.trend);
  const trendColor = hasTrend ? getTrendColor(data.trend!, metricName) : undefined;
  
  // Проверка на устаревшие данные (старше 2 дней)
  const isDataStale = data?.date && 
    new Date().getTime() - new Date(data.date).getTime() > 2 * 24 * 60 * 60 * 1000;
  const isWhoopSource = source.toLowerCase() === 'whoop';

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer relative"
      style={{
        background: `linear-gradient(135deg, ${color}08, transparent)`,
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: isDataStale ? '#ef4444' : (trendColor || `${color}30`),
      }}
    >
      <CardContent className="p-6">
        {isDataStale && isWhoopSource && (
          <div className="absolute top-2 right-2 flex gap-2">
            <Badge variant="destructive" className="text-xs">
              ⚠️ Устарело
            </Badge>
          </div>
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
              const isToday = data.date === new Date().toISOString().split('T')[0];
              const daysDiff = Math.floor(
                (new Date().getTime() - new Date(data.date).getTime()) / (1000 * 60 * 60 * 24)
              );
              const isWorkoutMetric = metricName.toLowerCase().includes('workout') || 
                                     metricName.toLowerCase().includes('strain');
              
              if (isToday) {
                return <span className="text-muted-foreground">Сегодня</span>;
              } else if (isWorkoutMetric && daysDiff > 1) {
                return (
                  <>
                    <span className="text-muted-foreground">Последняя:</span>
                    <span className="text-muted-foreground">
                      {new Date(data.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                  </>
                );
              } else {
                return (
                  <>
                    <span className="text-muted-foreground">
                      {new Date(data.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
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

        {isDataStale && isWhoopSource && (
          <div className="mt-3 pt-3 border-t">
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full text-xs"
              onClick={() => navigate('/integrations')}
            >
              <AlertCircle className="h-3 w-3 mr-1" />
              Переподключить Whoop
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

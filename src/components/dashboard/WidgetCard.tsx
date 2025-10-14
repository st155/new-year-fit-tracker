import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, Activity, Footprints, Zap, Scale } from 'lucide-react';
import { fetchWidgetData } from '@/hooks/useWidgets';
import { useAuth } from '@/hooks/useAuth';

interface WidgetCardProps {
  metricName: string;
  source: string;
}

const getMetricIcon = (metricName: string) => {
  const name = metricName.toLowerCase();
  if (name.includes('step')) return Footprints;
  if (name.includes('strain')) return Zap;
  if (name.includes('recovery')) return Activity;
  if (name.includes('weight')) return Scale;
  return Activity;
};

const getMetricColor = (metricName: string) => {
  const name = metricName.toLowerCase();
  if (name.includes('step')) return 'hsl(var(--chart-1))';
  if (name.includes('strain')) return 'hsl(var(--chart-2))';
  if (name.includes('recovery')) return 'hsl(var(--chart-3))';
  if (name.includes('weight')) return 'hsl(var(--chart-4))';
  return 'hsl(var(--primary))';
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

export function WidgetCard({ metricName, source }: WidgetCardProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    value: number | string;
    unit: string;
    date: string;
    trend?: number;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, [metricName, source, user]);

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

  return (
    <Card 
      className="overflow-hidden border-border/40 hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
      style={{
        background: `linear-gradient(135deg, ${color}08, transparent)`,
        borderColor: `${color}30`,
      }}
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
          <Icon className="h-5 w-5 opacity-50" style={{ color }} />
        </div>

        <div className="flex items-baseline gap-2 mb-2">
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
          <span className="text-muted-foreground">
            {new Date(data.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
          </span>
          
          {hasTrend && (
            <div className={`flex items-center gap-1 ${
              data.trend! > 0 ? 'text-success' : data.trend! < 0 ? 'text-destructive' : 'text-muted-foreground'
            }`}>
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
      </CardContent>
    </Card>
  );
}

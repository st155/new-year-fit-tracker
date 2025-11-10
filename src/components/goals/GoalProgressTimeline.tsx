import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { format, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Measurement {
  value: number;
  measurement_date: string;
}

interface GoalProgressTimelineProps {
  measurements: Measurement[];
  target: number;
  isLowerBetter?: boolean;
  unit?: string;
  period?: 'week' | 'month';
}

export function GoalProgressTimeline({ 
  measurements, 
  target, 
  isLowerBetter = false,
  unit = '',
  period = 'week'
}: GoalProgressTimelineProps) {
  const timelineData = useMemo(() => {
    const days = period === 'week' ? 7 : 30;
    const today = new Date();
    
    return Array.from({ length: days }, (_, i) => {
      const date = subDays(today, days - 1 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const measurement = measurements.find(m => 
        m.measurement_date.startsWith(dateStr)
      );
      
      return {
        date: format(date, 'd MMM', { locale: ru }),
        value: measurement?.value || null,
        progress: measurement 
          ? Math.min(100, (measurement.value / target) * 100)
          : null,
      };
    });
  }, [measurements, target, period]);

  const getTrend = () => {
    if (measurements.length < 2) return 'neutral';
    
    const recent = measurements.slice(-3).map(m => m.value);
    const older = measurements.slice(-6, -3).map(m => m.value);
    
    if (recent.length === 0 || older.length === 0) return 'neutral';
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const diff = recentAvg - olderAvg;
    const isImproving = isLowerBetter ? diff < -1 : diff > 1;
    
    return diff === 0 ? 'neutral' : (isImproving ? 'up' : 'down');
  };

  const trend = getTrend();

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Прогресс за {period === 'week' ? 'неделю' : 'месяц'}</span>
          <div className="flex items-center gap-2">
            {trend === 'up' && (
              <div className="flex items-center text-success">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="text-xs">Улучшение</span>
              </div>
            )}
            {trend === 'down' && (
              <div className="flex items-center text-destructive">
                <TrendingDown className="h-4 w-4 mr-1" />
                <span className="text-xs">Снижение</span>
              </div>
            )}
            {trend === 'neutral' && (
              <div className="flex items-center text-muted-foreground">
                <Minus className="h-4 w-4 mr-1" />
                <span className="text-xs">Стабильно</span>
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-1">
          {timelineData.map((day, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1 flex-1">
              <div className={cn(
                "w-full rounded-sm transition-all duration-300",
                day.value !== null ? "bg-primary/20" : "bg-muted"
              )} style={{ 
                height: day.value !== null 
                  ? `${Math.max(20, (day.progress || 0))}px` 
                  : '8px',
                minHeight: '8px',
              }}>
                {day.value !== null && day.progress && day.progress >= 100 && (
                  <div className="w-full h-full bg-gradient-primary rounded-sm animate-pulse" />
                )}
              </div>
              <span className="text-[8px] text-muted-foreground mt-0.5 truncate w-full text-center">
                {day.date.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
        
        {measurements.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>Начало: {measurements[0].value}{unit}</span>
            <span className="font-medium text-foreground">
              Сейчас: {measurements[measurements.length - 1].value}{unit}
            </span>
            <span>Цель: {target}{unit}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

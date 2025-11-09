import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfWeek, eachDayOfInterval, getDay, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MetricHeatmapProps {
  data: any[];
  selectedMetric: string;
  onMetricChange: (metric: string) => void;
  availableMetrics: string[];
  timeRange: { start: Date; end: Date };
}

export function MetricHeatmap({ 
  data, 
  selectedMetric, 
  onMetricChange, 
  availableMetrics,
  timeRange 
}: MetricHeatmapProps) {
  const heatmapData = useMemo(() => {
    if (!selectedMetric || data.length === 0) return [];

    const allDays = eachDayOfInterval({ start: timeRange.start, end: timeRange.end });
    
    // Group by week
    const weeks: Array<Array<{ date: Date; value: number | null }>> = [];
    let currentWeek: Array<{ date: Date; value: number | null }> = [];
    
    allDays.forEach((date, index) => {
      const dayOfWeek = getDay(date);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dataPoint = data.find(d => d.date === dateStr);
      const value = dataPoint?.[selectedMetric] ?? null;
      
      // Start new week on Monday (day 1)
      if (dayOfWeek === 1 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      
      currentWeek.push({ date, value });
      
      // Push last week
      if (index === allDays.length - 1) {
        weeks.push(currentWeek);
      }
    });

    return weeks;
  }, [data, selectedMetric, timeRange]);

  const getIntensityColor = (value: number | null) => {
    if (value === null) return 'bg-muted/30';
    
    // Normalize value (0-100 scale)
    const normalized = Math.min(100, Math.max(0, value));
    
    if (normalized >= 80) return 'bg-green-500';
    if (normalized >= 60) return 'bg-green-400';
    if (normalized >= 40) return 'bg-yellow-500';
    if (normalized >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  if (availableMetrics.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Тепловая карта активности</CardTitle>
          <Select value={selectedMetric} onValueChange={onMetricChange}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Выберите метрику" />
            </SelectTrigger>
            <SelectContent>
              {availableMetrics.map(metric => (
                <SelectItem key={metric} value={metric}>
                  {metric}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Week day labels */}
          <div className="grid grid-cols-8 gap-1 text-xs text-muted-foreground">
            <div></div>
            {weekDays.map(day => (
              <div key={day} className="text-center">
                {day}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          {heatmapData.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-8 gap-1">
              {/* Week label */}
              <div className="text-xs text-muted-foreground flex items-center">
                {format(week[0].date, 'MMM dd', { locale: ru })}
              </div>
              
              {/* Days */}
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={cn(
                    'aspect-square rounded-sm transition-all hover:ring-2 hover:ring-primary cursor-pointer',
                    getIntensityColor(day.value)
                  )}
                  title={`${format(day.date, 'dd MMM yyyy', { locale: ru })}: ${day.value?.toFixed(1) ?? 'Нет данных'}`}
                />
              ))}
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 pt-4 text-xs text-muted-foreground">
            <span>Меньше</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded-sm bg-red-500" />
              <div className="w-4 h-4 rounded-sm bg-orange-500" />
              <div className="w-4 h-4 rounded-sm bg-yellow-500" />
              <div className="w-4 h-4 rounded-sm bg-green-400" />
              <div className="w-4 h-4 rounded-sm bg-green-500" />
            </div>
            <span>Больше</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

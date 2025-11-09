import { useMemo } from 'react';
import { format, subDays, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface HabitMiniChartProps {
  completions: Array<{ completed_at: string }>;
  days?: number;
  className?: string;
}

export function HabitMiniChart({ completions, days = 7, className }: HabitMiniChartProps) {
  const chartData = useMemo(() => {
    const today = startOfDay(new Date());
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const hasCompletion = completions.some(c => 
        format(new Date(c.completed_at), 'yyyy-MM-dd') === dateStr
      );
      
      data.push({
        date: dateStr,
        label: format(date, 'EEE', { locale: ru }),
        completed: hasCompletion
      });
    }
    
    return data;
  }, [completions, days]);

  const completionRate = useMemo(() => {
    const completed = chartData.filter(d => d.completed).length;
    return Math.round((completed / chartData.length) * 100);
  }, [chartData]);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Heatmap */}
      <div className="flex gap-1 justify-between">
        {chartData.map((day, index) => (
          <div key={index} className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "w-8 h-8 rounded transition-all duration-200",
                day.completed
                  ? "bg-primary shadow-glow"
                  : "bg-muted/30 hover:bg-muted/50"
              )}
              title={`${day.label}: ${day.completed ? 'Выполнено' : 'Не выполнено'}`}
            />
            <span className="text-[10px] text-muted-foreground">{day.label}</span>
          </div>
        ))}
      </div>
      
      {/* Stats */}
      <div className="text-center">
        <div className="text-xs text-muted-foreground">
          Выполнено <span className="font-semibold text-foreground">{completionRate}%</span> за последние {days} дней
        </div>
      </div>
    </div>
  );
}

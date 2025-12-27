import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, subDays, startOfDay } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface HabitMiniChartProps {
  completions: Array<{ completed_at: string }>;
  days?: number;
  className?: string;
}

export function HabitMiniChart({ completions, days = 7, className }: HabitMiniChartProps) {
  const { t, i18n } = useTranslation('habits');
  // Null-safe guard against undefined/null completions
  const safeCompletions = Array.isArray(completions) ? completions : [];
  
  const dateLocale = i18n.language === 'ru' ? ru : enUS;
  
  const chartData = useMemo(() => {
    const today = startOfDay(new Date());
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const hasCompletion = safeCompletions.some(c => 
        c?.completed_at && format(new Date(c.completed_at), 'yyyy-MM-dd') === dateStr
      );
      
      data.push({
        date: dateStr,
        label: format(date, 'EEE', { locale: dateLocale }),
        completed: hasCompletion
      });
    }
    
    return data;
  }, [safeCompletions, days, dateLocale]);

  const completionRate = useMemo(() => {
    const completed = chartData.filter(d => d.completed).length;
    return Math.round((completed / chartData.length) * 100);
  }, [chartData]);

  const sparklinePath = useMemo(() => {
    const values = chartData.map(d => d.completed ? 1 : 0);
    const width = 100;
    const height = 20;
    const stepX = width / (values.length - 1 || 1);
    
    const points = values.map((value, index) => {
      const x = index * stepX;
      const y = height - (value * height * 0.8);
      return { x, y };
    });
    
    const path = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
    const gradientId = `mini-grad-${Math.random().toString(36).substr(2, 9)}`;
    
    return { path, points, gradientId };
  }, [chartData]);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Sparkline Chart */}
      <svg viewBox="0 0 100 20" className="w-full h-6">
        <defs>
          <linearGradient id={sparklinePath.gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5"/>
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1"/>
          </linearGradient>
        </defs>
        <path
          d={`${sparklinePath.path} L 100,20 L 0,20 Z`}
          fill={`url(#${sparklinePath.gradientId})`}
        />
        <path
          d={sparklinePath.path}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 0 3px hsl(var(--primary)))' }}
        />
        {sparklinePath.points.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="2"
            fill="hsl(var(--primary))"
            opacity={chartData[i].completed ? 1 : 0.3}
          />
        ))}
      </svg>
      
      {/* Stats */}
      <div className="text-center">
        <div className="text-xs text-muted-foreground">
          {t('miniChart.completed')} <span className="font-semibold text-foreground">{completionRate}%</span> {t('miniChart.lastDays', { days })}
        </div>
      </div>
    </div>
  );
}

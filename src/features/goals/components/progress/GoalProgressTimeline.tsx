import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";
import { format, subDays, startOfWeek, startOfMonth, isWithinInterval } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";

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
  const { t, i18n } = useTranslation('goals');
  const dateLocale = i18n.language === 'ru' ? ru : enUS;

  const timelineData = useMemo(() => {
    const today = new Date();
    const startDate = period === 'week' 
      ? startOfWeek(today, { weekStartsOn: 1 })
      : startOfMonth(today);
    
    const daysCount = period === 'week' ? 7 : 30;
    const days = [];
    
    for (let i = 0; i < daysCount; i++) {
      const date = subDays(today, daysCount - 1 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const measurement = measurements.find(m => m.measurement_date === dateStr);
      
      days.push({
        date: dateStr,
        dayLabel: format(date, 'EEE', { locale: dateLocale }),
        dayNumber: format(date, 'd'),
        value: measurement?.value || null,
        hasData: !!measurement
      });
    }
    
    return days;
  }, [measurements, period, dateLocale]);

  const getTrend = () => {
    const recentMeasurements = measurements.slice(0, 3);
    if (recentMeasurements.length < 2) return 'stable';
    
    const avg = recentMeasurements.reduce((sum, m) => sum + m.value, 0) / recentMeasurements.length;
    const latest = recentMeasurements[0].value;
    const diff = latest - avg;
    
    if (Math.abs(diff) < 0.5) return 'stable';
    return diff > 0 ? 'up' : 'down';
  };

  const trend = getTrend();
  const latestValue = measurements[0]?.value || 0;
  const startValue = measurements[measurements.length - 1]?.value || latestValue;

  const getProgressColor = (value: number) => {
    const progress = isLowerBetter 
      ? ((startValue - value) / (startValue - target)) * 100
      : (value / target) * 100;
    
    if (progress >= 100) return 'hsl(var(--success))';
    if (progress >= 75) return 'hsl(var(--chart-2))';
    if (progress >= 50) return 'hsl(var(--chart-4))';
    return 'hsl(var(--muted-foreground))';
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const isTrendPositive = isLowerBetter ? trend === 'down' : trend === 'up';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t('timeline.title', { period: period === 'week' ? t('timeline.week') : t('timeline.month') })}
          </CardTitle>
          <Badge variant={isTrendPositive ? 'default' : 'secondary'} className="text-xs">
            <TrendIcon className="h-3 w-3 mr-1" />
            {trend === 'stable' ? t('timeline.stable') : isTrendPositive ? t('timeline.growth') : t('timeline.decline')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timeline */}
        <div className="flex gap-1">
          {timelineData.map((day, idx) => {
            const progress = day.value 
              ? isLowerBetter
                ? Math.max(0, Math.min(100, ((startValue - day.value) / (startValue - target)) * 100))
                : Math.max(0, Math.min(100, (day.value / target) * 100))
              : 0;
            
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className="w-full bg-muted rounded-sm overflow-hidden"
                  style={{ height: '60px' }}
                >
                  <div 
                    className="w-full transition-all duration-300 rounded-sm"
                    style={{ 
                      height: `${progress}%`,
                      backgroundColor: day.hasData ? getProgressColor(day.value!) : 'transparent',
                      marginTop: `${100 - progress}%`
                    }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {day.dayNumber}
                </span>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t">
          <div className="text-center">
            <div className="text-muted-foreground">{t('timeline.start')}</div>
            <div className="font-semibold">{startValue.toFixed(1)} {unit}</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">{t('timeline.now')}</div>
            <div className="font-semibold" style={{ color: getProgressColor(latestValue) }}>
              {latestValue.toFixed(1)} {unit}
            </div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">{t('timeline.target')}</div>
            <div className="font-semibold">{target.toFixed(1)} {unit}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { useMemo } from 'react';
import { format, eachDayOfInterval, startOfYear, endOfDay, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HabitCalendarHeatmapProps {
  userId?: string;
  habitIds?: string[]; // If provided, only show these habits
}

export function HabitCalendarHeatmap({ userId, habitIds }: HabitCalendarHeatmapProps) {
  const dateRange = useMemo(() => {
    const end = endOfDay(new Date());
    const start = startOfYear(end);
    return { start, end };
  }, []);

  const { data: completionData, isLoading } = useQuery({
    queryKey: ['habit-calendar-heatmap', userId, habitIds, dateRange],
    queryFn: async () => {
      if (!userId) return {};

      let query = supabase
        .from('habit_completions')
        .select('completed_at, habit_id')
        .eq('user_id', userId)
        .gte('completed_at', dateRange.start.toISOString())
        .lte('completed_at', dateRange.end.toISOString());

      if (habitIds && habitIds.length > 0) {
        query = query.in('habit_id', habitIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by date
      const grouped: Record<string, number> = {};
      data?.forEach((completion) => {
        const date = completion.completed_at.split('T')[0];
        grouped[date] = (grouped[date] || 0) + 1;
      });

      return grouped;
    },
    enabled: !!userId,
  });

  const calendarData = useMemo(() => {
    const days = eachDayOfInterval(dateRange);
    return days.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const count = completionData?.[dateStr] || 0;
      return { date: day, dateStr, count };
    });
  }, [dateRange, completionData]);

  const getIntensityClass = (count: number) => {
    if (count === 0) return 'bg-white/5 hover:bg-white/10';
    if (count === 1) return 'bg-habit-positive/20 hover:bg-habit-positive/30';
    if (count === 2) return 'bg-habit-positive/40 hover:bg-habit-positive/50';
    if (count === 3) return 'bg-habit-positive/60 hover:bg-habit-positive/70';
    return 'bg-habit-positive hover:bg-habit-positive/90';
  };

  // Group days by week
  const weekGroups = useMemo(() => {
    const weeks: typeof calendarData[] = [];
    let currentWeek: typeof calendarData = [];
    
    calendarData.forEach((day, index) => {
      currentWeek.push(day);
      if (day.date.getDay() === 6 || index === calendarData.length - 1) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    });
    
    return weeks;
  }, [calendarData]);

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  const maxCount = Math.max(...calendarData.map(d => d.count), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Годовая активность</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Меньше</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-white/5" />
            <div className="w-3 h-3 rounded-sm bg-habit-positive/20" />
            <div className="w-3 h-3 rounded-sm bg-habit-positive/40" />
            <div className="w-3 h-3 rounded-sm bg-habit-positive/60" />
            <div className="w-3 h-3 rounded-sm bg-habit-positive" />
          </div>
          <span>Больше</span>
        </div>
      </div>

      <TooltipProvider>
        <div className="overflow-x-auto pb-4">
          <div className="inline-flex gap-1">
            {weekGroups.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day) => (
                  <Tooltip key={day.dateStr}>
                    <TooltipTrigger asChild>
                      <div
                        className={`w-3 h-3 rounded-sm transition-all cursor-pointer ${getIntensityClass(day.count)} ${
                          isToday(day.date) ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''
                        }`}
                      />
                    </TooltipTrigger>
                    <TooltipContent className="glass-strong border-white/20">
                      <div className="text-xs space-y-1">
                        <div className="font-semibold">
                          {format(day.date, 'd MMMM yyyy', { locale: ru })}
                        </div>
                        <div className="text-muted-foreground">
                          {day.count === 0 ? 'Нет выполнений' : `${day.count} ${day.count === 1 ? 'выполнение' : 'выполнений'}`}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            ))}
          </div>
        </div>
      </TooltipProvider>

      {maxCount > 0 && (
        <div className="text-sm text-muted-foreground">
          Максимум выполнений в день: <span className="font-semibold text-foreground">{maxCount}</span>
        </div>
      )}
    </div>
  );
}

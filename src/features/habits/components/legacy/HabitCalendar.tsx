import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek } from "date-fns";

interface HabitCalendarProps {
  completions: Array<{
    completed_at: string;
  }>;
  currentMonth?: Date;
}

export function HabitCalendar({ completions, currentMonth = new Date() }: HabitCalendarProps) {
  const { t } = useTranslation('common');
  
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const completionDates = useMemo(() => {
    return completions.map(c => new Date(c.completed_at));
  }, [completions]);

  const isCompleted = (day: Date) => {
    return completionDates.some(d => isSameDay(d, day));
  };

  const weekDays = [
    t('dayNamesShort.mon'),
    t('dayNamesShort.tue'),
    t('dayNamesShort.wed'),
    t('dayNamesShort.thu'),
    t('dayNamesShort.fri'),
    t('dayNamesShort.sat'),
    t('dayNamesShort.sun')
  ];

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-center mb-2">
        {format(currentMonth, 'MMMM yyyy')}
      </div>
      
      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map((day, idx) => (
          <div key={idx} className="text-xs text-muted-foreground text-center">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => {
          const completed = isCompleted(day);
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
          
          return (
            <div
              key={idx}
              className={`
                aspect-square rounded flex items-center justify-center text-xs
                transition-all duration-200
                ${completed 
                  ? 'bg-gradient-to-br from-habit-positive/40 to-habit-positive/20 border border-habit-positive/50 shadow-glow-positive' 
                  : 'bg-white/5 border border-white/10'
                }
                ${!isCurrentMonth ? 'opacity-30' : ''}
                hover:scale-110 hover:z-10
              `}
            >
              {format(day, 'd')}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mt-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-habit-positive/40 to-habit-positive/20 border border-habit-positive/50" />
          <span>{t('calendar.completed')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-white/5 border border-white/10" />
          <span>{t('calendar.missed')}</span>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { groupHabitsByHour, formatHour, getHourGradient, getCurrentTime } from '@/lib/timeline-utils';
import { cn } from '@/lib/utils';

interface TimelineViewProps {
  habits: any[];
  onHabitClick: (habit: any) => void;
}

export function TimelineView({ habits, onHabitClick }: TimelineViewProps) {
  const { t, i18n } = useTranslation('habits');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(getCurrentTime());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const habitsByHour = useMemo(() => 
    groupHabitsByHour(habits),
    [habits]
  );

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const isTodayDate = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const dateLocale = i18n.language === 'ru' ? ru : enUS;

  return (
    <div className="flex flex-col h-full">
      {/* Date Picker Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSelectedDate(subDays(selectedDate, 1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">
            {isTodayDate ? t('timeline.today') : format(selectedDate, 'MMMM d, yyyy', { locale: dateLocale })}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          disabled={isTodayDate}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Timeline */}
      <ScrollArea className="flex-1">
        <div className="relative p-4 space-y-2">
          {hours.map(hour => {
            const isCurrentHour = isTodayDate && hour === currentTime.hour;
            const habitsAtHour = habitsByHour[hour] || [];

            return (
              <div
                key={hour}
                className={cn(
                  'relative min-h-[80px] rounded-lg border transition-all',
                  'bg-gradient-to-r',
                  getHourGradient(hour),
                  isCurrentHour && 'border-primary ring-2 ring-primary/20'
                )}
              >
                {/* Hour Label */}
                <div className="absolute left-2 top-2 flex items-center gap-2">
                  <span className={cn(
                    'text-sm font-semibold',
                    isCurrentHour ? 'text-primary' : 'text-muted-foreground'
                  )}>
                    {formatHour(hour)}
                  </span>
                  {isCurrentHour && (
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                </div>

                {/* Habits at this hour */}
                <div className="pl-20 pr-4 py-2 space-y-2">
                  {habitsAtHour.length > 0 ? (
                    habitsAtHour.map(habit => (
                      <button
                        key={habit.id}
                        onClick={() => onHabitClick(habit)}
                        className={cn(
                          'w-full p-3 rounded-md text-left transition-all',
                          'bg-card/80 hover:bg-card border border-border/50',
                          'hover:shadow-md hover:scale-[1.02]'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {habit.icon && (
                            <span className="text-xl">{habit.icon}</span>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{habit.name}</div>
                            {habit.estimated_duration && (
                              <div className="text-xs text-muted-foreground">
                                {habit.estimated_duration} min
                              </div>
                            )}
                          </div>
                          {habit.current_streak > 0 && (
                            <div className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                              🔥 {habit.current_streak}
                            </div>
                          )}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground/50 italic py-4">
                      {t('timeline.noHabits', 'No scheduled habits')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

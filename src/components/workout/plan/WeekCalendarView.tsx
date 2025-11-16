import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckCircle2, Flame, Circle, Moon } from "lucide-react";

interface DayStatus {
  day: number;
  dayName: string;
  status: 'completed' | 'today' | 'upcoming' | 'rest';
  hasWorkout: boolean;
}

interface WeekCalendarViewProps {
  currentWeek: number;
  totalWeeks: number;
  days: DayStatus[];
  completionPercentage: number;
}

const dayIcons = {
  completed: CheckCircle2,
  today: Flame,
  upcoming: Circle,
  rest: Moon,
};

const dayColors = {
  completed: 'text-success',
  today: 'text-warning',
  upcoming: 'text-primary',
  rest: 'text-muted-foreground',
};

const dayBgColors = {
  completed: 'bg-success/10 border-success/30',
  today: 'bg-warning/10 border-warning/30 animate-pulse',
  upcoming: 'bg-primary/10 border-primary/30',
  rest: 'bg-muted/10 border-muted/30',
};

export function WeekCalendarView({
  currentWeek,
  totalWeeks,
  days,
  completionPercentage,
}: WeekCalendarViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="glass-card p-4 rounded-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Неделя {currentWeek} из {totalWeeks}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {Math.round(completionPercentage)}% выполнено
          </p>
        </div>
        
        {/* Progress dots */}
        <div className="flex gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                i < Math.floor(completionPercentage / 14.28) 
                  ? "bg-primary" 
                  : "bg-muted/30"
              )}
            />
          ))}
        </div>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => {
          const Icon = dayIcons[day.status];
          
          return (
            <motion.div
              key={day.day}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all",
                dayBgColors[day.status],
                day.status === 'today' && "ring-2 ring-warning/50"
              )}
            >
              <span className="text-xs font-medium text-muted-foreground">
                {day.dayName}
              </span>
              <Icon className={cn("w-6 h-6", dayColors[day.status])} />
              <span className="text-[10px] text-muted-foreground">
                {day.status === 'completed' && 'Готово'}
                {day.status === 'today' && 'Сегодня'}
                {day.status === 'upcoming' && day.hasWorkout ? 'Ожидает' : ''}
                {day.status === 'rest' && 'Отдых'}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mt-4 space-y-2">
        <div className="h-2 bg-muted/20 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-primary to-success"
          />
        </div>
      </div>
    </motion.div>
  );
}

/**
 * WeeklyStrip - Motivational weekly calendar strip
 * Shows workout days with dots, current day highlighted
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { format, startOfWeek, addDays, isSameDay, isToday } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";

interface WeeklyStripProps {
  workoutDates: Date[];
  streak: number;
  onDayClick?: (date: Date) => void;
}

const dayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function WeeklyStrip({ workoutDates, streak, onDayClick }: WeeklyStripProps) {
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, []);

  const hasWorkout = (date: Date) => {
    return workoutDates.some(d => isSameDay(d, date));
  };

  return (
    <div className="bg-card/50 border-b border-border/50 px-4 py-3">
      {/* Streak indicator */}
      {streak > 1 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-1.5 mb-2"
        >
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium text-orange-500">
            {streak} дней подряд!
          </span>
        </motion.div>
      )}

      {/* Days strip */}
      <div className="flex justify-between items-center">
        {weekDays.map((date, index) => {
          const worked = hasWorkout(date);
          const today = isToday(date);
          const isPast = date < new Date() && !today;

          return (
            <motion.button
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onDayClick?.(date)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
                "min-w-[40px]",
                today && "bg-primary/10 ring-2 ring-primary/50",
                !today && "hover:bg-muted/50"
              )}
            >
              <span className={cn(
                "text-xs font-medium",
                today ? "text-primary" : "text-muted-foreground"
              )}>
                {dayLabels[index]}
              </span>
              
              <span className={cn(
                "text-sm font-bold",
                today ? "text-foreground" : "text-muted-foreground"
              )}>
                {format(date, "d")}
              </span>

              {/* Workout indicator dot */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: worked ? 1 : 0.5 }}
                className={cn(
                  "w-2 h-2 rounded-full",
                  worked 
                    ? "bg-gradient-to-r from-orange-500 to-red-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" 
                    : isPast 
                      ? "bg-muted-foreground/30" 
                      : "bg-transparent"
                )}
              />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

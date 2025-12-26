/**
 * DailyHabitRow - компактная строка привычки для ежедневных рутин
 */

import { motion } from 'framer-motion';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyHabitRowProps {
  habit: any;
  onComplete: (habitId: string) => void;
  isCompleting?: boolean;
}

// Icon mapping based on habit name keywords
const HABIT_EMOJIS: Record<string, string> = {
  'зарядк': '🏋️',
  'exercise': '🏋️',
  'workout': '💪',
  'тренировк': '💪',
  'чтени': '📚',
  'read': '📚',
  'book': '📖',
  'медитаци': '🧘',
  'meditat': '🧘',
  'вод': '💧',
  'water': '💧',
  'сон': '😴',
  'sleep': '😴',
  'walk': '🚶',
  'прогулк': '🚶',
  'vitamin': '💊',
  'витамин': '💊',
  'journal': '📝',
  'дневник': '📝',
  'stretch': '🤸',
  'растяжк': '🤸',
};

function getHabitEmoji(habitName: string): string {
  const lowerName = habitName.toLowerCase();
  for (const [key, emoji] of Object.entries(HABIT_EMOJIS)) {
    if (lowerName.includes(key)) {
      return emoji;
    }
  }
  return '✨';
}

export function DailyHabitRow({ habit, onComplete, isCompleting }: DailyHabitRowProps) {
  const isCompleted = habit.completedToday;
  const emoji = getHabitEmoji(habit.name);

  const handleClick = () => {
    if (!isCompleted && !isCompleting) {
      onComplete(habit.id);
    }
  };

  return (
    <motion.div
      layout
      layoutId={habit.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ 
        opacity: isCompleted ? 0.5 : 1, 
        y: 0,
      }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ 
        duration: 0.2,
        layout: { duration: 0.3 }
      }}
      className={cn(
        "flex items-center justify-between h-12 px-4 rounded-xl",
        "bg-card/50 backdrop-blur-sm border border-border/30",
        "cursor-pointer transition-colors",
        !isCompleted && "hover:bg-card/70 active:bg-card/90",
        isCompleted && "pointer-events-none"
      )}
      onClick={handleClick}
      whileTap={!isCompleted ? { scale: 0.98 } : {}}
    >
      {/* Left: Icon and name */}
      <div className="flex items-center gap-3">
        <span className="text-lg">{emoji}</span>
        <span className={cn(
          "text-sm font-medium truncate max-w-[180px]",
          isCompleted && "line-through text-muted-foreground"
        )}>
          {habit.name}
        </span>
      </div>

      {/* Right: Checkbox */}
      <motion.button
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center",
          "border-2 transition-colors",
          isCompleted
            ? "bg-primary border-primary text-primary-foreground"
            : "border-muted-foreground/50 hover:border-primary"
        )}
        whileTap={{ scale: 0.8 }}
        disabled={isCompleting}
      >
        {isCompleted ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <Check className="w-3.5 h-3.5" />
          </motion.div>
        ) : (
          <Circle className="w-3.5 h-3.5 opacity-0" />
        )}
      </motion.button>
    </motion.div>
  );
}

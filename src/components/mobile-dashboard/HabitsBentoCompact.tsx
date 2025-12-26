import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHabitsQuery } from '@/features/habits';
import { useCompleteHabit } from '@/features/habits/hooks';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

// Emoji map for common habit types
const habitIcons: Record<string, string> = {
  'зарядка': '🏃',
  'exercise': '🏃',
  'workout': '💪',
  'meditation': '🧘',
  'медитация': '🧘',
  'reading': '📖',
  'чтение': '📖',
  'water': '💧',
  'вода': '💧',
  'sleep': '😴',
  'сон': '😴',
  'vitamins': '💊',
  'витамины': '💊',
  'supplements': '💊',
  'no smoking': '🚭',
  'бросить курить': '🚭',
  'no alcohol': '🍷',
  'не пью': '🍷',
  'weed': '🌿',
  'walk': '🚶',
  'прогулка': '🚶',
  'stretch': '🤸',
  'journal': '📝',
  'gratitude': '🙏',
  'cold shower': '🚿',
  'default': '✨',
};

function getHabitIcon(habitName: string): string {
  const nameLower = habitName.toLowerCase();
  for (const [key, icon] of Object.entries(habitIcons)) {
    if (nameLower.includes(key)) return icon;
  }
  return habitIcons.default;
}

export function HabitsBentoCompact() {
  const { data: habits = [] } = useHabitsQuery({ enabled: true });
  const { completeHabit, isCompleting } = useCompleteHabit();
  const [completingId, setCompletingId] = useState<string | null>(null);
  
  // Filter for incomplete habits today, take top 3
  const incompleteHabits = habits
    .filter(h => h.isActive !== false)
    .filter(h => !h.completedToday)
    .slice(0, 3);

  const handleComplete = async (habit: typeof habits[0]) => {
    setCompletingId(habit.id);
    try {
      await completeHabit(habit.id, {
        id: habit.id,
        name: habit.name,
        icon: habit.icon,
        xp_reward: habit.xpReward,
      });
    } finally {
      setTimeout(() => setCompletingId(null), 500);
    }
  };

  if (habits.length === 0) {
    return null;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.6 }}
      className="px-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">Today's Habits</h3>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" asChild>
          <Link to="/habits">
            All <ChevronRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </div>
      
      {incompleteHabits.length === 0 ? (
        <div className="flex items-center justify-center py-6 rounded-2xl bg-success/10 border border-success/20">
          <div className="flex items-center gap-2 text-success">
            <Check className="h-5 w-5" />
            <span className="font-medium">All habits completed!</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {incompleteHabits.map((habit, index) => {
            const isThisCompleting = completingId === habit.id;
            const icon = getHabitIcon(habit.name);
            
            return (
              <motion.button
                key={habit.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ 
                  opacity: isThisCompleting ? 0.5 : 1, 
                  scale: isThisCompleting ? 0.95 : 1 
                }}
                transition={{ delay: 0.7 + index * 0.1 }}
                onClick={() => handleComplete(habit)}
                disabled={isCompleting || isThisCompleting}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 p-3 rounded-xl",
                  "bg-card/50 border border-border/50",
                  "hover:bg-card hover:border-border active:scale-95",
                  "transition-all duration-200"
                )}
              >
                <span className="text-2xl">{icon}</span>
                <span className="text-xs text-muted-foreground truncate w-full text-center">
                  {habit.name.length > 10 ? habit.name.slice(0, 10) + '...' : habit.name}
                </span>
                {isThisCompleting && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-success/20 rounded-xl"
                  >
                    <Check className="h-6 w-6 text-success" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

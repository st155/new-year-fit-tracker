import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHabitsQuery } from '@/features/habits';
import { useCompleteHabit } from '@/features/habits/hooks';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { MiniProgressRing } from './MiniProgressRing';

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
  'fasting': '⏱️',
  'голодание': '⏱️',
  'default': '✨',
};

function getHabitIcon(habitName: string): string {
  const nameLower = habitName.toLowerCase();
  for (const [key, icon] of Object.entries(habitIcons)) {
    if (nameLower.includes(key)) return icon;
  }
  return habitIcons.default;
}

// Check if habit is fasting type
function isFastingHabit(habit: { name: string; habit_type?: string }): boolean {
  const name = habit.name.toLowerCase();
  return habit.habit_type === 'fasting' || 
    name.includes('fast') || 
    name.includes('голодан') ||
    name.includes('16:8') ||
    name.includes('18:6');
}

// Check if habit is abstinence/streak type
function isAbstinenceHabit(habit: { name: string; habit_type?: string }): boolean {
  const name = habit.name.toLowerCase();
  return habit.habit_type === 'duration_counter' ||
    name.includes('бросить') || 
    name.includes('no ') || 
    name.includes('без ') || 
    name.includes('quit') ||
    name.includes('weed') || 
    name.includes('alcohol') ||
    name.includes('не пью') ||
    name.includes('курить');
}

// Fasting timer component
function FastingWidget({ habit }: { habit: any }) {
  const [elapsed, setElapsed] = useState('--:--');
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    // Calculate from last eating window or habit start
    const startTime = habit.lastCompletedAt 
      ? new Date(habit.lastCompletedAt) 
      : new Date(new Date().setHours(20, 0, 0, 0)); // Default 8 PM
    
    const targetHours = 16; // Default 16:8
    
    const updateTimer = () => {
      const now = new Date();
      const diffMs = now.getTime() - startTime.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const hours = Math.floor(diffHours);
      const minutes = Math.floor((diffHours - hours) * 60);
      
      setElapsed(`${hours}h ${minutes}m`);
      setProgress(Math.min((diffHours / targetHours) * 100, 100));
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [habit.lastCompletedAt]);
  
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 relative">
      <div className="relative">
        <MiniProgressRing progress={progress} size={44} strokeWidth={3} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-bold text-foreground">{Math.round(progress)}%</span>
        </div>
      </div>
      <span className="text-xs font-semibold text-foreground">{elapsed}</span>
      <span className="text-[9px] text-muted-foreground">Fasting</span>
    </div>
  );
}

// Abstinence streak widget
function StreakWidget({ habit }: { habit: any }) {
  const streakDays = habit.currentStreak || habit.streak || 0;
  
  return (
    <div className="flex flex-col items-center justify-center gap-0">
      <span className="text-2xl font-bold text-success">{streakDays}</span>
      <span className="text-[10px] text-muted-foreground">Days</span>
      <span className="text-[9px] text-muted-foreground/70 truncate max-w-[60px]">
        {habit.name.length > 8 ? habit.name.slice(0, 8) + '…' : habit.name}
      </span>
    </div>
  );
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
            const isFasting = isFastingHabit(habit);
            const isAbstinence = isAbstinenceHabit(habit);
            
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
                  "relative flex flex-col items-center justify-center p-3 rounded-xl min-h-[80px]",
                  "bg-card/50 border border-border/50",
                  "hover:bg-card hover:border-border active:scale-95",
                  "transition-all duration-200"
                )}
              >
                {isFasting ? (
                  <FastingWidget habit={habit} />
                ) : isAbstinence ? (
                  <StreakWidget habit={habit} />
                ) : (
                  <>
                    <span className="text-2xl">{icon}</span>
                    <span className="text-xs text-muted-foreground truncate w-full text-center mt-1">
                      {habit.name.length > 10 ? habit.name.slice(0, 10) + '...' : habit.name}
                    </span>
                  </>
                )}
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

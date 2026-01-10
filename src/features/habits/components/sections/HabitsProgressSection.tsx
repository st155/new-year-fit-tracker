import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Award } from 'lucide-react';
import { HabitMiniChart } from '../charts/HabitMiniChart';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface HabitsProgressSectionProps {
  habits: any[];
  onHabitClick?: (habitId: string) => void;
}

export function HabitsProgressSection({ habits, onHabitClick }: HabitsProgressSectionProps) {
  // Get top 3 habits by completion rate
  const topHabits = useMemo(() => {
    // Guard against undefined/null habits array
    if (!Array.isArray(habits) || habits.length === 0) {
      return [];
    }
    
    return habits
      .filter(h => h?.stats && h.stats.total_completions > 3)
      .sort((a, b) => {
        const rateA = a?.stats?.completion_rate || 0;
        const rateB = b?.stats?.completion_rate || 0;
        return rateB - rateA;
      })
      .slice(0, 3);
  }, [habits]);

  const { t } = useTranslation('habits');
  
  if (topHabits.length === 0) {
    return null;
  }

  return (
    <Card className="glass-card mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          {t('progressSection.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {topHabits.map((habit, index) => (
          <motion.div
            key={habit.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "p-3 rounded-lg border bg-card/50 cursor-pointer transition-all hover:shadow-lg",
              index === 0 && "border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-transparent"
            )}
            onClick={() => onHabitClick?.(habit.id)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {index === 0 && (
                  <Award className="w-4 h-4 text-amber-500" />
                )}
                <div>
                  <h3 className="font-semibold text-sm">{habit.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {habit.category || t('progressSection.habitFallback')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-primary">
                  {Math.round(habit.stats?.completion_rate || 0)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {habit.stats?.total_completions || 0} {t('progressSection.times')}
                </p>
              </div>
            </div>

            {/* Mini chart */}
            <HabitMiniChart 
              completions={habit.completions || []}
              days={7}
            />

            {/* Stats row */}
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span>🔥</span>
                <span className="font-medium text-foreground">{habit.streak || 0}</span>
              </div>
              {habit.xp_reward && (
                <div className="flex items-center gap-1">
                  <span>⭐</span>
                  <span className="font-medium text-amber-500">+{habit.xp_reward}</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}

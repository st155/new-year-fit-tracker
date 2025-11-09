import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Flame, Trophy, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  gradient: string;
  delay: number;
}

function StatCard({ icon, label, value, gradient, delay }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className={`border-2 bg-gradient-to-br ${gradient} border-opacity-20`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-background/50 backdrop-blur-sm rounded-xl">
              {icon}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-3xl font-bold">{value}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function ProfileStats() {
  const { user } = useAuth();
  const { habits, isLoading: habitsLoading } = useHabits(user?.id);

  // Fetch goals count
  const { data: goalsCount = 0, isLoading: goalsLoading } = useQuery({
    queryKey: ['profile-goals-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count } = await supabase
        .from('goals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      return count || 0;
    },
    enabled: !!user?.id,
  });

  // Calculate stats from habits
  const habitsCompleted = habits?.filter(h => h.completed_today).length || 0;
  const totalHabits = habits?.length || 0;
  const longestStreak = habits?.reduce((max, h) => {
    const streak = (h as any).current_streak || (h as any).streak || 0;
    return Math.max(max, streak);
  }, 0) || 0;

  const isLoading = habitsLoading || goalsLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={<Target className="h-6 w-6 text-blue-500" />}
        label="Активных привычек"
        value={totalHabits}
        gradient="from-blue-500/5 to-cyan-500/5"
        delay={0}
      />
      <StatCard
        icon={<Flame className="h-6 w-6 text-orange-500" />}
        label="Самая длинная серия"
        value={`${longestStreak} дн.`}
        gradient="from-orange-500/5 to-red-500/5"
        delay={0.1}
      />
      <StatCard
        icon={<Trophy className="h-6 w-6 text-yellow-500" />}
        label="Целей создано"
        value={goalsCount}
        gradient="from-yellow-500/5 to-orange-500/5"
        delay={0.2}
      />
      <StatCard
        icon={<TrendingUp className="h-6 w-6 text-green-500" />}
        label="Выполнено сегодня"
        value={`${habitsCompleted}/${totalHabits}`}
        gradient="from-green-500/5 to-emerald-500/5"
        delay={0.3}
      />
    </div>
  );
}

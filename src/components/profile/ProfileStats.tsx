import { Card, CardContent } from '@/components/ui/card';
import { Target, Flame, Trophy, Dumbbell, BarChart3, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

interface ProfileStatsProps {
  habitsCount: number;
  workoutsCount: number;
  goalsCount: number;
  metricsCount: number;
  streakDays: number;
  isLoading?: boolean;
}

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
      <Card className={`border-2 bg-gradient-to-br ${gradient} border-opacity-20 hover:scale-[1.02] transition-transform`}>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-background/50 backdrop-blur-sm rounded-xl">
              {icon}
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
              <p className="text-2xl sm:text-3xl font-bold">{value}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function ProfileStats({ 
  habitsCount, 
  workoutsCount, 
  goalsCount, 
  metricsCount, 
  streakDays,
  isLoading 
}: ProfileStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24 sm:h-28" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      <StatCard
        icon={<Target className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />}
        label="Привычек"
        value={habitsCount}
        gradient="from-blue-500/5 to-cyan-500/5 border-blue-500/20"
        delay={0}
      />
      <StatCard
        icon={<Dumbbell className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />}
        label="Тренировок"
        value={workoutsCount}
        gradient="from-purple-500/5 to-pink-500/5 border-purple-500/20"
        delay={0.05}
      />
      <StatCard
        icon={<Flame className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />}
        label="Дней подряд"
        value={streakDays}
        gradient="from-orange-500/5 to-red-500/5 border-orange-500/20"
        delay={0.1}
      />
      <StatCard
        icon={<Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />}
        label="Целей"
        value={goalsCount}
        gradient="from-yellow-500/5 to-orange-500/5 border-yellow-500/20"
        delay={0.15}
      />
      <StatCard
        icon={<BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />}
        label="Метрик"
        value={metricsCount.toLocaleString('ru-RU')}
        gradient="from-green-500/5 to-emerald-500/5 border-green-500/20"
        delay={0.2}
      />
    </div>
  );
}

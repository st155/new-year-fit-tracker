import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Dumbbell, Clock, Package } from 'lucide-react';
import { useWorkoutStats } from '@/hooks/useWorkoutStats';
import { cn } from '@/lib/utils';

interface StatsDashboardCardProps {
  period?: 'week' | 'month' | 'all';
  onPeriodChange?: (period: 'week' | 'month' | 'all') => void;
}

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (current) => Math.round(current).toLocaleString());
  const [displayValue, setDisplayValue] = useState('0');

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsubscribe = display.on('change', (latest) => {
      setDisplayValue(latest);
    });
    return () => unsubscribe();
  }, [display]);

  return (
    <span className="tabular-nums">
      {displayValue}{suffix}
    </span>
  );
}

export function StatsDashboardCard({ period = 'all', onPeriodChange }: StatsDashboardCardProps) {
  const { data: stats, isLoading } = useWorkoutStats(period);

  const statCards = [
    {
      icon: Flame,
      label: 'Серия',
      value: stats?.streak || 0,
      suffix: ' дней',
      gradient: 'from-orange-500 to-red-500',
      glow: 'hover:shadow-[0_0_20px_rgba(249,115,22,0.4)]',
    },
    {
      icon: Dumbbell,
      label: 'Тренировок',
      value: stats?.totalWorkouts || 0,
      suffix: '',
      gradient: 'from-purple-500 to-pink-500',
      glow: 'hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]',
    },
    {
      icon: Clock,
      label: 'Время',
      value: stats ? Math.round(stats.totalMinutes / 60) : 0,
      suffix: ' ч',
      gradient: 'from-cyan-500 to-blue-500',
      glow: 'hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]',
    },
    {
      icon: Package,
      label: 'Объем',
      value: stats ? Math.round(stats.totalVolume / 1000) : 0,
      suffix: ' т',
      gradient: 'from-green-500 to-emerald-500',
      glow: 'hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]',
    },
  ];

  const periods: Array<{ value: 'week' | 'month' | 'all'; label: string }> = [
    { value: 'week', label: 'Неделя' },
    { value: 'month', label: 'Месяц' },
    { value: 'all', label: 'Все время' },
  ];

  if (isLoading) {
    return (
      <Card className="glass-card border-border/50">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-muted rounded-xl" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="glass-card border-border/50 overflow-hidden">
        <CardContent className="p-6 space-y-6">
          {/* Period selector */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Статистика</h3>
            <div className="flex gap-2">
              {periods.map((p) => (
                <Badge
                  key={p.value}
                  variant={period === p.value ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer transition-all',
                    period === p.value && 'bg-gradient-to-r from-cyan-500 to-purple-500'
                  )}
                  onClick={() => onPeriodChange?.(p.value)}
                >
                  {p.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="relative"
              >
                <Card
                  className={cn(
                    'glass-card border-border/50 overflow-hidden transition-all duration-300',
                    stat.glow
                  )}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={cn('p-2 rounded-lg bg-gradient-to-br', stat.gradient)}>
                        <stat.icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                    </div>
                    <div className="text-2xl font-bold">
                      <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

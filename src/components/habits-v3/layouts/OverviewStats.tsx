import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Target, Flame, Trophy, TrendingUp } from 'lucide-react';
import { CircularProgress } from '@/components/ui/circular-progress';
import { SparklineChart } from '@/components/habits-v3/charts/SparklineChart';
import { motion } from 'framer-motion';

interface OverviewStatsProps {
  todayCompleted: number;
  todayTotal: number;
  weekStreak: number;
  totalXP: number;
  level?: number;
  weekTrend?: number; // percentage change from last week
  weekData?: number[]; // completion counts for last 7 days
  xpData?: number[]; // XP earned for last 7 days
}

export function OverviewStats({
  todayCompleted,
  todayTotal,
  weekStreak,
  totalXP,
  level = 1,
  weekTrend = 0,
  weekData = [3, 4, 2, 5, 4, 3, todayCompleted],
  xpData = [120, 150, 80, 200, 150, 120, 180]
}: OverviewStatsProps) {
  const todayProgress = todayTotal > 0 ? (todayCompleted / todayTotal) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Today's Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
      >
        <Card className="glass-card hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Сегодня</p>
                <p className="text-3xl font-bold">
                  {todayCompleted}<span className="text-muted-foreground">/{todayTotal}</span>
                </p>
              </div>
              <CircularProgress 
                value={todayProgress} 
                size={60} 
                strokeWidth={6}
                showValue={false}
              />
            </div>
            
            {/* Mini sparkline */}
            <div className="mb-2">
              <SparklineChart data={weekData} height={30} />
            </div>
            
            <p className="text-xs text-muted-foreground">
              {Math.round(todayProgress)}% выполнено
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Week Streak */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="glass-card hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Серия</p>
                <div className="flex items-center gap-2">
                  <Flame className="w-7 h-7 text-orange-500 animate-pulse" />
                  <p className="text-3xl font-bold">{weekStreak}</p>
                </div>
              </div>
              {weekTrend !== 0 && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    "flex items-center gap-1 text-xs px-2 py-1 rounded-full",
                    weekTrend > 0 ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                  )}
                >
                  <TrendingUp className={cn(
                    "w-3 h-3",
                    weekTrend < 0 && "rotate-180"
                  )} />
                  {Math.abs(weekTrend)}%
                </motion.div>
              )}
            </div>
            
            {/* Streak progress bar */}
            <div className="mb-2">
              <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((weekStreak / 30) * 100, 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground">
              {weekStreak > 0 
                ? `До ${weekStreak < 7 ? '7' : weekStreak < 30 ? '30' : '100'} дней: ${weekStreak < 7 ? 7 - weekStreak : weekStreak < 30 ? 30 - weekStreak : 100 - weekStreak}`
                : 'Начните серию'}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Total XP & Level */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass-card hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Опыт</p>
                <div className="flex items-center gap-2">
                  <Trophy className="w-7 h-7 text-amber-500" />
                  <p className="text-3xl font-bold">{totalXP.toLocaleString()}</p>
                </div>
              </div>
              <motion.div 
                className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-500 text-sm font-bold"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                LVL {level}
              </motion.div>
            </div>
            
            {/* XP sparkline */}
            <div className="mb-2">
              <SparklineChart 
                data={xpData} 
                height={30}
                color="hsl(38, 92%, 50%)"
              />
            </div>
            
            <div className="space-y-1">
              <Progress 
                value={((totalXP % 1000) / 1000) * 100} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                {totalXP % 1000}/1000 до уровня {level + 1}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

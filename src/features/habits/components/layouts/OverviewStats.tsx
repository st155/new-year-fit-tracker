import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Target, Flame, Trophy, TrendingUp } from 'lucide-react';
import { CircularProgress } from '@/components/ui/circular-progress';
import { SparklineChart } from '../charts/SparklineChart';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('habits');
  const todayProgress = todayTotal > 0 ? (todayCompleted / todayTotal) * 100 : 0;

  const getStreakText = () => {
    if (weekStreak <= 0) return t('overviewStats.startStreak');
    const target = weekStreak < 7 ? 7 : weekStreak < 30 ? 30 : 100;
    const remaining = target - weekStreak;
    return t('overviewStats.daysTo', { target, remaining });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Today's Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
      >
        <Card className="glass-card hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-cyan-500/10 to-blue-500/5">
          <CardContent className="p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">{t('overviewStats.today')}</p>
                <p className="text-2xl font-bold">
                  {todayCompleted}<span className="text-muted-foreground text-lg">/{todayTotal}</span>
                </p>
              </div>
              <CircularProgress 
                value={todayProgress} 
                size={48} 
                strokeWidth={5}
                showValue={false}
              />
            </div>
            
            {/* Mini sparkline */}
            <div className="mb-1.5">
              <SparklineChart data={weekData} height={24} />
            </div>
            
            <p className="text-xs text-muted-foreground">
              {t('overviewStats.completed', { percent: Math.round(todayProgress) })}
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
        <Card className="glass-card hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-orange-500/10 to-red-500/5">
          <CardContent className="p-3">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('overviewStats.streak')}</p>
                <div className="flex items-center gap-2">
                  <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
                  <p className="text-2xl font-bold">{weekStreak}</p>
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
            <div className="mb-1.5">
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
              {getStreakText()}
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
        <Card className="glass-card hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-amber-500/10 to-orange-500/5">
          <CardContent className="p-3">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('overviewStats.xp')}</p>
                <div className="flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-amber-500" />
                  <p className="text-2xl font-bold">{totalXP.toLocaleString()}</p>
                </div>
              </div>
              <motion.div 
                className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-500 text-xs font-bold"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                LVL {level}
              </motion.div>
            </div>
            
            {/* XP sparkline */}
            <div className="mb-1.5">
              <SparklineChart 
                data={xpData} 
                height={24}
                color="hsl(38, 92%, 50%)"
              />
            </div>
            
            <div className="space-y-1">
              <Progress 
                value={((totalXP % 1000) / 1000) * 100} 
                className="h-1.5"
              />
              <p className="text-xs text-muted-foreground">
                {t('overviewStats.toLevel', { current: totalXP % 1000, next: level + 1 })}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

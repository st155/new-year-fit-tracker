import { motion } from "framer-motion";
import { FitnessCard } from "@/components/ui/fitness-card";
import { CircularProgress } from "@/components/ui/circular-progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, Zap, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

interface WorkoutPlanHeroCardProps {
  planName: string;
  currentWeek: number;
  totalWeeks: number;
  completionPercentage: number;
  totalWorkouts: number;
  completedWorkouts: number;
  nextWorkout?: string;
  isAiGenerated?: boolean;
  onStartToday?: () => void;
  onViewStats?: () => void;
}

export function WorkoutPlanHeroCard({
  planName,
  currentWeek,
  totalWeeks,
  completionPercentage,
  totalWorkouts,
  completedWorkouts,
  nextWorkout,
  isAiGenerated = false,
  onStartToday,
  onViewStats,
}: WorkoutPlanHeroCardProps) {
  const { t } = useTranslation('workouts');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <FitnessCard variant="gradient" className="overflow-hidden">
        <div className="relative p-6 md:p-8">
          {/* Background gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
          
          <div className="relative z-10 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl md:text-3xl font-bold">{planName}</h2>
                  {isAiGenerated && (
                    <Badge variant="outline" className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
                      <Zap className="w-3 h-3 mr-1" />
                      AI Generated
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">
                  {t('planHero.weekOfTotal', { current: currentWeek, total: totalWeeks })}
                </p>
              </div>
              
              {/* Circular Progress */}
              <CircularProgress
                value={completionPercentage}
                size={100}
                strokeWidth={8}
                color="hsl(var(--primary))"
              />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="glass-card p-4 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{t('planHero.workouts')}</span>
                </div>
                <p className="text-2xl font-bold">
                  {completedWorkouts}/{totalWorkouts}
                </p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                className="glass-card p-4 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-xs text-muted-foreground">{t('planHero.progress')}</span>
                </div>
                <p className="text-2xl font-bold">{Math.round(completionPercentage)}%</p>
              </motion.div>

              {nextWorkout && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="glass-card p-4 rounded-lg col-span-2 md:col-span-1"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-warning" />
                    <span className="text-xs text-muted-foreground">{t('planHero.next')}</span>
                  </div>
                  <p className="text-sm font-semibold truncate">{nextWorkout}</p>
                </motion.div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {onStartToday && (
                <Button
                  onClick={onStartToday}
                  className="flex-1 min-w-[200px] animate-pulse hover:animate-none"
                  size="lg"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {t('planHero.startToday')}
                </Button>
              )}
              {onViewStats && (
                <Button
                  onClick={onViewStats}
                  variant="outline"
                  size="lg"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  {t('planHero.statistics')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </FitnessCard>
    </motion.div>
  );
}

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";
import { Activity, Heart, Zap, TrendingUp, Footprints, Target, Moon, HeartPulse, Flame, Award } from "lucide-react";
import type { PointsBreakdown } from "@/features/challenges/types";

interface PointsBreakdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  breakdown: PointsBreakdown;
  totalPoints: number;
}

export function PointsBreakdownDialog({
  open,
  onOpenChange,
  breakdown,
  totalPoints,
}: PointsBreakdownDialogProps) {
  const { t } = useTranslation('challenges');
  
  // Safe access with defaults
  const activity = breakdown?.activity || { calories: 0, steps: 0, strain: 0, workouts: 0, total: 0 };
  const recovery = breakdown?.recovery || { hrv: 0, recovery_quality: 0, resting_hr: 0, sleep_duration: 0, sleep_efficiency: 0, total: 0 };
  const progress = breakdown?.progress || { active_days: 0, consistency: 0, goals: 0, streak: 0, total: 0 };
  const balance = breakdown?.balance || { harmony: 0, performance: 0, recovery: 0, synergy: 0, total: 0 };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            {t('pointsBreakdown.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Total Score */}
          <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border-2 border-primary/20">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary mb-2">
                {totalPoints}
              </div>
              <div className="text-sm text-muted-foreground">{t('pointsBreakdown.totalPoints')}</div>
              <Progress value={(totalPoints / 1000) * 100} className="mt-4 h-3" />
            </div>
          </div>

          {/* Activity Score */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-semibold">{t('pointsBreakdown.sections.activity')}</h3>
              </div>
              <span className="text-xl font-bold text-orange-500">
                {activity.total} / 300
              </span>
            </div>

            <div className="space-y-2 pl-7">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>{t('pointsBreakdown.metrics.strain')}</span>
                </div>
                <span className="font-medium">{activity.strain} / 100</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Footprints className="h-4 w-4" />
                  <span>{t('pointsBreakdown.metrics.steps')}</span>
                </div>
                <span className="font-medium">{activity.steps} / 75</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4" />
                  <span>{t('pointsBreakdown.metrics.calories')}</span>
                </div>
                <span className="font-medium">{activity.calories} / 75</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <span>{t('pointsBreakdown.metrics.workouts')}</span>
                </div>
                <span className="font-medium">{activity.workouts} / 50</span>
              </div>
            </div>
          </div>

          {/* Recovery Score */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-green-500" />
                <h3 className="text-lg font-semibold">{t('pointsBreakdown.sections.recovery')}</h3>
              </div>
              <span className="text-xl font-bold text-green-500">
                {recovery.total} / 300
              </span>
            </div>

            <div className="space-y-2 pl-7">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  <span>{t('pointsBreakdown.metrics.recoveryQuality')}</span>
                </div>
                <span className="font-medium">{recovery.recovery_quality} / 100</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  <span>{t('pointsBreakdown.metrics.sleepDuration')}</span>
                </div>
                <span className="font-medium">{recovery.sleep_duration} / 75</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span>{t('pointsBreakdown.metrics.sleepEfficiency')}</span>
                </div>
                <span className="font-medium">{recovery.sleep_efficiency} / 50</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <HeartPulse className="h-4 w-4" />
                  <span>{t('pointsBreakdown.metrics.hrv')}</span>
                </div>
                <span className="font-medium">{recovery.hrv} / 50</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <HeartPulse className="h-4 w-4" />
                  <span>{t('pointsBreakdown.metrics.restingHr')}</span>
                </div>
                <span className="font-medium">{recovery.resting_hr} / 25</span>
              </div>
            </div>
          </div>

          {/* Progress Score */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold">{t('pointsBreakdown.sections.progress')}</h3>
              </div>
              <span className="text-xl font-bold text-blue-500">
                {progress.total} / 200
              </span>
            </div>

            <div className="space-y-2 pl-7">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <span>{t('pointsBreakdown.metrics.activeDays')}</span>
                </div>
                <span className="font-medium">{progress.active_days} / 75</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span>{t('pointsBreakdown.metrics.consistency')}</span>
                </div>
                <span className="font-medium">{progress.consistency} / 50</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4" />
                  <span>{t('pointsBreakdown.metrics.streak')}</span>
                </div>
                <span className="font-medium">{progress.streak} / 50</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  <span>{t('pointsBreakdown.metrics.goals')}</span>
                </div>
                <span className="font-medium">{progress.goals} / 25</span>
              </div>
            </div>
          </div>

          {/* Balance Bonus */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-500" />
                <h3 className="text-lg font-semibold">{t('pointsBreakdown.sections.balance')}</h3>
              </div>
              <span className="text-xl font-bold text-purple-500">
                {balance.total} / 200
              </span>
            </div>

            <div className="space-y-2 pl-7">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span>{t('pointsBreakdown.metrics.harmony')}</span>
                </div>
                <span className="font-medium">{balance.harmony} / 50</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <span>{t('pointsBreakdown.metrics.synergy')}</span>
                </div>
                <span className="font-medium">{balance.synergy} / 50</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>{t('pointsBreakdown.metrics.performance')}</span>
                </div>
                <span className="font-medium">{balance.performance} / 50</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  <span>{t('pointsBreakdown.metrics.recoveryBalance')}</span>
                </div>
                <span className="font-medium">{balance.recovery} / 50</span>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2 text-sm">{t('pointsBreakdown.tips.title')}</h4>
            <ul className="text-xs space-y-1 text-muted-foreground">
              {activity.total < 200 && (
                <li>• {t('pointsBreakdown.tips.activity')}</li>
              )}
              {recovery.total < 200 && (
                <li>• {t('pointsBreakdown.tips.recovery')}</li>
              )}
              {balance.harmony < 40 && (
                <li>• {t('pointsBreakdown.tips.balance')}</li>
              )}
              {progress.streak < 30 && (
                <li>• {t('pointsBreakdown.tips.streak')}</li>
              )}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Activity, Heart, Zap, TrendingUp, Footprints, Target, Moon, HeartPulse, Flame, Award } from "lucide-react";

interface PointsBreakdown {
  performance: {
    strain_score: number;
    activity_volume: number;
    consistency: number;
    total: number;
  };
  recovery: {
    recovery_quality: number;
    sleep_quality: number;
    heart_health: number;
    total: number;
  };
  synergy: {
    balance_bonus: number;
    streak_bonus: number;
    badge_bonus: number;
    total: number;
  };
}

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Points Breakdown
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Total Score */}
          <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border-2 border-primary/20">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary mb-2">
                {totalPoints}
              </div>
              <div className="text-sm text-muted-foreground">Total Points / 1000</div>
              <Progress value={(totalPoints / 1000) * 100} className="mt-4 h-3" />
            </div>
          </div>

          {/* Performance Score */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold">Performance Score</h3>
              </div>
              <span className="text-xl font-bold text-blue-500">
                {breakdown.performance.total} / 400
              </span>
            </div>

            <div className="space-y-2 pl-7">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>Strain Score</span>
                </div>
                <span className="font-medium">{breakdown.performance.strain_score} / 220</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Footprints className="h-4 w-4" />
                  <span>Activity Volume</span>
                </div>
                <span className="font-medium">{breakdown.performance.activity_volume} / 150</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span>Consistency</span>
                </div>
                <span className="font-medium">{breakdown.performance.consistency} / 50</span>
              </div>
            </div>
          </div>

          {/* Recovery Score */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-500" />
                <h3 className="text-lg font-semibold">Recovery Score</h3>
              </div>
              <span className="text-xl font-bold text-pink-500">
                {breakdown.recovery.total} / 400
              </span>
            </div>

            <div className="space-y-2 pl-7">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  <span>Recovery Quality</span>
                </div>
                <span className="font-medium">{breakdown.recovery.recovery_quality} / 200</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  <span>Sleep Quality</span>
                </div>
                <span className="font-medium">{breakdown.recovery.sleep_quality} / 150</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <HeartPulse className="h-4 w-4" />
                  <span>Heart Health</span>
                </div>
                <span className="font-medium">{breakdown.recovery.heart_health} / 50</span>
              </div>
            </div>
          </div>

          {/* Synergy Bonus */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <h3 className="text-lg font-semibold">Synergy Bonus</h3>
              </div>
              <span className="text-xl font-bold text-yellow-500">
                {breakdown.synergy.total} / 200
              </span>
            </div>

            <div className="space-y-2 pl-7">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span>Strain-Recovery Balance</span>
                </div>
                <span className="font-medium">{breakdown.synergy.balance_bonus} / 100</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4" />
                  <span>Streak Bonus</span>
                </div>
                <span className="font-medium">{breakdown.synergy.streak_bonus} / 50</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  <span>Badge Bonus</span>
                </div>
                <span className="font-medium">{breakdown.synergy.badge_bonus} / 50</span>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2 text-sm">💡 Tips to Improve</h4>
            <ul className="text-xs space-y-1 text-muted-foreground">
              {breakdown.performance.total < 300 && (
                <li>• Increase your weekly strain and activity volume for more performance points</li>
              )}
              {breakdown.recovery.total < 300 && (
                <li>• Focus on sleep quality and recovery to boost your recovery score</li>
              )}
              {breakdown.synergy.balance_bonus < 80 && (
                <li>• Balance your training intensity with adequate recovery time</li>
              )}
              {breakdown.synergy.streak_bonus < 40 && (
                <li>• Maintain daily activity to build your streak bonus</li>
              )}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

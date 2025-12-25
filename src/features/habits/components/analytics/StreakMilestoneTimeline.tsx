import { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  STREAK_MILESTONES,
  getCurrentMilestone,
  getNextMilestone,
  getProgressToNextMilestone,
} from '@/lib/gamification/streak-rewards';

interface StreakMilestoneTimelineProps {
  currentStreak: number;
}

export function StreakMilestoneTimeline({ currentStreak }: StreakMilestoneTimelineProps) {
  const currentMilestone = getCurrentMilestone(currentStreak);
  const nextMilestone = getNextMilestone(currentStreak);
  const progress = getProgressToNextMilestone(currentStreak);

  const milestones = useMemo(() => {
    return STREAK_MILESTONES.map(milestone => ({
      ...milestone,
      achieved: currentStreak >= milestone.days,
      isCurrent: currentMilestone?.days === milestone.days,
      isNext: nextMilestone?.days === milestone.days,
    }));
  }, [currentStreak, currentMilestone, nextMilestone]);

  return (
    <div className="space-y-6">
      {/* Progress to next milestone */}
      {nextMilestone && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Current: <span className="font-semibold text-foreground">{currentStreak} days</span>
            </span>
            <span className="text-muted-foreground">
              Next: <span className="font-semibold text-foreground">{nextMilestone.title}</span> ({nextMilestone.days} days)
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="text-xs text-center text-muted-foreground">
            {nextMilestone.days - currentStreak} days to go · {progress}% complete
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        <div className="flex items-center justify-between">
          {milestones.map((milestone, index) => (
            <div key={milestone.days} className="flex flex-col items-center gap-2 relative">
              {/* Connecting line */}
              {index < milestones.length - 1 && (
                <div
                  className={cn(
                    'absolute left-1/2 top-5 h-0.5 w-full',
                    milestone.achieved ? 'bg-primary' : 'bg-muted'
                  )}
                  style={{ transform: 'translateX(50%)' }}
                />
              )}

              {/* Circle */}
              <div
                className={cn(
                  'relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                  milestone.achieved
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'bg-background border-muted text-muted-foreground',
                  milestone.isCurrent && 'ring-4 ring-primary/20 scale-110',
                  milestone.isNext && 'ring-2 ring-primary/30'
                )}
              >
                {milestone.achieved ? (
                  <Trophy className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-semibold">{milestone.badge}</span>
                )}
              </div>

              {/* Label */}
              <div className="text-center w-16">
                <div className="text-xs font-semibold">{milestone.days}d</div>
                <div
                  className={cn(
                    'text-[10px] line-clamp-2',
                    milestone.achieved ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {milestone.badge}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achieved milestones summary */}
      {currentMilestone && (
        <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="text-sm font-semibold text-primary">
            {currentMilestone.badge} {currentMilestone.title}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            +{currentMilestone.xp} XP earned
          </div>
        </div>
      )}

      {/* Max level reached */}
      {!nextMilestone && (
        <div className="text-center p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
          <div className="text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
            🌟 Maximum Streak Level Reached! 🌟
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            You've unlocked all streak milestones!
          </div>
        </div>
      )}
    </div>
  );
}

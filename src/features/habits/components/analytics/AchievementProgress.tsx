import { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getRarityColor, type AchievementDefinition } from '@/lib/gamification/achievement-definitions';

interface AchievementProgressItem {
  achievement: AchievementDefinition;
  progress: number;
  currentValue: number;
  targetValue: number;
}

interface AchievementProgressProps {
  items: AchievementProgressItem[];
  maxItems?: number;
}

export function AchievementProgress({ items, maxItems = 5 }: AchievementProgressProps) {
  // Filter to show only achievements with progress >= 40% and not yet completed
  const progressItems = useMemo(() => {
    return items
      .filter(item => item.progress >= 40 && item.progress < 100)
      .sort((a, b) => b.progress - a.progress)
      .slice(0, maxItems);
  }, [items, maxItems]);

  if (progressItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Trophy className="h-12 w-12 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No achievements close to unlocking</p>
        <p className="text-xs mt-1">Keep completing habits to make progress!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {progressItems.map((item) => (
        <div
          key={item.achievement.id}
          className="space-y-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="text-2xl">{item.achievement.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-sm truncate">
                  {item.achievement.name}
                </h4>
                <Badge
                  variant="outline"
                  className={cn('text-xs capitalize', getRarityColor(item.achievement.rarity))}
                >
                  {item.achievement.rarity}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {item.achievement.description}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {item.currentValue} / {item.targetValue}
              </span>
              <span className="font-semibold text-primary">
                {item.progress}%
              </span>
            </div>
            <Progress value={item.progress} className="h-2" />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {item.targetValue - item.currentValue} more to unlock
            </span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              +{item.achievement.xp_reward} XP
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

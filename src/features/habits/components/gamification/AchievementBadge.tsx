import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Lock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getRarityColor,
  getRarityBorderColor,
  getRarityGlow,
  type AchievementDefinition,
} from '@/lib/gamification/achievement-definitions';

interface AchievementBadgeProps {
  achievement: AchievementDefinition;
  unlocked?: boolean;
  unlockedAt?: string;
  progress?: number;
  onClick?: () => void;
}

export function AchievementBadge({
  achievement,
  unlocked = false,
  unlockedAt,
  progress = 0,
  onClick,
}: AchievementBadgeProps) {
  const progressPercent = Math.min(100, (progress / (achievement.requirement.value || 1)) * 100);
  
  return (
    <Card
      className={cn(
        'transition-all duration-300 hover:scale-105 cursor-pointer relative overflow-hidden',
        unlocked && 'border-2',
        unlocked && getRarityBorderColor(achievement.rarity),
        unlocked && achievement.rarity === 'legendary' && 'animate-pulse',
        unlocked && getRarityGlow(achievement.rarity)
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Icon and Rarity */}
        <div className="flex items-start justify-between">
          <div
            className={cn(
              'text-4xl flex items-center justify-center h-16 w-16 rounded-full',
              unlocked ? 'bg-primary/10' : 'bg-muted'
            )}
          >
            {unlocked ? achievement.icon : <Lock className="h-6 w-6 text-muted-foreground" />}
          </div>
          <Badge
            variant="outline"
            className={cn('text-xs capitalize', getRarityColor(achievement.rarity))}
          >
            {achievement.rarity}
          </Badge>
        </div>

        {/* Title and Description */}
        <div>
          <h3
            className={cn(
              'font-bold text-base mb-1',
              !unlocked && 'text-muted-foreground'
            )}
          >
            {achievement.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {achievement.description}
          </p>
        </div>

        {/* Progress for locked achievements */}
        {!unlocked && progress > 0 && (
          <div className="space-y-1">
            <Progress value={progressPercent} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Прогресс</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
          </div>
        )}

        {/* Unlocked Status */}
        {unlocked && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-primary">
              <Check className="h-4 w-4" />
              <span className="font-medium">Разблокировано</span>
            </div>
            <div className="text-xs font-medium text-amber-600 dark:text-amber-400">
              +{achievement.xp_reward} XP
            </div>
          </div>
        )}

        {/* Unlock date */}
        {unlocked && unlockedAt && (
          <div className="text-xs text-muted-foreground text-center">
            {new Date(unlockedAt).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

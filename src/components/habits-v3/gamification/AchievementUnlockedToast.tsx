import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  getRarityColor,
  type AchievementDefinition,
} from '@/lib/gamification/achievement-definitions';
import { cn } from '@/lib/utils';

interface AchievementUnlockedToastProps {
  achievement: AchievementDefinition;
}

export function AchievementUnlockedToast({ achievement }: AchievementUnlockedToastProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-500" />
        <h3 className="font-bold text-base">Достижение разблокировано!</h3>
      </div>

      <div className="flex items-start gap-3">
        <div className="text-4xl flex items-center justify-center h-14 w-14 rounded-full bg-primary/10">
          {achievement.icon}
        </div>
        
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm">{achievement.name}</h4>
            <Badge
              variant="outline"
              className={cn('text-xs capitalize', getRarityColor(achievement.rarity))}
            >
              {achievement.rarity}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{achievement.description}</p>
        </div>
      </div>

      <div className="flex items-center justify-center pt-2 border-t border-border">
        <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
          +{achievement.xp_reward} XP
        </div>
      </div>
    </div>
  );
}

import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Sparkles } from 'lucide-react';
import { getLevelTitle, getLevelColor, getLevelRewards } from '@/lib/gamification/level-system';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';

interface LevelProgressBarProps {
  level: number;
  totalXP: number;
  xpToNext: number;
  progressPercent: number;
  compact?: boolean;
}

export function LevelProgressBar({
  level,
  totalXP,
  xpToNext,
  progressPercent,
  compact = false,
}: LevelProgressBarProps) {
  const { t } = useTranslation('gamification');
  const levelTitle = getLevelTitle(level);
  const levelGradient = getLevelColor(level);
  const rewards = getLevelRewards(level);

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br text-white text-sm font-bold',
                levelGradient
              )}>
                {level}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground">{levelTitle}</div>
                <Progress value={progressPercent} className="h-1" />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">{t('levelProgress.levelWithTitle', { level, title: levelTitle })}</p>
              <p className="text-xs text-muted-foreground">
                {t('levelProgress.xpToNextLevel', { xp: xpToNext })}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br text-white text-2xl font-bold shadow-lg',
            levelGradient
          )}>
            {level}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-foreground">{levelTitle}</h3>
              <Badge variant="outline" className="text-xs">
                {t('levelProgress.level', { level })}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('levelProgress.totalXP', { xp: totalXP.toLocaleString() })}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm text-muted-foreground">{t('levelProgress.toNext')}</div>
          <div className="text-xl font-bold text-primary">
            {t('levelProgress.xp', { xp: xpToNext.toLocaleString() })}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t('levelProgress.progress')}</span>
          <span>{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} className="h-3" />
      </div>

      {rewards.length > 0 && (
        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-foreground">{t('levelProgress.unlockedRewards')}</span>
          </div>
          <div className="space-y-1">
            {rewards.map((reward, index) => (
              <div key={index} className="text-xs text-muted-foreground flex items-center gap-1">
                <Trophy className="h-3 w-3" />
                {reward}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

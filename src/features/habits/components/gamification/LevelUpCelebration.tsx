import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getLevelTitle, getLevelColor, getLevelRewards } from '@/lib/gamification/level-system';
import { cn } from '@/lib/utils';

interface LevelUpCelebrationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newLevel: number;
}

export function LevelUpCelebration({ open, onOpenChange, newLevel }: LevelUpCelebrationProps) {
  const { t } = useTranslation('gamification');

  useEffect(() => {
    if (open) {
      // Trigger confetti
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      
      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FFD700', '#FFA500', '#FF4500'],
        });
        
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FFD700', '#FFA500', '#FF4500'],
        });
      }, 50);

      return () => clearInterval(interval);
    }
  }, [open]);

  const levelTitle = getLevelTitle(newLevel);
  const levelGradient = getLevelColor(newLevel);
  const rewards = getLevelRewards(newLevel);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="space-y-6 text-center py-6">
          {/* Level Badge */}
          <div className="flex justify-center">
            <div className={cn(
              'flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br text-white shadow-2xl animate-bounce',
              levelGradient
            )}>
              <div>
                <div className="text-4xl font-bold">{newLevel}</div>
                <div className="text-xs font-medium uppercase">{t('levelUp.level')}</div>
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-6 w-6 text-amber-500" />
              <h2 className="text-3xl font-bold text-foreground">{t('levelUp.title')}</h2>
              <Sparkles className="h-6 w-6 text-amber-500" />
            </div>
            <p className="text-xl font-medium text-muted-foreground">
              {t('levelUp.reached')} <span className="text-primary font-bold">{levelTitle}</span>
            </p>
          </div>

          {/* Rewards */}
          {rewards.length > 0 && (
            <div className="space-y-3 p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span>{t('levelUp.rewardsUnlocked')}</span>
              </div>
              <div className="space-y-1">
                {rewards.map((reward, index) => (
                  <div
                    key={index}
                    className="text-sm text-muted-foreground animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {reward}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Continue Button */}
          <Button
            onClick={() => onOpenChange(false)}
            size="lg"
            className="w-full"
          >
            {t('levelUp.continue')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

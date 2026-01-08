import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

interface GoalCelebrationProps {
  goalName: string;
  milestone?: 25 | 50 | 75 | 100;
  trigger: boolean;
}

export function GoalCelebration({ goalName, milestone = 100, trigger }: GoalCelebrationProps) {
  const { t } = useTranslation('goals');

  useEffect(() => {
    if (!trigger) return;

    const colors = ['#00FFD1', '#B580FF', '#FF6B9D', '#FFA94D'];
    
    // Milestone-specific celebration intensity
    const config = {
      25: { duration: 1500, count: 30 },
      50: { duration: 2000, count: 50 },
      75: { duration: 2500, count: 80 },
      100: { duration: 3000, count: 150 },
    };

    const { duration, count } = config[milestone];
    const message = t(`celebration.milestones.${milestone}`);

    // Epic celebration for 100%
    if (milestone === 100) {
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 7,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors,
          zIndex: 9999,
        });
        confetti({
          particleCount: 7,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors,
          zIndex: 9999,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    } else {
      // Single burst for milestones
      confetti({
        particleCount: count,
        spread: 70,
        origin: { y: 0.6 },
        colors,
        zIndex: 9999,
      });
      
      if (milestone >= 50) {
        setTimeout(() => {
          confetti({
            particleCount: count / 2,
            spread: 100,
            origin: { y: 0.6 },
            colors,
            zIndex: 9999,
          });
        }, 300);
      }
    }

    // Toast notification
    const emoji = {
      25: '🎯',
      50: '💪',
      75: '🔥',
      100: '🎉',
    };

    toast.success(`${emoji[milestone]} ${goalName}`, {
      description: message,
      duration: 4000,
    });
  }, [trigger, goalName, milestone, t]);

  return null;
}

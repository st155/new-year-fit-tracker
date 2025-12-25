import { useEffect } from "react";
import confetti from "canvas-confetti";

interface HabitCelebrationProps {
  trigger: boolean;
  type?: 'completion' | 'milestone' | 'streak';
}

export function HabitCelebration({ trigger, type = 'completion' }: HabitCelebrationProps) {
  useEffect(() => {
    if (!trigger) return;

    const duration = type === 'milestone' ? 3000 : 1500;
    const particleCount = type === 'milestone' ? 150 : 50;
    
    if (type === 'milestone') {
      // Epic celebration for milestones
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 7,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: ['#00FFD1', '#B580FF', '#FF6B9D'],
        });
        confetti({
          particleCount: 7,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: ['#00FFD1', '#B580FF', '#FF6B9D'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    } else if (type === 'streak') {
      // Double burst for streaks
      confetti({
        particleCount: particleCount,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00FFD1', '#B580FF'],
      });
      
      setTimeout(() => {
        confetti({
          particleCount: particleCount / 2,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#FF6B9D', '#FFA94D'],
        });
      }, 300);
    } else {
      // Simple celebration for completions
      confetti({
        particleCount: particleCount,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#00FFD1', '#B580FF'],
      });
    }
  }, [trigger, type]);

  return null;
}

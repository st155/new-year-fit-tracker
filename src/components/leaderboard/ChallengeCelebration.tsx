import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import type { DailyChallenge } from "@/lib/daily-challenges";

interface ChallengeCelebrationProps {
  challenge: DailyChallenge | null;
  onComplete?: () => void;
}

export function ChallengeCelebration({ challenge, onComplete }: ChallengeCelebrationProps) {
  const { t } = useTranslation('leaderboard');
  
  useEffect(() => {
    if (!challenge) return;

    // Confetti celebration
    const colors = ['#00FFD1', '#B580FF', '#FF6B9D', '#FFA94D'];
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors,
      zIndex: 9999,
    });
    
    setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 100,
        origin: { y: 0.6 },
        colors,
        zIndex: 9999,
      });
    }, 300);

    // Toast notification
    toast.success(t('celebration.completed', { icon: challenge.icon, title: challenge.title }), {
      description: t('celebration.pointsEarned', { points: challenge.pointsReward }),
      duration: 4000,
    });

    onComplete?.();
  }, [challenge, onComplete, t]);

  return null;
}

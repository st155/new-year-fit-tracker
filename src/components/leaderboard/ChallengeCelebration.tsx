import { useEffect } from "react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import type { DailyChallenge } from "@/lib/daily-challenges";

interface ChallengeCelebrationProps {
  challenge: DailyChallenge | null;
  onComplete?: () => void;
}

export function ChallengeCelebration({ challenge, onComplete }: ChallengeCelebrationProps) {
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
    toast.success(`${challenge.icon} ${challenge.title} завершен!`, {
      description: `+${challenge.pointsReward} очков заработано`,
      duration: 4000,
    });

    onComplete?.();
  }, [challenge, onComplete]);

  return null;
}

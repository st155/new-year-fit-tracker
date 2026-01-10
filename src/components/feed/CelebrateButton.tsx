import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { useActivityReactions } from "@/hooks/useActivityReactions";

interface CelebrateButtonProps {
  activityId: string;
  userId?: string;
}

export function CelebrateButton({ activityId, userId }: CelebrateButtonProps) {
  const { t } = useTranslation('leaderboard');
  const [celebrating, setCelebrating] = useState(false);
  const { toggleReaction, userReactions } = useActivityReactions(activityId, userId);
  
  const hasCelebrated = userReactions.has('party');

  const handleCelebrate = async () => {
    if (!userId) {
      toast.error(t('celebrate.loginRequired'));
      return;
    }

    setCelebrating(true);

    // Trigger confetti
    const duration = 2000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    // Toggle party reaction
    await toggleReaction('party');

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 100, 50]);
    }

    toast.success(t('celebrate.sent'));

    setTimeout(() => {
      setCelebrating(false);
    }, duration);
  };

  return (
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      <Button
        variant={hasCelebrated ? "default" : "ghost"}
        size="sm"
        onClick={handleCelebrate}
        disabled={celebrating}
        className="gap-2"
      >
        <motion.div
          animate={celebrating ? { rotate: [0, -10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.5, repeat: celebrating ? Infinity : 0 }}
        >
          <PartyPopper className="h-4 w-4" />
        </motion.div>
        <span className="hidden sm:inline">
          {hasCelebrated ? t('celebrate.celebrated') : t('celebrate.celebrate')}
        </span>
      </Button>
    </motion.div>
  );
}
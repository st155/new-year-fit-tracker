import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useProfileQuery } from '@/hooks/core/useProfileQuery';
import { BackgroundWaves } from '@/components/workout/BackgroundWaves';
import { TrophyIcon } from '@/components/workout/TrophyIcon';
import { toast } from '@/hooks/use-toast';

export default function AIGeneratedPlanReady() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfileQuery(user?.id);
  const [confettiTriggered, setConfettiTriggered] = useState(false);

  // Extract first name from full_name
  const firstName = profile?.full_name?.split(' ')[0] || profile?.username || 'друг';

  useEffect(() => {
    if (!confettiTriggered) {
      const colors = ['#00FFD1', '#10b981', '#FFD700', '#ec4899'];
      const duration = 3000;
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
      setConfettiTriggered(true);
      
      // Success toast
      toast({
        title: '🎉 Твой план готов!',
        description: 'Начни тренировки прямо сейчас',
        duration: 4000,
      });
    }
  }, [confettiTriggered]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Background waves */}
      <BackgroundWaves />
      
      {/* Main content */}
      <div className="flex items-center justify-center min-h-screen p-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="
            w-full max-w-2xl
            backdrop-blur-xl bg-card/30
            border-2
            rounded-[40px] p-8 md:p-12
            shadow-[0_8px_32px_rgba(0,0,0,0.4)]
            relative
          "
          style={{
            borderImage: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent))) 1',
          }}
        >
          {/* Trophy Icon */}
          <motion.div
            initial={{ scale: 0, y: -50 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring', bounce: 0.5 }}
            className="flex justify-center mb-8"
          >
            <TrophyIcon />
          </motion.div>
          
          {/* Congratulations Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-3xl md:text-5xl font-bold text-center mb-4 uppercase tracking-wide text-foreground"
            role="status"
            aria-live="polite"
          >
            ПОЗДРАВЛЯЕМ, {firstName.toUpperCase()}!
          </motion.h1>
          
          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-xl md:text-2xl text-center mb-12 text-muted-foreground"
          >
            Твой AI-план готов!
          </motion.p>
          
          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="flex justify-center"
          >
            <Button
              size="lg"
              onClick={() => navigate('/workouts')}
              className="
                w-full max-w-md h-16
                text-2xl font-bold uppercase tracking-wider
                bg-gradient-to-r from-green-500 via-cyan-500 to-cyan-400
                hover:from-green-600 hover:via-cyan-600 hover:to-cyan-500
                text-white
                shadow-[0_0_30px_rgba(6,182,212,0.5)]
                rounded-2xl
                transition-all duration-300
                hover:scale-105
              "
              aria-label="Начать тренировки"
            >
              НАЧАТЬ
            </Button>
          </motion.div>
          
          {/* Decorative sparkle in bottom-right corner */}
          <motion.div
            initial={{ opacity: 0, scale: 0, rotate: 0 }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              scale: [0, 1, 1, 0],
              rotate: [0, 180, 360, 540]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1
            }}
            className="absolute bottom-8 right-8"
          >
            <Sparkles className="w-8 h-8 text-primary" />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Brain, Target, Sparkles, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useTranslation } from 'react-i18next';

interface Stage {
  id: number;
  icon: typeof Brain;
  titleKey: string;
  descriptionKey: string;
  duration: number;
}

const GENERATION_STAGES: Stage[] = [
  {
    id: 1,
    icon: Brain,
    titleKey: 'generating.stage1.title',
    descriptionKey: 'generating.stage1.description',
    duration: 2000,
  },
  {
    id: 2,
    icon: Target,
    titleKey: 'generating.stage2.title',
    descriptionKey: 'generating.stage2.description',
    duration: 4000,
  },
  {
    id: 3,
    icon: Dumbbell,
    titleKey: 'generating.stage3.title',
    descriptionKey: 'generating.stage3.description',
    duration: 3000,
  },
  {
    id: 4,
    icon: Sparkles,
    titleKey: 'generating.stage4.title',
    descriptionKey: 'generating.stage4.description',
    duration: 2000,
  },
];

interface PlanGenerationProgressProps {
  onComplete?: () => void;
}

export function PlanGenerationProgress({ onComplete }: PlanGenerationProgressProps) {
  const { t } = useTranslation('workouts');
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (currentStage >= GENERATION_STAGES.length) {
      setIsComplete(true);
      setProgress(100);
      const timer = setTimeout(() => {
        onComplete?.();
      }, 1000);
      return () => clearTimeout(timer);
    }

    const stage = GENERATION_STAGES[currentStage];
    const progressIncrement = 100 / GENERATION_STAGES.length;
    
    // Animate progress for current stage
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const targetProgress = (currentStage + 1) * progressIncrement;
        const newProgress = Math.min(prev + 1, targetProgress);
        return newProgress;
      });
    }, stage.duration / progressIncrement);

    // Move to next stage
    const stageTimer = setTimeout(() => {
      setCurrentStage((prev) => prev + 1);
    }, stage.duration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(stageTimer);
    };
  }, [currentStage, onComplete]);

  const currentStageData = GENERATION_STAGES[currentStage] || GENERATION_STAGES[GENERATION_STAGES.length - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 backdrop-blur-xl">
      <div className="container mx-auto max-w-2xl px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-primary/20 rounded-full"
                initial={{
                  x: Math.random() * 100 + '%',
                  y: '100%',
                }}
                animate={{
                  y: '-100%',
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: Math.random() * 3 + 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>

          {/* Main card */}
          <div className="relative bg-card/50 backdrop-blur-lg border border-border rounded-3xl p-8 md:p-12 shadow-2xl">
            {/* Icon */}
            <div className="flex justify-center mb-8">
              <AnimatePresence mode="wait">
                {isComplete ? (
                  <motion.div
                    key="complete"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/50"
                  >
                    <CheckCircle2 className="w-12 h-12 text-white" />
                  </motion.div>
                ) : (
                  <motion.div
                    key={currentStageData.id}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-primary/50 animate-pulse"
                  >
                    <currentStageData.icon className="w-12 h-12 text-white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Stage info */}
            <AnimatePresence mode="wait">
              <motion.div
                key={isComplete ? 'complete' : currentStageData.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center mb-8"
              >
                <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  {isComplete ? t('generating.complete.title') : t(currentStageData.titleKey)}
                </h2>
                <p className="text-muted-foreground text-lg">
                  {isComplete ? t('generating.complete.description') : t(currentStageData.descriptionKey)}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Progress bar */}
            <div className="mb-8">
              <Progress value={progress} className="h-3 mb-2" />
              <p className="text-center text-sm text-muted-foreground">
                {t('generating.progress', { percent: Math.round(progress) })}
              </p>
            </div>

            {/* Stage indicators */}
            <div className="flex justify-center gap-3">
              {GENERATION_STAGES.map((stage, idx) => (
                <motion.div
                  key={stage.id}
                  initial={{ scale: 0.8 }}
                  animate={{
                    scale: idx === currentStage ? 1.2 : 0.8,
                    backgroundColor: idx <= currentStage ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                  }}
                  className="w-3 h-3 rounded-full transition-all duration-300"
                />
              ))}
            </div>

            {/* Motivational quote */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-8 pt-6 border-t border-border text-center"
            >
              <p className="text-sm italic text-muted-foreground">
                "{t('generating.quote')}"
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

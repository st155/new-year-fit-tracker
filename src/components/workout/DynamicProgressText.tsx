import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

interface DynamicProgressTextProps {
  currentStep: number;
}

export function DynamicProgressText({ currentStep }: DynamicProgressTextProps) {
  const { t } = useTranslation('workouts');
  const [currentIndex, setCurrentIndex] = useState(0);

  const PROGRESS_MESSAGES = [
    t('planGeneration.analyzing'),
    t('planGeneration.creatingMacrocycle'),
    t('planGeneration.optimizingVolume'),
    t('planGeneration.selectingExercises'),
    t('planGeneration.calculatingProgression'),
    t('planGeneration.settingPeriodization'),
    t('planGeneration.finalAdjustments')
  ];

  useEffect(() => {
    setCurrentIndex(currentStep % PROGRESS_MESSAGES.length);
  }, [currentStep, PROGRESS_MESSAGES.length]);

  return (
    <div className="h-16 flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.p
          key={currentIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
          className="text-center text-gray-300 text-sm md:text-base px-4"
        >
          {PROGRESS_MESSAGES[currentIndex]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

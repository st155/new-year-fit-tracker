import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PROGRESS_MESSAGES = [
  "Твой AI-тренер анализирует 1ПМ, цели и восстановление...",
  "Создание персонализированного 12-недельного макроцикла...",
  "Оптимизация объема тренировок под твой уровень...",
  "Подбор упражнений на основе доступного оборудования...",
  "Расчет прогрессии нагрузок для максимальных результатов...",
  "Настройка периодизации для избежания перетренированности...",
  "Финальная корректировка на основе твоих предпочтений..."
];

interface DynamicProgressTextProps {
  currentStep: number;
}

export function DynamicProgressText({ currentStep }: DynamicProgressTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(currentStep % PROGRESS_MESSAGES.length);
  }, [currentStep]);

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

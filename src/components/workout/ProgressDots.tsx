import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressDotsProps {
  currentStep: number;
  totalDots: number;
}

export function ProgressDots({ currentStep, totalDots }: ProgressDotsProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalDots }).map((_, i) => (
        <motion.div
          key={i}
          className={cn(
            "w-2 h-2 rounded-full transition-all duration-500",
            i <= currentStep
              ? "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
              : "bg-gray-600"
          )}
          animate={i === currentStep ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

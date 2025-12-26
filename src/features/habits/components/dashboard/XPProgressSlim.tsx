/**
 * XPProgressSlim - тонкая минималистичная полоса XP прогресса
 */

import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

interface XPProgressSlimProps {
  level: number;
  totalXP: number;
  xpToNext: number;
  progressPercent: number;
}

export function XPProgressSlim({ level, totalXP, xpToNext, progressPercent }: XPProgressSlimProps) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
      {/* Level Badge */}
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20 text-primary font-bold text-sm">
        {level}
      </div>

      {/* Progress Bar */}
      <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* XP to next */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
        <Zap className="w-3 h-3 text-primary" />
        <span>{xpToNext}</span>
      </div>
    </div>
  );
}

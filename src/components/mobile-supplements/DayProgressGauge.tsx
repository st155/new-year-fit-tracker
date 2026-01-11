/**
 * Day Progress Gauge - Adherence ring for today's supplements
 */

import { motion } from 'framer-motion';
import { CircularProgress } from '@/components/ui/circular-progress';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface DayProgressGaugeProps {
  taken: number;
  total: number;
}

export function DayProgressGauge({ taken, total }: DayProgressGaugeProps) {
  const { t } = useTranslation('supplements');
  const percentage = total > 0 ? Math.round((taken / total) * 100) : 0;
  
  // Color based on percentage
  const getColor = () => {
    if (percentage >= 80) return 'hsl(142, 76%, 36%)'; // Green
    if (percentage >= 50) return 'hsl(38, 92%, 50%)';  // Yellow
    return 'hsl(0, 84%, 60%)';                          // Red
  };

  const color = getColor();

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 py-6"
    >
      <div className="flex items-center justify-center gap-6">
        {/* Custom animated gauge */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative"
        >
          <CircularProgress 
            value={percentage} 
            size={100} 
            strokeWidth={10}
            color={color}
            showValue={false}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span 
              key={percentage}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="text-3xl font-bold"
              style={{ color }}
            >
              {percentage}%
            </motion.span>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">
            {t('dayProgress.today')}
          </h2>
          <p className="text-muted-foreground text-sm">
            <span className="text-xl font-bold text-foreground">{taken}</span>
            {' / '}
            <span className="text-lg">{total}</span>
            {' '}{t('dayProgress.taken')}
          </p>
          {percentage === 100 && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                "text-sm font-medium",
                "text-green-500"
              )}
            >
              {t('dayProgress.allDone')}
            </motion.p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

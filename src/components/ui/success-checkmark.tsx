/**
 * Success Checkmark Component
 * Animated success indicator
 */

import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuccessCheckmarkProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function SuccessCheckmark({ size = 'md', className }: SuccessCheckmarkProps) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ 
        type: 'spring', 
        stiffness: 200, 
        damping: 15 
      }}
      className={cn('inline-flex', className)}
    >
      <CheckCircle className={cn('text-green-500', sizeClasses[size])} />
    </motion.div>
  );
}

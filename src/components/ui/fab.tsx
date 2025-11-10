/**
 * Floating Action Button (FAB)
 * Quick access to common actions
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface FABAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  badge?: number;
  color?: string;
}

interface FABProps {
  actions: FABAction[];
  mainIcon?: LucideIcon;
  position?: 'bottom-right' | 'bottom-left';
  className?: string;
}

const positionClasses = {
  'bottom-right': 'bottom-20 md:bottom-8 right-6',
  'bottom-left': 'bottom-20 md:bottom-8 left-6',
};

export function FAB({ 
  actions, 
  mainIcon: MainIcon = Plus, 
  position = 'bottom-right',
  className 
}: FABProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn('fixed z-50', positionClasses[position], className)}>
      <AnimatePresence>
        {expanded && (
          <motion.div 
            className="flex flex-col gap-3 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {actions.map((action, index) => (
              <motion.button
                key={action.label}
                initial={{ scale: 0, x: position === 'bottom-right' ? 20 : -20 }}
                animate={{ scale: 1, x: 0 }}
                exit={{ scale: 0, x: position === 'bottom-right' ? 20 : -20 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  action.onClick();
                  setExpanded(false);
                }}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-full',
                  'bg-card border border-border shadow-lg',
                  'hover:scale-105 hover:shadow-xl transition-all',
                  'group relative'
                )}
                aria-label={action.label}
              >
                <action.icon className={cn('h-5 w-5', action.color)} />
                <span className="text-sm font-medium whitespace-nowrap pr-2">
                  {action.label}
                </span>
                {action.badge && action.badge > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1">
                    {action.badge}
                  </Badge>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB Button */}
      <motion.button
        className={cn(
          'w-14 h-14 rounded-full',
          'bg-gradient-primary text-primary-foreground',
          'shadow-glow hover:shadow-2xl',
          'flex items-center justify-center',
          'transition-all duration-300'
        )}
        onClick={() => setExpanded(!expanded)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={{ rotate: expanded ? 45 : 0 }}
        aria-label={expanded ? 'Close quick actions' : 'Open quick actions'}
        aria-expanded={expanded}
      >
        <MainIcon className="h-6 w-6" />
      </motion.button>
    </div>
  );
}

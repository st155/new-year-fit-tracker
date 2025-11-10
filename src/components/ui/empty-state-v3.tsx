/**
 * Empty State V3 Component
 * Unified empty state with animations and consistent design
 */

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { fadeIn } from '@/lib/animations-v3';

interface EmptyStateV3Props {
  variant?: 'default' | 'goals' | 'habits' | 'challenges' | 'data' | 'search';
  title: string;
  description: string;
  icon?: LucideIcon;
  illustration?: ReactNode;
  action?: { 
    label: string; 
    onClick: () => void; 
    icon?: LucideIcon;
  };
  secondaryAction?: { 
    label: string; 
    onClick: () => void; 
  };
  motivationalQuote?: string;
  className?: string;
}

const variantStyles = {
  default: 'text-muted-foreground',
  goals: 'text-blue-500',
  habits: 'text-green-500',
  challenges: 'text-purple-500',
  data: 'text-orange-500',
  search: 'text-gray-500',
};

export function EmptyStateV3({
  variant = 'default',
  title,
  description,
  icon: Icon,
  illustration,
  action,
  secondaryAction,
  motivationalQuote,
  className,
}: EmptyStateV3Props) {
  return (
    <motion.div
      className={cn('flex items-center justify-center py-12 px-4', className)}
      {...fadeIn()}
    >
      <Card className="max-w-md w-full bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="pt-12 pb-8 text-center space-y-6">
          {/* Icon or Illustration */}
          <div className="flex justify-center">
            {illustration ? (
              illustration
            ) : Icon ? (
              <motion.div
                animate={{ 
                  y: [0, -10, 0],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <div className={cn(
                  'p-4 rounded-full bg-gradient-to-br from-background to-muted/50',
                  'ring-2 ring-border/50 shadow-lg'
                )}>
                  <Icon className={cn('h-12 w-12', variantStyles[variant])} />
                </div>
              </motion.div>
            ) : null}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h3 className="text-2xl font-bold tracking-tight">
              {title}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {description}
            </p>
          </div>

          {/* Motivational Quote */}
          {motivationalQuote && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="pt-4 border-t border-border/50"
            >
              <p className="text-sm italic text-muted-foreground/80">
                "{motivationalQuote}"
              </p>
            </motion.div>
          )}

          {/* Actions */}
          {(action || secondaryAction) && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              {action && (
                <Button
                  onClick={action.onClick}
                  size="lg"
                  className="gap-2"
                >
                  {action.icon && <action.icon className="h-4 w-4" />}
                  {action.label}
                </Button>
              )}
              {secondaryAction && (
                <Button
                  onClick={secondaryAction.onClick}
                  variant="outline"
                  size="lg"
                >
                  {secondaryAction.label}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

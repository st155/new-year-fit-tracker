/**
 * Empty State Component - Unified
 * Consolidated from EmptyState.tsx and empty-state-v3.tsx
 */

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { fadeIn } from '@/lib/animations-v3';

// Variant styles for different contexts
const variantStyles = {
  default: 'text-muted-foreground',
  goals: 'text-blue-500',
  habits: 'text-green-500',
  challenges: 'text-purple-500',
  data: 'text-orange-500',
  search: 'text-gray-500',
};

export type EmptyStateVariant = keyof typeof variantStyles;

export interface EmptyStateProps {
  // Core props
  title: string;
  description?: string;
  
  // Visual
  icon?: LucideIcon | ReactNode;
  illustration?: ReactNode;
  variant?: EmptyStateVariant;
  
  // Actions
  action?: { 
    label: string; 
    onClick: () => void; 
    icon?: LucideIcon;
  };
  secondaryAction?: { 
    label: string; 
    onClick: () => void; 
  };
  
  // Extras
  motivationalQuote?: string;
  className?: string;
  
  // Debug (dev only)
  debugInfo?: {
    label: string;
    value: string | number | boolean;
  }[];
  
  // Animation control
  animated?: boolean;
}

export function EmptyState({
  title,
  description,
  icon,
  illustration,
  variant = 'default',
  action,
  secondaryAction,
  motivationalQuote,
  className,
  debugInfo,
  animated = true,
}: EmptyStateProps) {
  // Determine if icon is a LucideIcon component or ReactNode
  const isLucideIcon = icon && typeof icon === 'function';
  const IconComponent = isLucideIcon ? icon as LucideIcon : null;
  
  const content = (
    <Card className={cn(
      "max-w-md w-full bg-card/50 backdrop-blur-sm border-border/50",
      !animated && "border-dashed"
    )}>
      <CardContent className="pt-12 pb-8 text-center space-y-6">
        {/* Icon or Illustration */}
        <div className="flex justify-center">
          {illustration ? (
            illustration
          ) : IconComponent ? (
            <motion.div
              animate={animated ? { 
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0]
              } : undefined}
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
                <IconComponent className={cn('h-12 w-12', variantStyles[variant])} />
              </div>
            </motion.div>
          ) : icon ? (
            <div className="mb-4 text-muted-foreground/50">
              {icon as ReactNode}
            </div>
          ) : null}
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h3 className="text-2xl font-bold tracking-tight">
            {title}
          </h3>
          {description && (
            <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
              {description}
            </p>
          )}
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

        {/* Debug Info (dev only) */}
        {debugInfo && import.meta.env.DEV && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg text-xs text-left w-full max-w-md border border-info/30">
            <p className="font-semibold text-info mb-2">🔍 Debug Info:</p>
            <ul className="space-y-1 text-muted-foreground">
              {debugInfo.map((info, i) => (
                <li key={i}>• {info.label}: {String(info.value)}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (animated) {
    return (
      <motion.div
        className={cn('flex items-center justify-center py-12 px-4', className)}
        {...fadeIn()}
      >
        {content}
      </motion.div>
    );
  }

  return (
    <div className={cn('flex items-center justify-center py-12 px-4', className)}>
      {content}
    </div>
  );
}

// Re-export for backward compatibility with EmptyStateV3 naming
export { EmptyState as EmptyStateV3 };

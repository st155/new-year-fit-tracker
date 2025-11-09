import { ReactNode } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BaseWidgetCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  iconColor?: string;
  subtitle?: string;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  trend?: {
    value: number;
    isPositive: boolean;
  };
  quality?: {
    color: string;
    label: string;
  };
  sparkline?: ReactNode;
  onClick?: () => void;
  className?: string;
  loading?: boolean;
}

export function BaseWidgetCard({
  title,
  value,
  unit,
  icon: Icon,
  iconColor = 'hsl(var(--primary))',
  subtitle,
  badge,
  trend,
  quality,
  sparkline,
  onClick,
  className,
  loading,
}: BaseWidgetCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          'cursor-pointer overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-card/80',
          'hover:shadow-lg hover:border-primary/30 transition-all duration-300',
          quality?.color && 'border-2',
          className
        )}
        style={{
          borderColor: quality?.color,
          boxShadow: quality?.color 
            ? `0 0 20px ${quality.color}20` 
            : undefined,
        }}
        onClick={onClick}
      >
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-start justify-between">
            {/* Icon + Title */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div 
                className="p-2 rounded-xl shrink-0 shadow-sm"
                style={{
                  backgroundColor: `${iconColor}15`,
                }}
              >
                <Icon 
                  className="h-5 w-5" 
                  style={{ color: iconColor }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-foreground/90 truncate">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Badge */}
            {badge && (
              <Badge 
                variant={badge.variant || 'secondary'} 
                className="ml-2 shrink-0 text-[10px] h-5"
              >
                {badge.text}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pb-4 px-4 space-y-3">
          {/* Value + Unit */}
          <div className="flex items-baseline gap-2">
            {loading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <span className="text-3xl font-bold tracking-tight">
                  {value}
                </span>
                {unit && (
                  <span className="text-lg text-muted-foreground font-medium">
                    {unit}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Trend or Quality Label */}
          <div className="flex items-center justify-between">
            {trend && (
              <div className={cn(
                'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
                trend.isPositive 
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400'
              )}>
                <span>{trend.isPositive ? '↑' : '↓'}</span>
                <span>{Math.abs(trend.value).toFixed(1)}%</span>
              </div>
            )}
            
            {quality && (
              <div 
                className="text-xs font-medium px-2 py-1 rounded-full"
                style={{
                  backgroundColor: `${quality.color}15`,
                  color: quality.color,
                }}
              >
                {quality.label}
              </div>
            )}
          </div>

          {/* Sparkline */}
          {sparkline && (
            <div className="h-12 -mx-1 mt-2">
              {sparkline}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

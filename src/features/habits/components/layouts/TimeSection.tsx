import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Clock, Play } from 'lucide-react';
import { HabitCardV3 } from '../core/HabitCardV3';
import { formatDuration } from '@/lib/habit-utils-v3';
import { type HabitGroup } from '@/features/habits/hooks';
import { useTranslation } from 'react-i18next';

interface TimeSectionProps {
  group: HabitGroup;
  onHabitComplete?: (habitId: string) => void;
  onHabitTap?: (habitId: string) => void;
  onHabitArchive?: (habitId: string) => void;
  onHabitDelete?: (habitId: string) => void;
  onHabitEdit?: (habitId: string) => void;
  onHabitViewHistory?: (habitId: string) => void;
  onStartAll?: () => void;
  variant?: 'default' | 'warning' | 'success';
  defaultExpanded?: boolean;
}

export function TimeSection({
  group,
  onHabitComplete,
  onHabitTap,
  onHabitArchive,
  onHabitDelete,
  onHabitEdit,
  onHabitViewHistory,
  onStartAll,
  variant = 'default',
  defaultExpanded = true
}: TimeSectionProps) {
  const { t } = useTranslation('habits');
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { habits, title, completedCount, totalCount, estimatedDuration } = group;

  if (habits.length === 0) return null;

  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const remainingDuration = habits
    .filter(h => !h.completed_today)
    .reduce((sum, h) => sum + (h.estimated_duration_minutes || 0), 0);

  const isAllCompleted = completedCount === totalCount;

  return (
    <Card className={cn(
      "glass-card transition-all duration-300",
      variant === 'warning' && "border-orange-500/50",
      variant === 'success' && "border-green-500/50",
      isAllCompleted && "opacity-60"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity"
          >
            <h2 className="text-xl font-semibold">{title}</h2>
            <Badge variant="outline" className="shrink-0">
              {completedCount}/{totalCount}
            </Badge>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 ml-auto" />
            ) : (
              <ChevronDown className="w-5 h-5 ml-auto" />
            )}
          </button>
        </div>

        {/* Progress bar */}
        <Progress 
          value={progressPercentage} 
          autoColor
          className="h-2 mt-3"
        />

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          {estimatedDuration > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>~{formatDuration(estimatedDuration)}</span>
            </div>
          )}
          
          {remainingDuration > 0 && !isAllCompleted && (
            <div className="flex items-center gap-1 text-primary">
              <span>{t('timeSection.remaining')}: {formatDuration(remainingDuration)}</span>
            </div>
          )}

          {isAllCompleted && (
            <div className="flex items-center gap-1 text-green-500">
              <span>✓ {t('timeSection.allCompleted')}</span>
            </div>
          )}

          {!isAllCompleted && habits.length > 1 && onStartAll && (
            <Button
              size="sm"
              variant="outline"
              className="ml-auto"
              onClick={(e) => {
                e.stopPropagation();
                onStartAll();
              }}
            >
              <Play className="w-3 h-3 mr-1" />
              {t('timeSection.startAll')}
            </Button>
          )}
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="space-y-3 pt-0">
              {habits.map((habit) => (
                <HabitCardV3
                  key={habit.id}
                  habit={habit}
                  onComplete={() => onHabitComplete?.(habit.id)}
                  onTap={() => onHabitTap?.(habit.id)}
                  onArchive={() => onHabitArchive?.(habit.id)}
                  onDelete={() => onHabitDelete?.(habit.id)}
                  onEdit={() => onHabitEdit?.(habit.id)}
                  onViewHistory={() => onHabitViewHistory?.(habit.id)}
                />
              ))}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// Memoize component for better performance
export default memo(TimeSection, (prev, next) => {
  return (
    prev.group.title === next.group.title &&
    prev.group.completedCount === next.group.completedCount &&
    prev.group.totalCount === next.group.totalCount &&
    prev.group.habits.length === next.group.habits.length
  );
});

import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HabitMiniChart } from '../charts/HabitMiniChart';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CheckCircle2, RotateCcw, Filter, ArrowUpDown } from 'lucide-react';
import { useHabitAttemptsQuery } from '@/features/habits/hooks';
import { useAuth } from '@/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { calculateElapsedTime } from '@/lib/duration-utils';

interface AllHabitsViewProps {
  habits: any[];
  onHabitComplete?: (habitId: string) => void;
  onHabitClick?: (habitId: string) => void;
}

type SortOption = 'completion' | 'streak' | 'created' | 'xp';
type FilterStatus = 'all' | 'completed' | 'not_completed';
type FilterType = 'all' | 'daily_check' | 'duration_counter' | 'numeric_counter';
type GroupByOption = 'none' | 'category' | 'status';

export function AllHabitsView({ habits, onHabitComplete, onHabitClick }: AllHabitsViewProps) {
  const { t } = useTranslation('habits');
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState<SortOption>('completion');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  
  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(habits.map(h => h.category).filter(Boolean));
    return ['all', ...Array.from(cats)];
  }, [habits]);

  // Filter and sort habits
  const processedHabits = useMemo(() => {
    if (!Array.isArray(habits) || habits.length === 0) {
      return [];
    }
    
    let filtered = [...habits];
    
    // Apply category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(h => h.category === filterCategory);
    }
    
    // Apply status filter
    if (filterStatus === 'completed') {
      filtered = filtered.filter(h => h.completed_today);
    } else if (filterStatus === 'not_completed') {
      filtered = filtered.filter(h => !h.completed_today);
    }
    
    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(h => h.habit_type === filterType);
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'completion':
          return (b?.stats?.completion_rate || 0) - (a?.stats?.completion_rate || 0);
        case 'streak':
          return (b?.streak || 0) - (a?.streak || 0);
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'xp':
          return (b?.xp_reward || 0) - (a?.xp_reward || 0);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [habits, filterCategory, filterStatus, filterType, sortBy]);

  // Group habits if needed
  const groupedHabits = useMemo(() => {
    if (groupBy === 'none') {
      return { all: processedHabits };
    }
    
    if (groupBy === 'category') {
      const groups: Record<string, any[]> = {};
      processedHabits.forEach(habit => {
        const cat = habit.category || t('groups.uncategorized');
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(habit);
      });
      return groups;
    }
    
    if (groupBy === 'status') {
      return {
        [t('groups.completed')]: processedHabits.filter(h => h.completed_today),
        [t('groups.notCompleted')]: processedHabits.filter(h => !h.completed_today),
      };
    }
    
    return { all: processedHabits };
  }, [processedHabits, groupBy, t]);

  if (processedHabits.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t('smartView.noHabits')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Sort Controls */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          
          {/* Category Filter */}
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('filters.category')} />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat === 'all' ? t('filters.allCategories') : cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
            <TabsList className="h-9">
              <TabsTrigger value="all" className="text-xs">{t('filters.all')}</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs">{t('filters.done')}</TabsTrigger>
              <TabsTrigger value="not_completed" className="text-xs">{t('filters.notDone')}</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Type Filter */}
          <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t('filters.type')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allTypes')}</SelectItem>
              <SelectItem value="daily_check">{t('filters.daily')}</SelectItem>
              <SelectItem value="duration_counter">{t('filters.counters')}</SelectItem>
              <SelectItem value="numeric_counter">{t('filters.numeric')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
          
          {/* Sort Options */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('sort.title')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="completion">{t('sort.byCompletion')}</SelectItem>
              <SelectItem value="streak">{t('sort.byStreak')}</SelectItem>
              <SelectItem value="created">{t('sort.byCreated')}</SelectItem>
              <SelectItem value="xp">{t('sort.byXp')}</SelectItem>
            </SelectContent>
          </Select>

          {/* Group By */}
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByOption)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t('groups.title')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('groups.none')}</SelectItem>
              <SelectItem value="category">{t('groups.byCategory')}</SelectItem>
              <SelectItem value="status">{t('groups.byStatus')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Habits List */}
      <div className="space-y-4">
        {Object.entries(groupedHabits).map(([groupName, groupHabits]) => (
          <div key={groupName} className="space-y-3">
            {groupBy !== 'none' && (
              <h3 className="text-sm font-semibold text-muted-foreground px-1">
                {groupName} ({groupHabits.length})
              </h3>
            )}
            <div className="space-y-3">
              {groupHabits.map((habit, index) => (
                <HabitCompactCard
                  key={habit.id}
                  habit={habit}
                  index={index}
                  onComplete={onHabitComplete}
                  onClick={onHabitClick}
                  userId={user?.id}
                  t={t}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface HabitCompactCardProps {
  habit: any;
  index: number;
  onComplete?: (habitId: string) => void;
  onClick?: (habitId: string) => void;
  userId?: string;
  t: (key: string, options?: any) => string;
}

function HabitCompactCard({ habit, index, onComplete, onClick, userId, t }: HabitCompactCardProps) {
  const { resetHabit, isResetting } = useHabitAttemptsQuery(habit.id, userId);
  const [elapsedTime, setElapsedTime] = useState<{ days: number; hours: number; minutes: number } | null>(null);
  
  const isDurationCounter = habit.habit_type === 'duration_counter';
  const isDailyCheck = habit.habit_type === 'daily_check';
  const isCompleted = habit.completed_today;

  // Calculate elapsed time for duration counters
  useEffect(() => {
    if (!isDurationCounter) return;
    
    const updateElapsed = () => {
      const startDate = habit.current_attempt?.start_date || habit.start_date;
      if (startDate) {
        const elapsed = calculateElapsedTime(startDate);
        setElapsedTime(elapsed);
      }
    };
    
    updateElapsed();
    const interval = setInterval(updateElapsed, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [isDurationCounter, habit.current_attempt?.start_date, habit.start_date]);

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDurationCounter) {
      resetHabit({ reason: t('card.resetReason', { defaultValue: 'Reset from all habits list' }) });
    } else if (!isCompleted && onComplete) {
      onComplete(habit.id);
    }
  };

  // Helper for days pluralization
  const getDaysLabel = (days: number): string => {
    if (days === 1) return t('streakDays_one', { count: 1 }).replace('1 ', '');
    return t('streakDays_other', { count: days }).replace(`${days} `, '');
  };

  // Swipe gesture handling
  const x = useMotionValue(0);
  const backgroundColor = useTransform(
    x,
    [-100, 0, 100],
    ['rgba(239, 68, 68, 0.1)', 'transparent', 'rgba(34, 197, 94, 0.1)']
  );

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 80;
    
    if (info.offset.x > threshold && !isCompleted && !isDurationCounter) {
      // Swipe right - complete
      onComplete?.(habit.id);
    } else if (info.offset.x < -threshold) {
      // Swipe left - open details
      onClick?.(habit.id);
    }
    
    x.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      style={{ x, backgroundColor }}
    >
      <Card
        className={cn(
          "p-4 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01]",
          "glass-card border-border/50",
          index < 3 && "border-primary/30 bg-primary/5"
        )}
        onClick={() => onClick?.(habit.id)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-3xl flex-shrink-0">{habit.icon || '📌'}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">
                {habit.name}
              </h3>
            {isDurationCounter && elapsedTime ? (
              <p className="text-xs text-primary font-medium">
                {t('card.daysWithout', { 
                  days: elapsedTime.days, 
                  daysLabel: getDaysLabel(elapsedTime.days),
                  category: habit.category || t('card.habit')
                })}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {habit.category || t('card.habit')}
              </p>
            )}
            </div>
          </div>
          <div className="text-right flex-shrink-0 ml-3">
            <div className="text-2xl font-bold text-primary">
              {Math.round(habit.stats?.completion_rate || 0)}%
            </div>
          <p className="text-xs text-muted-foreground">
            {habit.stats?.total_completions || 0} {t('card.times')}
          </p>
        </div>
        </div>

        {/* Mini chart */}
        <div className="mb-3">
          <HabitMiniChart 
            completions={habit.completions || []}
            days={7}
          />
        </div>

        {/* Bottom row: streak + action button + XP */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-sm">
            <span>🔥</span>
            <span className="font-semibold text-foreground">
              {habit.streak || 0}
            </span>
          </div>

          {/* Action button */}
          {isDurationCounter ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAction}
              disabled={isResetting}
              className="gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('card.reset')}</span>
            </Button>
          ) : isDailyCheck && !isCompleted ? (
            <Button
              size="sm"
              variant="default"
              onClick={handleAction}
              className="gap-1.5 bg-primary/90 hover:bg-primary"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('card.complete')}</span>
            </Button>
          ) : isCompleted ? (
            <div className="text-xs text-success flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('card.done')}</span>
            </div>
          ) : null}

          {habit.xp_reward && (
            <div className="flex items-center gap-1 text-sm">
              <span>⭐</span>
              <span className="font-semibold text-amber-500">
                +{habit.xp_reward}
              </span>
            </div>
          )}
        </div>
        
        {/* Swipe hint */}
        <div className="text-[10px] text-muted-foreground/60 text-center mt-2">
          {t('card.swipeHint')}
        </div>
      </Card>
    </motion.div>
  );
}

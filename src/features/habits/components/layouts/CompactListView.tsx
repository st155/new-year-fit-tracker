import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Filter, Check, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SimpleVirtualList } from '@/components/ui/virtualized-list';
import { formatDuration, getDifficultyBadge } from '@/lib/habit-utils-v3';

interface CompactListViewProps {
  habits: any[];
  onHabitComplete?: (habitId: string) => void;
  onHabitTap?: (habitId: string) => void;
}

type FilterType = 'all' | 'today' | 'active' | 'at-risk';
type GroupType = 'not-started' | 'in-progress' | 'completed';

export function CompactListView({ habits, onHabitComplete, onHabitTap }: CompactListViewProps) {
  const { t } = useTranslation('habits');
  const [filter, setFilter] = useState<FilterType>('all');

  // Filter habits based on selected filter
  const filteredHabits = useMemo(() => {
    let result = habits;

    if (filter === 'today') {
      result = habits.filter(h => h.time_of_day !== 'anytime');
    } else if (filter === 'active') {
      result = habits.filter(h => h.current_streak && h.current_streak > 0);
    } else if (filter === 'at-risk') {
      result = habits.filter(h => {
        const rate = h.completion_rate || 0;
        return rate < 50 || (h.current_streak === 0 && h.last_completed_at);
      });
    }

    return result;
  }, [habits, filter]);

  // Group habits by status
  const groupedHabits = useMemo(() => {
    const groups: Record<GroupType, any[]> = {
      'not-started': [],
      'in-progress': [],
      'completed': []
    };

    filteredHabits.forEach(habit => {
      if (habit.completed_today) {
        groups['completed'].push(habit);
      } else if (habit.current_streak && habit.current_streak > 0) {
        groups['in-progress'].push(habit);
      } else {
        groups['not-started'].push(habit);
      }
    });

    return groups;
  }, [filteredHabits]);

  const renderHabitRow = (habit: any) => {
    const difficulty = getDifficultyBadge(habit.difficulty_level);
    const isCompleted = habit.completed_today;

    return (
      <div
        key={habit.id}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
          isCompleted
            ? "bg-primary/5 border-primary/20"
            : "bg-card border-border hover:bg-muted/50"
        )}
        onClick={() => onHabitTap?.(habit.id)}
      >
        {/* Checkbox */}
        <Checkbox
          checked={isCompleted}
          onClick={(e) => {
            e.stopPropagation();
            if (!isCompleted) {
              onHabitComplete?.(habit.id);
            }
          }}
          className="shrink-0"
        />

        {/* Icon */}
        <div className="text-2xl shrink-0">{habit.icon || '📌'}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={cn(
              "font-medium truncate",
              isCompleted && "text-muted-foreground line-through"
            )}>
              {habit.name}
            </h4>
            {habit.current_streak > 0 && (
              <Badge variant="secondary" className="text-xs shrink-0">
                🔥 {habit.current_streak}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {habit.category && (
              <span className="truncate">{habit.category}</span>
            )}
            {habit.target_duration && (
              <span className="flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3" />
                {formatDuration(habit.target_duration)}
              </span>
            )}
            {difficulty && (
              <Badge variant="outline" className="text-xs shrink-0">
                {difficulty.icon} {difficulty.label}
              </Badge>
            )}
          </div>
        </div>

        {/* XP Badge */}
        {habit.xp_reward && (
          <Badge className="shrink-0 bg-primary/10 text-primary border-primary/20">
            +{habit.xp_reward} XP
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              {t('compactList.title')}
            </CardTitle>
            <Badge variant="secondary">
              {t('compactList.habitsCount', { count: filteredHabits.length })}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">{t('compactList.filters.all')}</TabsTrigger>
              <TabsTrigger value="today">{t('compactList.filters.today')}</TabsTrigger>
              <TabsTrigger value="active">{t('compactList.filters.active')}</TabsTrigger>
              <TabsTrigger value="at-risk">{t('compactList.filters.atRisk')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Not Started Group */}
      {groupedHabits['not-started'].length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-muted-foreground" />
              <CardTitle className="text-base">
                {t('groups.notStarted', { count: groupedHabits['not-started'].length })}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <SimpleVirtualList
              items={groupedHabits['not-started']}
              renderItem={renderHabitRow}
              threshold={10}
            />
          </CardContent>
        </Card>
      )}

      {/* In Progress Group */}
      {groupedHabits['in-progress'].length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-base">
                {t('groups.inProgress', { count: groupedHabits['in-progress'].length })}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <SimpleVirtualList
              items={groupedHabits['in-progress']}
              renderItem={renderHabitRow}
              threshold={10}
            />
          </CardContent>
        </Card>
      )}

      {/* Completed Group */}
      {groupedHabits['completed'].length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">
                {t('groups.completed', { count: groupedHabits['completed'].length })}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <SimpleVirtualList
              items={groupedHabits['completed']}
              renderItem={renderHabitRow}
              threshold={10}
            />
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filteredHabits.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {t('empty.noHabitsToDisplay')}
            </p>
            <Button variant="outline" className="mt-4">
              {t('empty.addHabit')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

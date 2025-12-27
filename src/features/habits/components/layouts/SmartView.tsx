import { useTranslation } from 'react-i18next';
import { useHabitGrouping } from '@/features/habits/hooks';
import { TimeSection } from './TimeSection';
import { OverviewStats } from './OverviewStats';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { HabitsProgressSection } from '../sections/HabitsProgressSection';
import { EmptyStateV3 } from '@/components/ui/empty-state-v3';

interface SmartViewProps {
  habits: any[];
  onHabitComplete?: (habitId: string) => void;
  onHabitTap?: (habitId: string) => void;
  onHabitArchive?: (habitId: string) => void;
  onHabitDelete?: (habitId: string) => void;
  onHabitEdit?: (habitId: string) => void;
  onHabitViewHistory?: (habitId: string) => void;
}

export function SmartView({ 
  habits, 
  onHabitComplete, 
  onHabitTap,
  onHabitArchive,
  onHabitDelete,
  onHabitEdit,
  onHabitViewHistory
}: SmartViewProps) {
  const { t } = useTranslation('habits');
  const grouped = useHabitGrouping(habits);

  // Show empty state when no habits
  if (habits.length === 0) {
    return (
      <EmptyStateV3
        variant="habits"
        title={t('smartView.noHabits')}
        description={t('smartView.noHabitsDesc')}
        illustration="animated-icon"
        motivationalQuote={t('smartView.quote')}
      />
    );
  }

  // Calculate overview stats
  const todayCompleted = habits.filter(h => h.completed_today).length;
  const todayTotal = habits.length;
  const weekStreak = Math.max(...habits.map(h => h.streak || 0), 0);
  const totalXP = habits.reduce((sum, h) => sum + ((h.xp_reward || 0) * (h.stats?.total_completions || 0)), 0);
  const level = Math.floor(totalXP / 1000) + 1;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <OverviewStats
        todayCompleted={todayCompleted}
        todayTotal={todayTotal}
        weekStreak={weekStreak}
        totalXP={totalXP}
        level={level}
      />

      {/* Habits Progress Section */}
      <HabitsProgressSection 
        habits={habits}
        onHabitClick={onHabitTap}
      />

      {/* At Risk Habits Alert */}
      {grouped.atRisk.length > 0 && (
        <Alert variant="destructive" className="glass-card border-orange-500/50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('smartView.atRiskAlert', { count: grouped.atRisk.length })}
          </AlertDescription>
        </Alert>
      )}

      {/* Time-based Sections */}
      <div className="space-y-4">
        <TimeSection
          group={grouped.morning}
          onHabitComplete={onHabitComplete}
          onHabitTap={onHabitTap}
          onHabitArchive={onHabitArchive}
          onHabitDelete={onHabitDelete}
          onHabitEdit={onHabitEdit}
          onHabitViewHistory={onHabitViewHistory}
        />
        
        <TimeSection
          group={grouped.afternoon}
          onHabitComplete={onHabitComplete}
          onHabitTap={onHabitTap}
          onHabitArchive={onHabitArchive}
          onHabitDelete={onHabitDelete}
          onHabitEdit={onHabitEdit}
          onHabitViewHistory={onHabitViewHistory}
        />
        
        <TimeSection
          group={grouped.evening}
          onHabitComplete={onHabitComplete}
          onHabitTap={onHabitTap}
          onHabitArchive={onHabitArchive}
          onHabitDelete={onHabitDelete}
          onHabitEdit={onHabitEdit}
          onHabitViewHistory={onHabitViewHistory}
        />
        
        <TimeSection
          group={grouped.night}
          onHabitComplete={onHabitComplete}
          onHabitTap={onHabitTap}
          onHabitArchive={onHabitArchive}
          onHabitDelete={onHabitDelete}
          onHabitEdit={onHabitEdit}
          onHabitViewHistory={onHabitViewHistory}
        />
        
        <TimeSection
          group={grouped.anytime}
          onHabitComplete={onHabitComplete}
          onHabitTap={onHabitTap}
          onHabitArchive={onHabitArchive}
          onHabitDelete={onHabitDelete}
          onHabitEdit={onHabitEdit}
          onHabitViewHistory={onHabitViewHistory}
        />
      </div>

      {/* At Risk Section */}
      {grouped.atRisk.length > 0 && (
        <TimeSection
          group={{
            time: 'anytime',
            title: t('smartView.atRiskTitle'),
            icon: '⚠️',
            habits: grouped.atRisk,
            estimatedDuration: grouped.atRisk.reduce((sum, h) => sum + (h.estimated_duration_minutes || 0), 0),
            completedCount: 0,
            totalCount: grouped.atRisk.length
          }}
          onHabitComplete={onHabitComplete}
          onHabitTap={onHabitTap}
          onHabitArchive={onHabitArchive}
          onHabitDelete={onHabitDelete}
          onHabitEdit={onHabitEdit}
          onHabitViewHistory={onHabitViewHistory}
          variant="warning"
          defaultExpanded={true}
        />
      )}
    </div>
  );
}

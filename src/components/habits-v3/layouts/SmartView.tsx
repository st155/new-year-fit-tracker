import { useHabitGrouping } from '@/hooks/useHabitGrouping';
import { TimeSection } from './TimeSection';
import { OverviewStats } from './OverviewStats';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface SmartViewProps {
  habits: any[];
  onHabitComplete?: (habitId: string) => void;
  onHabitTap?: (habitId: string) => void;
}

export function SmartView({ habits, onHabitComplete, onHabitTap }: SmartViewProps) {
  const grouped = useHabitGrouping(habits);

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

      {/* At Risk Habits Alert */}
      {grouped.atRisk.length > 0 && (
        <Alert variant="destructive" className="glass-card border-orange-500/50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {grouped.atRisk.length} {grouped.atRisk.length === 1 ? 'привычка требует' : 'привычки требуют'} внимания
          </AlertDescription>
        </Alert>
      )}

      {/* Time-based Sections */}
      <div className="space-y-4">
        <TimeSection
          group={grouped.morning}
          onHabitComplete={onHabitComplete}
          onHabitTap={onHabitTap}
        />
        
        <TimeSection
          group={grouped.afternoon}
          onHabitComplete={onHabitComplete}
          onHabitTap={onHabitTap}
        />
        
        <TimeSection
          group={grouped.evening}
          onHabitComplete={onHabitComplete}
          onHabitTap={onHabitTap}
        />
        
        <TimeSection
          group={grouped.night}
          onHabitComplete={onHabitComplete}
          onHabitTap={onHabitTap}
        />
        
        <TimeSection
          group={grouped.anytime}
          onHabitComplete={onHabitComplete}
          onHabitTap={onHabitTap}
        />
      </div>

      {/* At Risk Section */}
      {grouped.atRisk.length > 0 && (
        <TimeSection
          group={{
            time: 'anytime',
            title: '⚠️ Требуют внимания',
            icon: '⚠️',
            habits: grouped.atRisk,
            estimatedDuration: grouped.atRisk.reduce((sum, h) => sum + (h.estimated_duration_minutes || 0), 0),
            completedCount: 0,
            totalCount: grouped.atRisk.length
          }}
          onHabitComplete={onHabitComplete}
          onHabitTap={onHabitTap}
          variant="warning"
          defaultExpanded={true}
        />
      )}
    </div>
  );
}

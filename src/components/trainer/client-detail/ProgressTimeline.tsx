import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, AlertTriangle, Target, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Goal {
  id: string;
  goal_name: string;
  target_value: number;
  target_unit: string;
  progress_percentage: number;
  created_at?: string;
}

interface Measurement {
  id: string;
  goal_id: string;
  value: number;
  measurement_date: string;
  goal_name: string;
  unit: string;
}

interface TimelineEvent {
  id: string;
  type: 'achievement' | 'record' | 'milestone' | 'issue';
  title: string;
  description: string;
  date: string;
  icon: React.ReactNode;
  color: string;
}

interface ProgressTimelineProps {
  goals: Goal[];
  measurements: Measurement[];
  recoveryScore?: number[];
}

export function ProgressTimeline({ goals, measurements, recoveryScore }: ProgressTimelineProps) {
  const timelineEvents = useMemo((): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // Goal achievements
    goals
      .filter(g => g.progress_percentage >= 100)
      .forEach(goal => {
        events.push({
          id: `achievement-${goal.id}`,
          type: 'achievement',
          title: 'Цель достигнута!',
          description: `${goal.goal_name}: ${goal.target_value} ${goal.target_unit}`,
          date: goal.created_at || new Date().toISOString(),
          icon: <Trophy className="h-5 w-5" />,
          color: 'text-green-600 bg-green-100 dark:bg-green-900/30'
        });
      });

    // Personal records (new max values per goal)
    const recordsByGoal = new Map<string, { value: number; date: string; name: string; unit: string }>();
    
    measurements.forEach(m => {
      const existing = recordsByGoal.get(m.goal_id);
      if (!existing || m.value > existing.value) {
        recordsByGoal.set(m.goal_id, {
          value: m.value,
          date: m.measurement_date,
          name: m.goal_name,
          unit: m.unit
        });
      }
    });

    recordsByGoal.forEach((record, goalId) => {
      events.push({
        id: `record-${goalId}`,
        type: 'record',
        title: 'Новый рекорд!',
        description: `${record.name}: ${record.value} ${record.unit}`,
        date: record.date,
        icon: <TrendingUp className="h-5 w-5" />,
        color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'
      });
    });

    // Milestones (100, 500, 1000 measurements)
    const milestones = [10, 25, 50, 100];
    const totalMeasurements = measurements.length;
    
    milestones.forEach(milestone => {
      if (totalMeasurements >= milestone) {
        const milestoneDate = measurements.slice(-1)[0]?.measurement_date || new Date().toISOString();
        events.push({
          id: `milestone-${milestone}`,
          type: 'milestone',
          title: `${milestone} измерений`,
          description: `Достигнут важный рубеж: ${milestone} замеров прогресса`,
          date: milestoneDate,
          icon: <Target className="h-5 w-5" />,
          color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30'
        });
      }
    });

    // Issues (low recovery periods)
    if (recoveryScore && recoveryScore.length > 0) {
      const avgRecovery = recoveryScore.reduce((a, b) => a + b, 0) / recoveryScore.length;
      if (avgRecovery < 50) {
        events.push({
          id: 'issue-low-recovery',
          type: 'issue',
          title: 'Низкий Recovery',
          description: `Средний показатель: ${avgRecovery.toFixed(0)}%. Рекомендуется отдых`,
          date: new Date().toISOString(),
          icon: <AlertTriangle className="h-5 w-5" />,
          color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30'
        });
      }
    }

    // Sort by date (newest first)
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [goals, measurements, recoveryScore]);

  if (timelineEvents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline прогресса
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">История достижений появится здесь</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline прогресса
          </CardTitle>
          <Badge variant="outline">{timelineEvents.length} событий</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4">
          {/* Vertical line */}
          <div className="absolute left-5 top-2 bottom-2 w-px bg-border" />
          
          {timelineEvents.map((event, index) => (
            <div key={event.id} className="relative pl-12 pb-4">
              {/* Icon circle */}
              <div className={cn(
                "absolute left-0 flex items-center justify-center w-10 h-10 rounded-full",
                event.color
              )}>
                {event.icon}
              </div>
              
              {/* Content */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm">{event.title}</h4>
                  <Badge 
                    variant={
                      event.type === 'achievement' ? 'default' :
                      event.type === 'record' ? 'secondary' :
                      event.type === 'issue' ? 'destructive' :
                      'outline'
                    }
                    className="text-xs"
                  >
                    {event.type === 'achievement' ? 'Достижение' :
                     event.type === 'record' ? 'Рекорд' :
                     event.type === 'milestone' ? 'Milestone' :
                     'Внимание'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{event.description}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(event.date), 'dd MMMM yyyy', { locale: ru })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

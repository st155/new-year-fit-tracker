import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';

interface Goal {
  id: string;
  goal_name: string;
  goal_type: string;
  target_value: number;
  target_unit: string;
  current_value: number;
  progress_percentage: number;
  last_measurement_date: string | null;
  measurements_count: number;
}

interface Measurement {
  id: string;
  goal_id: string;
  value: number;
  measurement_date: string;
  unit: string;
}

interface GoalsProgressOverviewProps {
  goals: Goal[];
  measurements: Measurement[];
}

export function GoalsProgressOverview({ goals, measurements }: GoalsProgressOverviewProps) {
  const { t, i18n } = useTranslation('trainerDashboard');
  const dateLocale = i18n.language === 'ru' ? ru : enUS;

  const getTrend = (goal: Goal) => {
    const goalMeasurements = measurements
      .filter(m => m.goal_id === goal.id)
      .sort((a, b) => new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime());
    
    if (goalMeasurements.length < 2) return 'stable';
    
    const latest = goalMeasurements[0].value;
    const previous = goalMeasurements[1].value;
    
    if (latest > previous) return 'up';
    if (latest < previous) return 'down';
    return 'stable';
  };

  const getChartData = (goalId: string) => {
    return measurements
      .filter(m => m.goal_id === goalId)
      .sort((a, b) => new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime())
      .slice(-10)
      .map(m => ({
        date: format(new Date(m.measurement_date), 'dd MMM', { locale: dateLocale }),
        value: m.value
      }));
  };

  const getProgressEmoji = (percentage: number) => {
    if (percentage >= 100) return t('goalsOverview.progress.achieved');
    if (percentage >= 80) return t('goalsOverview.progress.almostDone');
    if (percentage >= 50) return t('goalsOverview.progress.halfway');
    return t('goalsOverview.progress.keepGoing');
  };

  if (goals.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Target className="h-16 w-16 mb-4 opacity-50" />
          <p className="text-lg font-medium">{t('goalsOverview.noGoals')}</p>
          <p className="text-sm">{t('goalsOverview.noGoalsDesc')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      {goals.map((goal) => {
        const trend = getTrend(goal);
        const chartData = getChartData(goal.id);
        const hasData = chartData.length > 0;

        return (
          <Card key={goal.id} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl flex items-center gap-2">
                    {goal.goal_name}
                    {trend === 'up' && <TrendingUp className="h-5 w-5 text-green-500" />}
                    {trend === 'down' && <TrendingDown className="h-5 w-5 text-red-500" />}
                  </CardTitle>
                  <div className="flex gap-2 items-center">
                    <Badge variant="secondary" className="capitalize">
                      {goal.goal_type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {goal.measurements_count} {t('goalsOverview.measurements')}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">
                    {goal.progress_percentage.toFixed(0)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {goal.current_value.toFixed(1)} / {goal.target_value} {goal.target_unit}
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Progress Bar */}
              <div className="space-y-2">
                <Progress 
                  value={Math.min(goal.progress_percentage, 100)} 
                  className="h-3"
                  autoColor
                />
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>{t('goalsOverview.start')}</span>
                  <span className="font-medium">
                    {getProgressEmoji(goal.progress_percentage)}
                  </span>
                  <span>{t('goalsOverview.target')}</span>
                </div>
              </div>

              {/* Chart */}
              {hasData && chartData.length >= 2 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{t('goalsOverview.history')}</span>
                  </div>
                  <ResponsiveContainer width="100%" height={150}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id={`gradient-${goal.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 11 }}
                        tickMargin={8}
                      />
                      <YAxis 
                        tick={{ fontSize: 11 }}
                        domain={[0, 'auto']}
                        tickMargin={8}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`${value.toFixed(1)} ${goal.target_unit}`, t('goalsOverview.value')]}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill={`url(#gradient-${goal.id})`}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Last Measurement */}
              {goal.last_measurement_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {t('goalsOverview.lastMeasurement')}: {format(new Date(goal.last_measurement_date), 'dd MMMM yyyy', { locale: dateLocale })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

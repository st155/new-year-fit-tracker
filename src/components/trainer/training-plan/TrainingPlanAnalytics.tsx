import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import { TrendingUp, Activity, Award, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WorkoutExercise {
  exercise_id: string;
  exercise_name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
}

interface TrainingPlanWorkout {
  id: string;
  day_of_week: number;
  workout_name: string;
  description?: string | null;
  exercises: WorkoutExercise[];
}

interface AssignedClient {
  id: string;
  client_id: string;
  start_date: string;
  end_date: string | null;
  status: string;
  profiles: {
    user_id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface TrainingPlanAnalyticsProps {
  workouts: TrainingPlanWorkout[];
  assignedClients: AssignedClient[];
  durationWeeks: number;
}

export const TrainingPlanAnalytics = ({ 
  workouts, 
  assignedClients,
  durationWeeks 
}: TrainingPlanAnalyticsProps) => {
  const { t } = useTranslation('trainingPlan');

  const DAY_NAMES_SHORT = [
    t('days.shortMon'),
    t('days.shortTue'),
    t('days.shortWed'),
    t('days.shortThu'),
    t('days.shortFri'),
    t('days.shortSat'),
    t('days.shortSun')
  ];

  // Generate mock completion rate data over weeks
  const completionData = Array.from({ length: Math.min(durationWeeks, 12) }, (_, i) => ({
    week: `${t('analytics.week')} ${i + 1}`,
    completion: Math.round(65 + Math.random() * 25 + i * 1.5),
    target: 85
  }));

  // Calculate exercise popularity
  const exerciseFrequency = new Map<string, number>();
  workouts.forEach(workout => {
    workout.exercises?.forEach(exercise => {
      const count = exerciseFrequency.get(exercise.exercise_name) || 0;
      exerciseFrequency.set(exercise.exercise_name, count + 1);
    });
  });

  const exerciseData = Array.from(exerciseFrequency.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Generate client performance heatmap data
  const clientPerformance = assignedClients.slice(0, 5).map(client => {
    const data: any = { name: client.profiles.full_name.split(' ')[0] };
    DAY_NAMES_SHORT.forEach((day, index) => {
      const hasWorkout = workouts.some(w => w.day_of_week === index);
      data[day] = hasWorkout ? Math.round(60 + Math.random() * 35) : 0;
    });
    return data;
  });

  const avgCompletion = completionData.length > 0 
    ? Math.round(completionData.reduce((sum, d) => sum + d.completion, 0) / completionData.length)
    : 0;

  const totalExercises = workouts.reduce((sum, w) => sum + (w.exercises?.length || 0), 0);
  const avgExercisesPerWorkout = workouts.length > 0 
    ? Math.round(totalExercises / workouts.length) 
    : 0;

  const activeClients = assignedClients.filter(c => c.status === 'active').length;

  const getPerformanceColor = (value: number) => {
    if (value >= 85) return 'hsl(var(--chart-green))';
    if (value >= 70) return 'hsl(var(--chart-blue))';
    if (value >= 50) return 'hsl(var(--chart-orange))';
    return 'hsl(var(--chart-slate))';
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-trainer-green/10 to-trainer-green/5 border-trainer-green/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('analytics.completion')}</p>
                <p className="text-3xl font-bold text-trainer-green">{avgCompletion}%</p>
                <p className="text-xs text-muted-foreground mt-1">{t('analytics.averageRate')}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-trainer-green/20 flex items-center justify-center">
                <Target className="h-6 w-6 text-trainer-green" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-trainer-blue/10 to-trainer-blue/5 border-trainer-blue/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('analytics.activeClients')}</p>
                <p className="text-3xl font-bold text-trainer-blue">{activeClients}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('analytics.usingPlan')}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-trainer-blue/20 flex items-center justify-center">
                <Activity className="h-6 w-6 text-trainer-blue" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-trainer-orange/10 to-trainer-orange/5 border-trainer-orange/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('analytics.exercises')}</p>
                <p className="text-3xl font-bold text-trainer-orange">{totalExercises}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('analytics.totalInPlan')}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-trainer-orange/20 flex items-center justify-center">
                <Award className="h-6 w-6 text-trainer-orange" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-trainer-purple/10 to-trainer-purple/5 border-trainer-purple/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('analytics.average')}</p>
                <p className="text-3xl font-bold text-trainer-purple">{avgExercisesPerWorkout}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('analytics.exercisesPerWorkout')}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-trainer-purple/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-trainer-purple" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completion Rate Over Time */}
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-trainer-green" />
            {t('analytics.completionTrend')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={completionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="week" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="completion" 
                stroke="hsl(var(--chart-green))" 
                strokeWidth={3}
                name={t('analytics.completionPercent')}
                dot={{ fill: 'hsl(var(--chart-green))' }}
              />
              <Line 
                type="monotone" 
                dataKey="target" 
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name={t('analytics.targetPercent')}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exercise Popularity */}
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-trainer-orange" />
              {t('analytics.popularExercises')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {exerciseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={exerciseData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    width={120}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" name={t('analytics.usageCount')} radius={[0, 8, 8, 0]}>
                    {exerciseData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`hsl(var(--chart-${['orange', 'blue', 'green', 'purple'][index % 4]}))`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                {t('analytics.noExerciseData')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Performance Heatmap */}
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-trainer-blue" />
              {t('analytics.clientPerformance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={clientPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  {DAY_NAMES_SHORT.map((day, index) => (
                    <Bar 
                      key={day}
                      dataKey={day} 
                      stackId="a"
                      fill={`hsl(var(--chart-${['blue', 'green', 'orange', 'purple', 'blue', 'slate', 'green'][index]}))`}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-center text-muted-foreground">
                <div>
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>{t('analytics.noClients')}</p>
                  <p className="text-sm mt-1">{t('analytics.assignHint')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Distribution */}
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-trainer-purple" />
            {t('analytics.weeklyDistribution')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {DAY_NAMES_SHORT.map((day, index) => {
              const workout = workouts.find(w => w.day_of_week === index);
              const exerciseCount = workout?.exercises?.length || 0;
              
              return (
                <div 
                  key={day}
                  className={`p-4 rounded-lg text-center transition-all ${
                    workout 
                      ? 'bg-gradient-to-br from-trainer-blue/20 to-trainer-purple/20 border border-trainer-blue/30' 
                      : 'bg-muted/30 border border-border/30'
                  }`}
                >
                  <p className="text-xs font-medium text-muted-foreground mb-2">{day}</p>
                  {workout ? (
                    <>
                      <Badge variant="secondary" className="text-xs mb-2">
                        {exerciseCount} {t('analytics.exShort')}
                      </Badge>
                      <p className="text-xs font-medium line-clamp-2">
                        {workout.workout_name}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t('analytics.rest')}</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
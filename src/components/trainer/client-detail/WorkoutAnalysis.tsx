import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { format, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Activity, TrendingUp, Flame, Zap } from 'lucide-react';
import { UnifiedMetric } from '@/hooks/metrics';

interface WorkoutAnalysisProps {
  metrics: UnifiedMetric[];
  clientName: string;
}

export function WorkoutAnalysis({ metrics, clientName }: WorkoutAnalysisProps) {
  const thirtyDaysAgo = useMemo(() => subDays(new Date(), 30), []);

  // Filter workout-related metrics from last 30 days
  const workoutMetrics = useMemo(() => {
    return metrics.filter(m => 
      new Date(m.measurement_date) >= thirtyDaysAgo &&
      (m.metric_name === 'Workout Type' || 
       m.metric_name === 'Day Strain' || 
       m.metric_name === 'Workout Strain' ||
       m.metric_name === 'Workout Duration' ||
       m.metric_name === 'Workout Time')
    );
  }, [metrics, thirtyDaysAgo]);

  // Group workouts by type
  const workoutsByType = useMemo(() => {
    const typeMap = new Map<string, number>();
    
    workoutMetrics
      .filter(m => m.metric_name === 'Workout Type')
      .forEach(m => {
        const type = String(m.value);
        typeMap.set(type, (typeMap.get(type) || 0) + 1);
      });

    return Array.from(typeMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [workoutMetrics]);

  // Prepare strain intensity data
  const strainData = useMemo(() => {
    const strainByDate = new Map<string, { date: string; dayStrain: number; workoutStrain: number }>();
    
    workoutMetrics.forEach(m => {
      const date = m.measurement_date;
      const existing = strainByDate.get(date) || { date, dayStrain: 0, workoutStrain: 0 };
      
      if (m.metric_name === 'Day Strain') {
        existing.dayStrain = m.value;
      } else if (m.metric_name === 'Workout Strain') {
        existing.workoutStrain = m.value;
      }
      
      strainByDate.set(date, existing);
    });

    return Array.from(strainByDate.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14) // Last 14 days
      .map(d => ({
        date: format(new Date(d.date), 'dd MMM', { locale: ru }),
        dayStrain: d.dayStrain,
        workoutStrain: d.workoutStrain
      }));
  }, [workoutMetrics]);

  // Calculate statistics
  const stats = useMemo(() => {
    const workoutCount = workoutsByType.reduce((sum, w) => sum + w.count, 0);
    const dayStrains = workoutMetrics.filter(m => m.metric_name === 'Day Strain');
    const avgStrain = dayStrains.length > 0 
      ? (dayStrains.reduce((sum, m) => sum + m.value, 0) / dayStrains.length).toFixed(1)
      : '0';
    
    const popularType = workoutsByType.length > 0 ? workoutsByType[0].name : 'Нет данных';
    
    // Calculate streak (consecutive days with workouts)
    const sortedDates = [...new Set(workoutMetrics.map(m => m.measurement_date))]
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (const dateStr of sortedDates) {
      const workoutDate = new Date(dateStr);
      workoutDate.setHours(0, 0, 0, 0);
      
      const diffDays = Math.floor((currentDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === streak) {
        streak++;
      } else if (diffDays > streak) {
        break;
      }
    }

    return { workoutCount, avgStrain, popularType, streak };
  }, [workoutMetrics, workoutsByType]);

  // Colors for workout types
  const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 
                  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--muted))'];

  const getStrainZoneColor = (strain: number) => {
    if (strain < 10) return 'hsl(var(--chart-2))'; // Light
    if (strain < 14) return 'hsl(var(--chart-3))'; // Moderate
    if (strain < 18) return 'hsl(var(--chart-4))'; // Hard
    return 'hsl(var(--destructive))'; // All Out
  };

  if (workoutMetrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Анализ тренировок
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">Нет данных о тренировках за последние 30 дней</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Activity className="h-4 w-4" />
              <span className="text-sm">Тренировок</span>
            </div>
            <div className="text-3xl font-bold">{stats.workoutCount}</div>
            <p className="text-xs text-muted-foreground mt-1">за 30 дней</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Flame className="h-4 w-4" />
              <span className="text-sm">Ср. интенсивность</span>
            </div>
            <div className="text-3xl font-bold">{stats.avgStrain}</div>
            <p className="text-xs text-muted-foreground mt-1">Day Strain</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Популярный тип</span>
            </div>
            <div className="text-xl font-bold truncate">{stats.popularType}</div>
            <p className="text-xs text-muted-foreground mt-1">чаще всего</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Zap className="h-4 w-4" />
              <span className="text-sm">Streak</span>
            </div>
            <div className="text-3xl font-bold">{stats.streak}</div>
            <p className="text-xs text-muted-foreground mt-1">дней подряд</p>
          </CardContent>
        </Card>
      </div>

      {/* Workout Types Distribution */}
      {workoutsByType.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Распределение по типам тренировок</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={workoutsByType}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" name="Количество">
                  {workoutsByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Strain Intensity Chart */}
      {strainData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Интенсивность тренировок (Strain)</CardTitle>
              <div className="flex gap-2 text-xs">
                <Badge variant="outline" className="bg-chart-2/10">Light &lt;10</Badge>
                <Badge variant="outline" className="bg-chart-3/10">Moderate 10-14</Badge>
                <Badge variant="outline" className="bg-chart-4/10">Hard 14-18</Badge>
                <Badge variant="outline" className="bg-destructive/10">All Out &gt;18</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={strainData}>
                <defs>
                  <linearGradient id="colorDayStrain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  domain={[0, 20]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="dayStrain" 
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1} 
                  fill="url(#colorDayStrain)"
                  name="Day Strain"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Zap, Target, Calendar } from 'lucide-react';
import { useHabitAnalytics } from '@/hooks/useHabitAnalytics';
import { 
  calculateAnalytics, 
  calculateCompletionTrend, 
  calculateTimeOfDayStats,
  calculateCategoryStats,
  getTopHabits 
} from '@/lib/analytics-utils';

interface AnalyticsViewProps {
  habits: any[];
  userId?: string;
}

export function AnalyticsView({ habits, userId }: AnalyticsViewProps) {
  const { completions, xpHistory, isLoading } = useHabitAnalytics(userId, 30);

  const analytics = useMemo(() => 
    calculateAnalytics(habits, completions),
    [habits, completions]
  );

  const completionTrend = useMemo(() => 
    calculateCompletionTrend(completions, 30),
    [completions]
  );

  const timeOfDayStats = useMemo(() => 
    calculateTimeOfDayStats(habits, completions),
    [habits, completions]
  );

  const categoryStats = useMemo(() => 
    calculateCategoryStats(habits),
    [habits]
  );

  const topHabits = useMemo(() => 
    getTopHabits(habits, completions, 5),
    [habits, completions]
  );

  // Prepare XP trend data (using completion count as proxy)
  const xpTrend = useMemo(() => {
    const dailyXP: Record<string, number> = {};
    
    xpHistory.forEach(item => {
      const date = item.completed_at?.split('T')[0];
      if (date) {
        dailyXP[date] = (dailyXP[date] || 0) + 10; // Default 10 XP per completion
      }
    });

    return Object.entries(dailyXP).map(([date, xp]) => ({
      date,
      xp
    })).slice(-30);
  }, [xpHistory]);

  const timeOfDayChartData = [
    { name: 'Morning', value: timeOfDayStats.morning, fill: 'hsl(var(--chart-1))' },
    { name: 'Afternoon', value: timeOfDayStats.afternoon, fill: 'hsl(var(--chart-2))' },
    { name: 'Evening', value: timeOfDayStats.evening, fill: 'hsl(var(--chart-3))' },
    { name: 'Night', value: timeOfDayStats.night, fill: 'hsl(var(--chart-4))' },
    { name: 'Anytime', value: timeOfDayStats.anytime, fill: 'hsl(var(--chart-5))' }
  ];

  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))'
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{analytics.completionRate}%</div>
                <div className="text-xs text-muted-foreground">Completion Rate</div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <TrendingUp className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{analytics.currentStreak}</div>
                <div className="text-xs text-muted-foreground">Current Streak</div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Zap className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{analytics.totalXP}</div>
                <div className="text-xs text-muted-foreground">Total XP</div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{analytics.activeHabits}</div>
                <div className="text-xs text-muted-foreground">Active Habits</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Completion Trend */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Completion Trend (30 days)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={completionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => new Date(value).getDate().toString()}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="completions" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* XP Earnings */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">XP Earnings</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={xpTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => new Date(value).getDate().toString()}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="xp" 
                  stroke="hsl(var(--chart-2))" 
                  fill="hsl(var(--chart-2))"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Time of Day Distribution */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Best Time of Day</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={timeOfDayChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 11 }}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {timeOfDayChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Category Distribution */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Category Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percentage }) => `${category}: ${percentage}%`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="count"
                >
                  {categoryStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Top Habits List */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top 5 Habits</h3>
          <div className="space-y-3">
            {topHabits.map((habit, index) => (
              <div 
                key={habit.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                  {index + 1}
                </div>
                {habit.icon && (
                  <span className="text-xl">{habit.icon}</span>
                )}
                <div className="flex-1">
                  <div className="font-medium">{habit.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {habit.completionCount} completions · {habit.totalXP} XP
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </ScrollArea>
  );
}

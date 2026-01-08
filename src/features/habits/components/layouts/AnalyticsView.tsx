import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Zap, Target, Calendar, Lightbulb, Trophy } from 'lucide-react';
import { useHabitAnalytics, useHabitInsights } from '@/features/habits/hooks';
import { 
  calculateAnalytics, 
  calculateCompletionTrend, 
  calculateTimeOfDayStats,
  calculateCategoryStats,
  getTopHabits 
} from '@/lib/analytics-utils';
import { InsightCard } from '../analytics/InsightCard';
import { StreakMilestoneTimeline } from '../analytics/StreakMilestoneTimeline';
import { AchievementProgress } from '../analytics/AchievementProgress';
import { ACHIEVEMENT_DEFINITIONS } from '@/lib/gamification/achievement-definitions';

interface AnalyticsViewProps {
  habits: any[];
  userId?: string;
}

export function AnalyticsView({ habits, userId }: AnalyticsViewProps) {
  const { t } = useTranslation('habits');
  const { completions, xpHistory, isLoading } = useHabitAnalytics(userId, 30);
  
  // Get habit insights
  const { 
    patterns, 
    risks, 
    optimizations, 
    achievements, 
    recommendations,
    isLoading: insightsLoading 
  } = useHabitInsights({
    userId,
    habits,
    enabled: !!userId && habits.length > 0,
  });

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
    { name: t('analytics.timeOfDay.morning'), value: timeOfDayStats.morning, fill: 'hsl(var(--chart-1))' },
    { name: t('analytics.timeOfDay.afternoon'), value: timeOfDayStats.afternoon, fill: 'hsl(var(--chart-2))' },
    { name: t('analytics.timeOfDay.evening'), value: timeOfDayStats.evening, fill: 'hsl(var(--chart-3))' },
    { name: t('analytics.timeOfDay.night'), value: timeOfDayStats.night, fill: 'hsl(var(--chart-4))' },
    { name: t('analytics.timeOfDay.anytime'), value: timeOfDayStats.anytime, fill: 'hsl(var(--chart-5))' }
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
        <div className="text-muted-foreground">{t('analytics.loading')}</div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Smart Insights Section */}
        {!insightsLoading && (patterns.length > 0 || risks.length > 0 || optimizations.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                {t('analytics.smartInsights')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="all">{t('analytics.tabs.all')}</TabsTrigger>
                  <TabsTrigger value="patterns">{t('analytics.tabs.patterns')}</TabsTrigger>
                  <TabsTrigger value="risks">{t('analytics.tabs.risks')}</TabsTrigger>
                  <TabsTrigger value="optimize">{t('analytics.tabs.optimize')}</TabsTrigger>
                  <TabsTrigger value="achieve">{t('analytics.tabs.achieve')}</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-3 mt-4">
                  {[...patterns, ...risks, ...optimizations, ...achievements, ...recommendations]
                    .sort((a, b) => b.priority - a.priority)
                    .slice(0, 6)
                    .map(insight => (
                      <InsightCard key={insight.id} insight={insight} />
                    ))}
                </TabsContent>

                <TabsContent value="patterns" className="space-y-3 mt-4">
                  {patterns.length > 0 ? (
                    patterns.map(insight => (
                      <InsightCard key={insight.id} insight={insight} />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {t('analytics.empty.patterns')}
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="risks" className="space-y-3 mt-4">
                  {risks.length > 0 ? (
                    risks.map(insight => (
                      <InsightCard key={insight.id} insight={insight} />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {t('analytics.empty.risks')}
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="optimize" className="space-y-3 mt-4">
                  {optimizations.length > 0 ? (
                    optimizations.map(insight => (
                      <InsightCard key={insight.id} insight={insight} />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {t('analytics.empty.optimize')}
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="achieve" className="space-y-3 mt-4">
                  {achievements.length > 0 ? (
                    achievements.map(insight => (
                      <InsightCard key={insight.id} insight={insight} />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {t('analytics.empty.achieve')}
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Rewards & Achievements Section */}
        <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                {t('analytics.rewards')}
              </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Streak Milestones */}
            <div>
              <h4 className="text-sm font-semibold mb-4">{t('analytics.streakTitle')}</h4>
              <StreakMilestoneTimeline currentStreak={analytics.currentStreak} />
            </div>

            {/* Achievement Progress */}
            <div>
              <h4 className="text-sm font-semibold mb-4">{t('analytics.achievementProgress')}</h4>
              <AchievementProgress
                items={[
                  // Mock data - in real app, calculate from user data
                  {
                    achievement: ACHIEVEMENT_DEFINITIONS[0],
                    progress: Math.min(100, (analytics.currentStreak / 7) * 100),
                    currentValue: analytics.currentStreak,
                    targetValue: 7,
                  },
                  {
                    achievement: ACHIEVEMENT_DEFINITIONS[6],
                    progress: Math.min(100, (analytics.totalCompletions / 50) * 100),
                    currentValue: analytics.totalCompletions,
                    targetValue: 50,
                  },
                ].filter(item => item.progress >= 40 && item.progress < 100)}
                maxItems={5}
              />
            </div>
          </CardContent>
        </Card>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{analytics.completionRate}%</div>
                <div className="text-xs text-muted-foreground">{t('analytics.cards.completionRate')}</div>
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
                <div className="text-xs text-muted-foreground">{t('analytics.cards.currentStreak')}</div>
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
                <div className="text-xs text-muted-foreground">{t('analytics.cards.totalXP')}</div>
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
                <div className="text-xs text-muted-foreground">{t('analytics.cards.activeHabits')}</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Completion Trend */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t('analytics.charts.completionTrend')}</h3>
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
            <h3 className="text-lg font-semibold mb-4">{t('analytics.charts.xpEarned')}</h3>
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
            <h3 className="text-lg font-semibold mb-4">{t('analytics.charts.bestTime')}</h3>
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
            <h3 className="text-lg font-semibold mb-4">{t('analytics.charts.categoryDistribution')}</h3>
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
          <h3 className="text-lg font-semibold mb-4">{t('analytics.charts.topHabits')}</h3>
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
                    {habit.completionCount} {t('analytics.charts.completions')} · {habit.totalXP} XP
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

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWorkoutStats } from '@/hooks/useWorkoutStats';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { rechartsTooltipStyle, rechartsTooltipLabelStyle, rechartsTooltipItemStyle } from '@/lib/chart-styles';
import { chartColors } from '@/lib/chart-colors';
import { Trophy, Target, Award, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StatsModal({ open, onOpenChange }: StatsModalProps) {
  const { t } = useTranslation('workouts');
  const { data: statsWeek } = useWorkoutStats('week');
  const { data: statsMonth } = useWorkoutStats('month');
  const { data: statsAll } = useWorkoutStats('all');

  // Mock data for charts - in production would come from database
  const volumeData = [
    { week: t('statsModal.week', { number: 1 }), volume: 8500 },
    { week: t('statsModal.week', { number: 2 }), volume: 9200 },
    { week: t('statsModal.week', { number: 3 }), volume: 10100 },
    { week: t('statsModal.week', { number: 4 }), volume: 11500 },
  ];

  const frequencyData = [
    { month: t('statsModal.months.aug'), workouts: 12 },
    { month: t('statsModal.months.sep'), workouts: 15 },
    { month: t('statsModal.months.oct'), workouts: 18 },
    { month: t('statsModal.months.nov'), workouts: 16 },
  ];

  const durationData = [
    { day: t('dayNames.mon'), minutes: 60 },
    { day: t('dayNames.tue'), minutes: 0 },
    { day: t('dayNames.wed'), minutes: 75 },
    { day: t('dayNames.thu'), minutes: 0 },
    { day: t('dayNames.fri'), minutes: 90 },
    { day: t('dayNames.sat'), minutes: 45 },
    { day: t('dayNames.sun'), minutes: 0 },
  ];

  const personalRecords = [
    { exerciseKey: 'squats', weight: 140, date: '15.11.2025' },
    { exerciseKey: 'benchPress', weight: 100, date: '12.11.2025' },
    { exerciseKey: 'deadlift', weight: 160, date: '10.11.2025' },
  ];

  const achievements = [
    { nameKey: 'firstWorkout', icon: '🎯', date: '01.09.2025' },
    { nameKey: 'streak7', icon: '🔥', date: '15.11.2025' },
    { nameKey: 'squatPR', icon: '🏆', date: '15.11.2025' },
    { nameKey: 'workouts50', icon: '💪', date: '10.11.2025' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            {t('statsModal.title')}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="charts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="charts">{t('statsModal.charts')}</TabsTrigger>
            <TabsTrigger value="records">{t('statsModal.records')}</TabsTrigger>
            <TabsTrigger value="achievements">{t('statsModal.achievements')}</TabsTrigger>
          </TabsList>

          {/* Charts Tab */}
          <TabsContent value="charts" className="space-y-6">
            {/* Volume Chart */}
            <Card className="glass-card border-border/50">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold">{t('statsModal.volumeByWeek')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={volumeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={rechartsTooltipStyle}
                      labelStyle={rechartsTooltipLabelStyle}
                      itemStyle={rechartsTooltipItemStyle}
                    />
                    <Bar dataKey="volume" fill={chartColors.purple} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Frequency Chart */}
            <Card className="glass-card border-border/50">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-semibold">{t('statsModal.frequency')}</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={frequencyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={rechartsTooltipStyle}
                      labelStyle={rechartsTooltipLabelStyle}
                      itemStyle={rechartsTooltipItemStyle}
                    />
                    <Line
                      type="monotone"
                      dataKey="workouts"
                      stroke={chartColors.cyan}
                      strokeWidth={3}
                      dot={{ fill: chartColors.cyan, r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Duration Chart */}
            <Card className="glass-card border-border/50">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-semibold">{t('statsModal.durationByWeek')}</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={durationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={rechartsTooltipStyle}
                      labelStyle={rechartsTooltipLabelStyle}
                      itemStyle={rechartsTooltipItemStyle}
                    />
                    <Area
                      type="monotone"
                      dataKey="minutes"
                      stroke={chartColors.emerald}
                      fill={chartColors.emerald}
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Personal Records Tab */}
          <TabsContent value="records" className="space-y-4">
            <Card className="glass-card border-border/50">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-semibold">{t('statsModal.personalRecords')}</h3>
                </div>
                <div className="space-y-3">
                  {personalRecords.map((record, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Trophy className="w-5 h-5 text-yellow-400" />
                        <div>
                          <p className="font-semibold">{t(`statsModal.exercises.${record.exerciseKey}`)}</p>
                          <p className="text-sm text-muted-foreground">{record.date}</p>
                        </div>
                      </div>
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500">
                        {record.weight} {t('units.kg')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((achievement, index) => (
                <Card key={index} className="glass-card border-border/50 hover:scale-105 transition-transform">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">{achievement.icon}</div>
                      <div className="flex-1">
                        <p className="font-semibold">{t(`statsModal.achievementsList.${achievement.nameKey}`)}</p>
                        <p className="text-sm text-muted-foreground">{achievement.date}</p>
                      </div>
                      <Award className="w-6 h-6 text-purple-400" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

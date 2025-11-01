/**
 * TrainerAnalyticsDashboard - Аналитическая панель для тренера
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card as TremorCard, Metric, Text, BarChart, DonutChart } from '@tremor/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { QuickActionsPanel } from './QuickActionsPanel';
import { RecentActivityTimeline } from './RecentActivityTimeline';
import { ExportAllClients } from './ExportAllClients';
import { 
  Users, 
  TrendingUp, 
  Activity, 
  Award,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface AnalyticsSummary {
  totalClients: number;
  activeClients: number;
  avgHealthScore: number;
  totalMeasurements: number;
  clientsAtRisk: number;
  topPerformers: number;
}

interface ClientEngagement {
  client_name: string;
  measurements_count: number;
  last_sync: string;
  health_score: number;
}

export function TrainerAnalyticsDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [engagement, setEngagement] = useState<ClientEngagement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    loadAnalytics();
  }, [user?.id]);

  const loadAnalytics = async () => {
    try {
      // Get clients data
      const { data: clients, error: clientsError } = await supabase
        .rpc('get_trainer_clients_enhanced', { p_trainer_id: user!.id });

      if (clientsError) throw clientsError;

      const totalClients = clients?.length || 0;

      // Категории по health_score (не пересекаются)
      const topPerformers = clients?.filter(c => c.health_score >= 80).length || 0;
      const goodPerformers = clients?.filter(c => c.health_score >= 60 && c.health_score < 80).length || 0;
      const needsAttention = clients?.filter(c => c.health_score >= 40 && c.health_score < 60).length || 0;
      const atRisk = clients?.filter(c => c.health_score < 40).length || 0;

      // Активные клиенты (с данными за последние 7 дней)
      const activeClients = clients?.filter(c => c.days_since_last_data <= 7).length || 0;

      // Клиенты с алертами (низкое восстановление или просроченные задачи)
      const clientsWithAlerts = clients?.filter(c => 
        c.low_recovery_alert || c.poor_sleep_alert || c.has_overdue_tasks
      ).length || 0;

      // Средний health score
      const avgHealth = totalClients > 0
        ? clients.reduce((sum, c) => sum + (c.health_score || 0), 0) / totalClients
        : 0;

      // Get total measurements
      const { count, error: countError } = await supabase
        .from('unified_metrics')
        .select('*', { count: 'exact', head: true })
        .in('user_id', clients?.map(c => c.client_id) || [])
        .gte('measurement_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (countError) throw countError;

      console.log('📊 [TrainerAnalyticsDashboard] Analytics loaded:', {
        totalClients,
        activeClients,
        avgHealthScore: Math.round(avgHealth),
        topPerformers,
        goodPerformers,
        needsAttention,
        atRisk,
        clientsWithAlerts,
        totalMeasurements: count || 0,
      });

      setSummary({
        totalClients,
        activeClients,
        avgHealthScore: Math.round(avgHealth),
        totalMeasurements: count || 0,
        clientsAtRisk: clientsWithAlerts,
        topPerformers,
      });

      // Prepare engagement data
      const engagementData = clients?.slice(0, 10).map(c => ({
        client_name: c.full_name || c.username || 'Unknown',
        measurements_count: Number(c.recent_measurements_count) || 0,
        last_sync: c.last_activity_date || 'Never',
        health_score: c.health_score || 0,
      })) || [];

      setEngagement(engagementData);

      // Store categories for health distribution
      (window as any).__healthCategories = {
        topPerformers,
        goodPerformers,
        needsAttention,
        atRisk,
      };
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Загрузка аналитики...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Нет данных</CardTitle>
          <CardDescription>Добавьте клиентов для просмотра аналитики</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  const categories = (window as any).__healthCategories || {
    topPerformers: 0,
    goodPerformers: 0,
    needsAttention: 0,
    atRisk: 0,
  };

  const healthDistribution = [
    { name: 'Отлично (80+)', value: categories.topPerformers, color: COLORS[0] },
    { name: 'Хорошо (60-79)', value: categories.goodPerformers, color: COLORS[1] },
    { name: 'Требует внимания (40-59)', value: categories.needsAttention, color: COLORS[2] },
    { name: 'В зоне риска (<40)', value: categories.atRisk, color: COLORS[3] },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Quick Actions Panel */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Аналитика тренера</h1>
          <p className="text-muted-foreground">Общая статистика и активность клиентов</p>
        </div>
        <ExportAllClients />
      </div>
      
      <QuickActionsPanel />

      {/* Summary Cards - Tremor */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <TremorCard className="glass-medium border-white/10" decoration="top" decorationColor="cyan">
          <div className="flex items-center justify-between">
            <Text>Всего клиентов</Text>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <Metric className="mt-2">{summary.totalClients}</Metric>
          <Text className="text-muted-foreground">
            {summary.activeClients} с данными за 7 дней
          </Text>
        </TremorCard>

        <TremorCard className="glass-medium border-white/10" decoration="top" decorationColor="blue">
          <div className="flex items-center justify-between">
            <Text>Средний Health Score</Text>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <Metric className="mt-2">{summary.avgHealthScore}</Metric>
          <Text className="text-muted-foreground">
            Из 100 возможных
          </Text>
        </TremorCard>

        <TremorCard className="glass-medium border-white/10" decoration="top" decorationColor="amber">
          <div className="flex items-center justify-between">
            <Text>Клиенты с алертами</Text>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </div>
          <Metric className="mt-2 text-amber-500">{summary.clientsAtRisk}</Metric>
          <Text className="text-muted-foreground">
            Низкое восстановление или просроченные задачи
          </Text>
        </TremorCard>

        <TremorCard className="glass-medium border-white/10" decoration="top" decorationColor="emerald">
          <div className="flex items-center justify-between">
            <Text>Топ-исполнители</Text>
            <Award className="h-4 w-4 text-emerald-500" />
          </div>
          <Metric className="mt-2 text-emerald-500">{summary.topPerformers}</Metric>
          <Text className="text-muted-foreground">
            Health Score {'>'} 80
          </Text>
        </TremorCard>
      </div>

      <Tabs defaultValue="engagement" className="space-y-4">
        <TabsList>
          <TabsTrigger value="engagement">Вовлеченность</TabsTrigger>
          <TabsTrigger value="distribution">Распределение</TabsTrigger>
          <TabsTrigger value="timeline">Активность</TabsTrigger>
        </TabsList>

        <TabsContent value="engagement" className="space-y-4">
          <TremorCard className="glass-medium border-white/10">
            <Text className="text-lg font-semibold mb-1">Активность клиентов (последние 7 дней)</Text>
            <Text className="text-muted-foreground mb-4">Количество синхронизированных метрик</Text>
            <BarChart
              className="h-80"
              data={engagement}
              index="client_name"
              categories={['measurements_count']}
              colors={['cyan']}
              valueFormatter={(value) => value.toString()}
              showLegend={false}
              showGridLines={false}
              yAxisWidth={40}
            />
          </TremorCard>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <TremorCard className="glass-medium border-white/10">
            <Text className="text-lg font-semibold mb-4">Распределение клиентов по Health Score</Text>
            <DonutChart
              className="h-80"
              data={healthDistribution}
              category="value"
              index="name"
              colors={['emerald', 'blue', 'amber', 'red']}
              showLabel={true}
              valueFormatter={(value) => value.toString()}
            />
          </TremorCard>
        </TabsContent>
        
        <TabsContent value="timeline" className="space-y-4">
          <RecentActivityTimeline />
        </TabsContent>
      </Tabs>
    </div>
  );
}

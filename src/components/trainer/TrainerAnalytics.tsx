import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Award, 
  AlertTriangle,
  CheckCircle,
  Activity,
  BarChart3,
  Download
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ExportReportsDialog } from "./ExportReportsDialog";
import { ClientProgressCharts } from "./ClientProgressCharts";
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { Card as TremorCard, Metric, Text, BadgeDelta, ProgressBar, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Badge as TremorBadge } from '@tremor/react';

interface ClientStats {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  goals_count: number;
  completed_goals: number;
  recent_measurements: number;
  last_activity: string;
  progress_score: number;
  status: 'excellent' | 'good' | 'needs_attention' | 'inactive';
}

interface OverallStats {
  total_clients: number;
  active_clients: number;
  total_goals: number;
  completed_goals: number;
  recent_measurements: number;
  avg_progress: number;
}

export function TrainerAnalytics() {
  const { user } = useAuth();
  const [clientStats, setClientStats] = useState<ClientStats[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedClientForExport, setSelectedClientForExport] = useState<{id: string, name: string} | null>(null);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user]);

  const loadAnalytics = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await Promise.all([
        loadClientStats(),
        loadOverallStats()
      ]);
    } catch (error: any) {
      console.error('Error loading analytics:', error);
      toast.error('Ошибка загрузки аналитики');
    } finally {
      setLoading(false);
    }
  };

  const loadClientStats = async () => {
    if (!user) return;

    try {
      // Получаем всех клиентов тренера
      const { data: clients, error: clientsError } = await supabase
        .from('trainer_clients')
        .select(`
          id,
          client_id,
          profiles!trainer_clients_client_id_fkey (
            user_id,
            username,
            full_name
          )
        `)
        .eq('trainer_id', user.id)
        .eq('active', true);

      if (clientsError) throw clientsError;

      // Для каждого клиента собираем статистику
      const statsPromises = (clients || []).map(async (client: any) => {
        const profile = client.profiles;
        
        // Получаем цели клиента
        const { data: goals } = await supabase
          .from('goals')
          .select('id')
          .eq('user_id', profile.user_id);

        // Получаем измерения за последние 30 дней
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: recentMeasurements } = await supabase
          .from('measurements')
          .select('id, measurement_date')
          .eq('user_id', profile.user_id)
          .gte('measurement_date', thirtyDaysAgo.toISOString().split('T')[0]);

        // Получаем последнюю активность
        const { data: lastMeasurement } = await supabase
          .from('measurements')
          .select('measurement_date')
          .eq('user_id', profile.user_id)
          .order('measurement_date', { ascending: false })
          .limit(1)
          .single();

        // Вычисляем прогресс и статус
        const goalsCount = goals?.length || 0;
        const completedGoals = 0; // Будет вычислено на основе достижения целей
        const recentMeasurementsCount = recentMeasurements?.length || 0;
        const lastActivity = lastMeasurement?.measurement_date || '';
        
        // Вычисляем очки прогресса (0-100)
        let progressScore = 0;
        if (goalsCount > 0) progressScore += 20;
        if (recentMeasurementsCount > 0) progressScore += 30;
        if (recentMeasurementsCount >= 4) progressScore += 25; // Регулярные измерения
        if (lastActivity && new Date(lastActivity) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
          progressScore += 25; // Активность за последнюю неделю
        }

        // Определяем статус
        let status: ClientStats['status'] = 'inactive';
        if (progressScore >= 80) status = 'excellent';
        else if (progressScore >= 60) status = 'good';
        else if (progressScore >= 30) status = 'needs_attention';

        return {
          id: client.id,
          user_id: profile.user_id,
          username: profile.username,
          full_name: profile.full_name,
          goals_count: goalsCount,
          completed_goals: completedGoals,
          recent_measurements: recentMeasurementsCount,
          last_activity: lastActivity,
          progress_score: progressScore,
          status
        };
      });

      const stats = await Promise.all(statsPromises);
      setClientStats(stats);
    } catch (error: any) {
      console.error('Error loading client stats:', error);
    }
  };

  const loadOverallStats = async () => {
    if (!user) return;

    try {
      // Подсчитываем общую статистику
      const { data: clientsCount } = await supabase
        .from('trainer_clients')
        .select('id', { count: 'exact' })
        .eq('trainer_id', user.id)
        .eq('active', true);

      const { data: goalsCount } = await supabase
        .from('goals')
        .select('id', { count: 'exact' })
        .in('user_id', clientStats.map(c => c.user_id));

      // Измерения за последние 30 дней
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: recentMeasurements } = await supabase
        .from('measurements')
        .select('id', { count: 'exact' })
        .in('user_id', clientStats.map(c => c.user_id))
        .gte('measurement_date', thirtyDaysAgo.toISOString().split('T')[0]);

      const totalClients = clientsCount?.length || 0;
      const activeClients = clientStats.filter(c => c.status !== 'inactive').length;
      const avgProgress = totalClients > 0 
        ? clientStats.reduce((sum, c) => sum + c.progress_score, 0) / totalClients 
        : 0;

      setOverallStats({
        total_clients: totalClients,
        active_clients: activeClients,
        total_goals: goalsCount?.length || 0,
        completed_goals: 0, // Будет вычислено
        recent_measurements: recentMeasurements?.length || 0,
        avg_progress: Math.round(avgProgress)
      });
    } catch (error: any) {
      console.error('Error loading overall stats:', error);
    }
  };

  const getStatusIcon = (status: ClientStats['status']) => {
    switch (status) {
      case 'excellent':
        return <Award className="h-4 w-4 text-green-600" />;
      case 'good':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'needs_attention':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'inactive':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: ClientStats['status']) => {
    switch (status) {
      case 'excellent':
        return 'Отлично';
      case 'good':
        return 'Хорошо';
      case 'needs_attention':
        return 'Требует внимания';
      case 'inactive':
        return 'Неактивен';
      default:
        return status;
    }
  };

  const getStatusColor = (status: ClientStats['status']) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'good':
        return 'bg-blue-100 text-blue-800';
      case 'needs_attention':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Аналитика и статистика</h2>
          <p className="text-muted-foreground">Отслеживайте прогресс всех подопечных</p>
        </div>
        <Button onClick={() => setExportOpen(true)} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Экспорт отчета
        </Button>
      </div>
      
      <ExportReportsDialog 
        open={exportOpen}
        onOpenChange={setExportOpen}
        clientId={selectedClientForExport?.id}
        clientName={selectedClientForExport?.name}
      />

      {/* Общая статистика */}
      {overallStats && (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <motion.div variants={staggerItem}>
            <TremorCard className="glass-medium border-white/10" decoration="top" decorationColor="cyan">
              <div className="flex items-center justify-between">
                <Text>Всего подопечных</Text>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <Metric className="mt-2">{overallStats.total_clients}</Metric>
              <Text className="text-xs mt-1">
                Активных: {overallStats.active_clients}
              </Text>
              <BadgeDelta 
                deltaType={overallStats.active_clients > 0 ? "moderateIncrease" : "unchanged"} 
                className="mt-2"
              >
                {overallStats.total_clients > 0 ? Math.round((overallStats.active_clients / overallStats.total_clients) * 100) : 0}% активность
              </BadgeDelta>
            </TremorCard>
          </motion.div>

          <motion.div variants={staggerItem}>
            <TremorCard className="glass-medium border-white/10" decoration="top" decorationColor="purple">
              <div className="flex items-center justify-between">
                <Text>Активных целей</Text>
                <Target className="h-4 w-4 text-muted-foreground" />
              </div>
              <Metric className="mt-2">{overallStats.total_goals}</Metric>
              <Text className="text-xs mt-1">
                Завершено: {overallStats.completed_goals}
              </Text>
            </TremorCard>
          </motion.div>

          <motion.div variants={staggerItem}>
            <TremorCard className="glass-medium border-white/10" decoration="top" decorationColor="orange">
              <div className="flex items-center justify-between">
                <Text>Измерений за месяц</Text>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <Metric className="mt-2">{overallStats.recent_measurements}</Metric>
              <Text className="text-xs mt-1">Последние 30 дней</Text>
            </TremorCard>
          </motion.div>

          <motion.div variants={staggerItem}>
            <TremorCard className="glass-medium border-white/10" decoration="top" decorationColor="emerald">
              <div className="flex items-center justify-between">
                <Text>Средний прогресс</Text>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <Metric className="mt-2">{overallStats.avg_progress}%</Metric>
              <ProgressBar 
                value={overallStats.avg_progress} 
                color="emerald" 
                className="mt-2" 
              />
            </TremorCard>
          </motion.div>
        </motion.div>
      )}

      {/* Статистика по клиентам */}
      <TremorCard className="glass-medium border-white/10">
        <CardHeader>
          <CardTitle>Детальная статистика по подопечным</CardTitle>
          <CardDescription>
            Прогресс и активность каждого подопечного
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clientStats.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">Нет подопечных</h3>
              <p className="text-muted-foreground">
                Добавьте подопечных для просмотра аналитики
              </p>
            </div>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Клиент</TableHeaderCell>
                  <TableHeaderCell>Цели</TableHeaderCell>
                  <TableHeaderCell>Активность</TableHeaderCell>
                  <TableHeaderCell>Прогресс</TableHeaderCell>
                  <TableHeaderCell>Статус</TableHeaderCell>
                  <TableHeaderCell>Последнее измерение</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clientStats.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{client.full_name || client.username}</div>
                        <div className="text-xs text-muted-foreground">@{client.username}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        <span>{client.goals_count}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        <span>{client.recent_measurements}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Text className="text-xs font-medium">{client.progress_score}%</Text>
                        <ProgressBar 
                          value={client.progress_score} 
                          color={
                            client.progress_score >= 80 ? 'emerald' :
                            client.progress_score >= 60 ? 'blue' :
                            client.progress_score >= 30 ? 'yellow' : 'red'
                          }
                          className="w-24"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <TremorBadge 
                        color={
                          client.status === 'excellent' ? 'emerald' :
                          client.status === 'good' ? 'blue' :
                          client.status === 'needs_attention' ? 'yellow' : 'red'
                        }
                        icon={
                          client.status === 'excellent' ? Award :
                          client.status === 'good' ? CheckCircle :
                          client.status === 'needs_attention' ? AlertTriangle : TrendingDown
                        }
                      >
                        {getStatusLabel(client.status)}
                      </TremorBadge>
                    </TableCell>
                    <TableCell>
                      {client.last_activity && (
                        <Text className="text-xs">
                          {new Date(client.last_activity).toLocaleDateString('ru')}
                        </Text>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </TremorCard>

      {/* Рекомендации */}
      <Card>
        <CardHeader>
          <CardTitle>Рекомендации</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {clientStats.filter(c => c.status === 'inactive').length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-red-800">
                    {clientStats.filter(c => c.status === 'inactive').length} неактивных подопечных
                  </p>
                  <p className="text-red-700">
                    Свяжитесь с ними или создайте мотивационный пост
                  </p>
                </div>
              </div>
            )}
            
            {clientStats.filter(c => c.status === 'needs_attention').length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">
                    {clientStats.filter(c => c.status === 'needs_attention').length} подопечных требуют внимания
                  </p>
                  <p className="text-yellow-700">
                    Проверьте их цели и предложите поддержку
                  </p>
                </div>
              </div>
            )}
            
            {clientStats.filter(c => c.status === 'excellent').length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Award className="h-4 w-4 text-green-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-green-800">
                    {clientStats.filter(c => c.status === 'excellent').length} подопечных показывают отличные результаты
                  </p>
                  <p className="text-green-700">
                    Поделитесь их успехами для мотивации других
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
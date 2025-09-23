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
  BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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
      <div>
        <h2 className="text-2xl font-bold">Аналитика и статистика</h2>
        <p className="text-muted-foreground">Отслеживайте прогресс всех подопечных</p>
      </div>

      {/* Общая статистика */}
      {overallStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего подопечных</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.total_clients}</div>
              <p className="text-xs text-muted-foreground">
                Активных: {overallStats.active_clients}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Активных целей</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.total_goals}</div>
              <p className="text-xs text-muted-foreground">
                Завершено: {overallStats.completed_goals}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Измерений за месяц</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.recent_measurements}</div>
              <p className="text-xs text-muted-foreground">
                Последние 30 дней
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Средний прогресс</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.avg_progress}%</div>
              <Progress value={overallStats.avg_progress} className="h-2 mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Статистика по клиентам */}
      <Card>
        <CardHeader>
          <CardTitle>Детальная статистика по подопечным</CardTitle>
          <CardDescription>
            Прогресс и активность каждого подопечного
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {clientStats.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">Нет подопечных</h3>
                <p className="text-muted-foreground">
                  Добавьте подопечных для просмотра аналитики
                </p>
              </div>
            ) : (
              clientStats.map((client) => (
                <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div>
                      <h4 className="font-medium">{client.full_name || client.username}</h4>
                      <p className="text-sm text-muted-foreground">@{client.username}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        <span>{client.goals_count} целей</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Activity className="h-3 w-3" />
                        <span>{client.recent_measurements} измерений</span>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-bold">{client.progress_score}%</div>
                      <Progress value={client.progress_score} className="h-2 w-16" />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {getStatusIcon(client.status)}
                      <Badge className={getStatusColor(client.status)}>
                        {getStatusLabel(client.status)}
                      </Badge>
                    </div>
                    
                    {client.last_activity && (
                      <div className="text-xs text-muted-foreground text-right">
                        <div>Последняя активность:</div>
                        <div>{new Date(client.last_activity).toLocaleDateString()}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

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
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  Target, 
  TrendingUp, 
  Calendar,
  ChevronRight,
  User,
  Clock,
  Trophy
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Client {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  goals_count: number;
  progress_percentage: number;
  last_measurement_date?: string;
}

interface TrainerStats {
  activeClients: number;
  averageProgress: number;
  goalsAchieved: number;
  updatesThisWeek: number;
}

interface TrainerOverviewProps {
  onClientSelect?: (client: Client) => void;
}

export function TrainerOverview({ onClientSelect }: TrainerOverviewProps) {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<TrainerStats>({
    activeClients: 0,
    averageProgress: 0,
    goalsAchieved: 0,
    updatesThisWeek: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTrainerData();
    }
  }, [user]);

  const loadTrainerData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Загружаем клиентов тренера
      const { data: trainerClients, error: clientsError } = await supabase
        .from('trainer_clients')
        .select(`
          id,
          client_id,
          profiles!trainer_clients_client_id_fkey (
            user_id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('trainer_id', user.id)
        .eq('active', true);

      if (clientsError) throw clientsError;

      // Для каждого клиента загружаем статистику
      const clientsWithStats = await Promise.all(
        (trainerClients || []).map(async (tc: any) => {
          const profile = tc.profiles;
          
          // Подсчитываем цели
          const { count: goalsCount } = await supabase
            .from('goals')
            .select('*', { count: 'exact' })
            .eq('user_id', profile.user_id);

          // Получаем последние измерения для расчета прогресса
          const { data: measurements } = await supabase
            .from('measurements')
            .select(`
              value,
              measurement_date,
              goals (target_value)
            `)
            .eq('user_id', profile.user_id)
            .order('measurement_date', { ascending: false })
            .limit(10);

          // Рассчитываем средний прогресс (упрощенно)
          let progressPercentage = 0;
          if (measurements && measurements.length > 0) {
            const progresses = measurements
              .filter(m => m.goals?.target_value)
              .map(m => Math.min(100, (m.value / (m.goals?.target_value || 1)) * 100));
            
            if (progresses.length > 0) {
              progressPercentage = progresses.reduce((sum, p) => sum + p, 0) / progresses.length;
            }
          }

          // Последнее измерение
          const lastMeasurement = measurements?.[0]?.measurement_date;

          return {
            id: tc.id,
            user_id: profile.user_id,
            username: profile.username,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            goals_count: goalsCount || 0,
            progress_percentage: Math.round(progressPercentage),
            last_measurement_date: lastMeasurement
          };
        })
      );

      // Рассчитываем общую статистику
      const activeClients = clientsWithStats.length;
      const averageProgress = Math.round(
        clientsWithStats.reduce((sum, client) => sum + client.progress_percentage, 0) / 
        Math.max(1, activeClients)
      );

      // Подсчитываем достигнутые цели за последний месяц
      const { count: goalsAchieved } = await supabase
        .from('goals')
        .select('*', { count: 'exact' })
        .in('user_id', clientsWithStats.map(c => c.user_id))
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Подсчитываем обновления за неделю
      const { count: updatesThisWeek } = await supabase
        .from('measurements')
        .select('*', { count: 'exact' })
        .in('user_id', clientsWithStats.map(c => c.user_id))
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      setClients(clientsWithStats);
      setStats({
        activeClients,
        averageProgress,
        goalsAchieved: goalsAchieved || 0,
        updatesThisWeek: updatesThisWeek || 0
      });

    } catch (error) {
      console.error('Error loading trainer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Нет данных';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Вчера';
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return date.toLocaleDateString('ru-RU');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Активных участников</CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.activeClients}</div>
            <Badge variant="secondary" className="mt-1 bg-orange-100 text-orange-700 border-orange-200">
              +14%
            </Badge>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Средний прогресс</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.averageProgress}%</div>
            <Badge variant="secondary" className="mt-1 bg-green-100 text-green-700 border-green-200">
              +8%
            </Badge>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Целей достигнуто</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.goalsAchieved}</div>
            <p className="text-xs text-muted-foreground">/мес</p>
            <Badge variant="secondary" className="mt-1 bg-blue-100 text-blue-700 border-blue-200">
              +12%
            </Badge>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Обновлений сегодня</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.updatesThisWeek}</div>
          </CardContent>
        </Card>
      </div>

      {/* Общий прогресс команды */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-orange-500" />
              Общий прогресс команды
            </CardTitle>
          </div>
          <Link to="/trainer-dashboard">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              Посмотреть всех
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {clients.slice(0, 4).map((client) => (
              <div 
                key={client.id} 
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => onClientSelect?.(client)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={client.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {getInitials(client.full_name || client.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{client.full_name || client.username}</p>
                    <p className="text-sm text-muted-foreground">{client.goals_count} цели</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right min-w-0">
                    <div className="flex items-center gap-2">
                      <Progress value={client.progress_percentage} className="w-20 h-2" />
                      <span className="text-sm font-medium">{client.progress_percentage}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(client.last_measurement_date)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
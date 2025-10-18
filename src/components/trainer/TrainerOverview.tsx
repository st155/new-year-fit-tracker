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
  Trophy,
  Sparkles,
  AlertTriangle,
  PartyPopper,
  Zap
} from "lucide-react";
import { useClientContext } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAIPendingActions } from "@/hooks/useAIPendingActions";
import { TrainerAIWidget } from "./TrainerAIWidget";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const { setSelectedClient } = useClientContext();
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<TrainerStats>({
    activeClients: 0,
    averageProgress: 0,
    goalsAchieved: 0,
    updatesThisWeek: 0
  });
  const [loading, setLoading] = useState(true);
  const { pendingActions } = useAIPendingActions(user?.id);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const aiInput = document.querySelector('[data-ai-input]') as HTMLTextAreaElement;
        aiInput?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        navigate('/trainer-dashboard?tab=ai-hub');
      }
    };
    
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [navigate]);

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

  // Generate contextual suggestions
  const contextSuggestions: { text: string; icon: string }[] = [];
  if (stats.updatesThisWeek === 0) {
    contextSuggestions.push({ 
      text: "Кто не обновлял прогресс эту неделю?",
      icon: "📊"
    });
  }
  if (stats.averageProgress < 50) {
    contextSuggestions.push({ 
      text: "Кому нужна мотивация?",
      icon: "💪"
    });
  }
  const clientsWithNoProgress = clients.filter(c => c.progress_percentage === 0);
  if (clientsWithNoProgress.length > 0) {
    contextSuggestions.push({ 
      text: `${clientsWithNoProgress.length} клиента нужно внимание`,
      icon: "⚠️"
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 stagger-fade-in">
      {/* Левая колонка - основной контент */}
      <div className="space-y-6">
        {/* Статистика */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
        <Card className="bg-slate-900/50 border-slate-800 hover:border-trainer-orange/30 transition-all duration-300 hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Активных участников
              </CardTitle>
              <div className="text-3xl font-bold text-white">{stats.activeClients}</div>
              <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-0">
                +14%
              </Badge>
            </div>
            <div className="h-12 w-12 rounded-full bg-trainer-orange/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-trainer-orange" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 hover:border-trainer-green/30 transition-all duration-300 hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Средний прогресс
              </CardTitle>
              <div className="text-3xl font-bold text-white">{stats.averageProgress}%</div>
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0">
                +8%
              </Badge>
            </div>
            <div className="h-12 w-12 rounded-full bg-trainer-green/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-trainer-green" />
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800 hover:border-trainer-blue/30 transition-all duration-300 hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Целей достигнуто
              </CardTitle>
              <div className="text-3xl font-bold text-white">{stats.goalsAchieved}</div>
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0">
                +12%
              </Badge>
            </div>
            <div className="h-12 w-12 rounded-full bg-trainer-blue/10 flex items-center justify-center">
              <Target className="h-6 w-6 text-trainer-blue" />
            </div>
          </CardHeader>
        </Card>

          <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all duration-300 hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-2">
                <CardTitle className="text-sm font-medium text-slate-400">
                  Обновлений сегодня
                </CardTitle>
                <div className="text-3xl font-bold text-white">{stats.updatesThisWeek}</div>
              </div>
              <div className="h-12 w-12 rounded-full bg-slate-700/30 flex items-center justify-center">
                <Clock className="h-6 w-6 text-slate-400" />
              </div>
            </CardHeader>
          </Card>

          <Card className="bg-purple-900/30 border-purple-700/30 hover:border-purple-600/50 transition-all duration-300 hover-lift cursor-pointer" onClick={() => navigate('/trainer-dashboard?tab=ai-hub')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-2">
                <CardTitle className="text-sm font-medium text-slate-400">
                  AI Actions
                </CardTitle>
                <div className="text-3xl font-bold text-white">{pendingActions.length}</div>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="p-0 h-auto text-purple-400 hover:text-purple-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/trainer-dashboard?tab=ai-hub');
                  }}
                >
                  Review →
                </Button>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-purple-400" />
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* AI Insights Panel */}
        {contextSuggestions.length > 0 && (
          <Card className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-700/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5 text-purple-400" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {clientsWithNoProgress.length > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-black/20 rounded-lg hover:bg-black/30 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="h-4 w-4 text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{clientsWithNoProgress.length} клиента нужно внимание</p>
                      <p className="text-xs text-slate-400">Нет обновлений прогресса</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => {
                        const aiInput = document.querySelector('[data-ai-input]') as HTMLTextAreaElement;
                        if (aiInput) {
                          aiInput.value = "Покажи клиентов, которым нужно внимание";
                          aiInput.focus();
                        }
                      }}
                      className="hover:bg-purple-500/10"
                    >
                      Ask AI
                    </Button>
                  </div>
                )}
                
                {stats.goalsAchieved > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-black/20 rounded-lg hover:bg-black/30 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <PartyPopper className="h-4 w-4 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{stats.goalsAchieved} целей достигнуто</p>
                      <p className="text-xs text-slate-400">За последний месяц</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="hover:bg-green-500/10"
                    >
                      Details
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Общий прогресс команды */}
        <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <Trophy className="h-5 w-5 text-trainer-orange" />
            Общий прогресс команды
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2 bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200"
            onClick={() => {/* Already on dashboard */}}
          >
            Посмотреть всех
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {clients.slice(0, 4).map((client, idx) => (
              <div 
                key={client.id} 
                className="flex items-center justify-between p-4 bg-slate-900/30 rounded-xl hover:bg-slate-800/50 transition-all duration-300 cursor-pointer group hover-lift border border-slate-800/50 hover:border-slate-700"
                onClick={() => {
                  setSelectedClient(client, { type: 'overview' });
                  onClientSelect?.(client);
                }}
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border-2 border-trainer-orange/20">
                    <AvatarImage src={client.avatar_url} />
                    <AvatarFallback className="bg-trainer-orange/10 text-trainer-orange font-bold">
                      {getInitials(client.full_name || client.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-white">{client.full_name || client.username}</p>
                    <p className="text-sm text-slate-400">{client.goals_count} цели</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right min-w-[120px]">
                    <div className="flex items-center gap-2 mb-1">
                      <Progress 
                        value={client.progress_percentage} 
                        className="w-24 h-2 bg-slate-800"
                      />
                      <span className="text-sm font-bold text-white">{client.progress_percentage}%</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {formatDate(client.last_measurement_date)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-500/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `/trainer-dashboard?tab=ai-hub&client=${client.user_id}`;
                    }}
                  >
                    <Sparkles className="h-5 w-5 text-purple-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        </Card>
      </div>

      {/* Правая колонка - AI окно (только на desktop) */}
      <div className="hidden lg:block">
        <div className="sticky top-6">
          <TrainerAIWidget 
            mode="overview"
            contextSuggestions={contextSuggestions}
            stats={stats}
            clients={clients}
          />
        </div>
      </div>
    </div>
  );
}
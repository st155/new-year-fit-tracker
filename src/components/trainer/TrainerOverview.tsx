import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Target, 
  TrendingUp, 
  Trophy,
  Sparkles,
  AlertTriangle,
  PartyPopper,
  Zap,
  Moon,
  Flame,
  Activity,
  ChevronRight
} from "lucide-react";
import { useClientContext } from "@/contexts/ClientContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAIPendingActions } from "@/hooks/useAIPendingActions";
import { TrainerAIWidget } from "./TrainerAIWidget";
import { useNavigate } from "react-router-dom";
import { TrainerStatCard, TrainerClientCard } from "./ui";

interface Client {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  goals_count: number;
  progress_percentage: number;
  last_measurement_date?: string;
  whoop_recovery_avg?: number;
  sleep_hours_avg?: number;
  weight_latest?: number;
}

interface TrainerStats {
  activeClients: number;
  averageProgress: number;
  goalsAchieved: number;
  updatesThisWeek: number;
  previousPeriodClients?: number;
  previousPeriodGoals?: number;
  clientsGrowth?: number[];
}

interface TrainerOverviewProps {
  onClientSelect?: (client: Client) => void;
}

export function TrainerOverview({ onClientSelect }: TrainerOverviewProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setSelectedClient } = useClientContext();
  const [clients, setClients] = useState<Client[]>([]);
  const [displayedClients, setDisplayedClients] = useState<Client[]>([]);
  const [clientsPage, setClientsPage] = useState(1);
  const [stats, setStats] = useState<TrainerStats>({
    activeClients: 0,
    averageProgress: 0,
    goalsAchieved: 0,
    updatesThisWeek: 0
  });
  const [loading, setLoading] = useState(true);
  const { pendingActions } = useAIPendingActions(user?.id);

  const CLIENTS_PER_PAGE = 6;

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

  useEffect(() => {
    const start = 0;
    const end = clientsPage * CLIENTS_PER_PAGE;
    setDisplayedClients(clients.slice(start, end));
  }, [clients, clientsPage]);

  const loadTrainerData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get current period data
      const { data: trainerClientsData, error: rpcError } = await supabase
        .rpc('get_trainer_clients_summary', { p_trainer_id: user.id });

      if (rpcError) throw rpcError;

      const clientsWithStats = (trainerClientsData || []).map((tc: any) => ({
        id: tc.client_id,
        user_id: tc.client_id,
        username: tc.username,
        full_name: tc.full_name,
        avatar_url: tc.avatar_url,
        goals_count: tc.active_goals_count || 0,
        progress_percentage: 0,
        last_measurement_date: tc.last_activity_date,
        whoop_recovery_avg: tc.health_summary?.whoop_recovery_avg,
        sleep_hours_avg: tc.health_summary?.sleep_hours_avg,
        weight_latest: tc.health_summary?.weight_latest
      }));

      // Calculate current stats
      const activeClients = clientsWithStats.length;
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const updatesThisWeek = clientsWithStats.filter((c: Client) => 
        c.last_measurement_date && new Date(c.last_measurement_date) > weekAgo
      ).length;

      // Get previous period data (30 days ago)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

      const { count: previousClients } = await supabase
        .from('trainer_clients')
        .select('id', { count: 'exact' })
        .eq('trainer_id', user.id)
        .eq('active', true)
        .lt('created_at', thirtyDaysAgo.toISOString());

      // Goals achieved this month vs last month
      const { count: currentGoals } = await supabase
        .from('goals')
        .select('id', { count: 'exact' })
        .in('user_id', clientsWithStats.map((c: Client) => c.user_id))
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { count: previousGoals } = await supabase
        .from('goals')
        .select('id', { count: 'exact' })
        .in('user_id', clientsWithStats.map((c: Client) => c.user_id))
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString());

      // Calculate growth data for sparklines (last 7 days)
      const clientsGrowth: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const { count } = await supabase
          .from('trainer_clients')
          .select('id', { count: 'exact' })
          .eq('trainer_id', user.id)
          .eq('active', true)
          .lte('created_at', dayStart.toISOString());
        clientsGrowth.push(count || 0);
      }

      setClients(clientsWithStats);
      setStats({
        activeClients,
        averageProgress: 0,
        goalsAchieved: currentGoals || 0,
        updatesThisWeek,
        previousPeriodClients: previousClients || 0,
        previousPeriodGoals: previousGoals || 0,
        clientsGrowth
      });

    } catch (error) {
      console.error('Error loading trainer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateHealthScore = (client: Client): number => {
    let score = 50; // Base score
    
    if (client.whoop_recovery_avg) {
      score = Math.max(score, client.whoop_recovery_avg);
    }
    
    if (client.goals_count > 0) score += 10;
    if (client.last_measurement_date) {
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(client.last_measurement_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceUpdate <= 1) score += 20;
      else if (daysSinceUpdate <= 3) score += 10;
    }
    
    return Math.min(100, score);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Нет данных';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Активен сегодня';
    if (diffDays === 1) return 'Активен вчера';
    if (diffDays < 7) return `Активен ${diffDays} дн. назад`;
    return `Последняя активность: ${date.toLocaleDateString('ru-RU')}`;
  };

  const calculateTrend = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

  const clientsNeedingAttention = clients.filter(c => calculateHealthScore(c) < 60);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
      <div className="space-y-6">
        {/* Improved Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
          <TrainerStatCard
            title="Активных клиентов"
            value={stats.activeClients}
            icon={<Users className="h-6 w-6" />}
            trend={calculateTrend(stats.activeClients, stats.previousPeriodClients || 0)}
            color="orange"
            subtitle="За последние 30 дней"
            sparklineData={stats.clientsGrowth}
          />

          <TrainerStatCard
            title="Средний прогресс"
            value={`${stats.averageProgress}%`}
            icon={<TrendingUp className="h-6 w-6" />}
            color="green"
            subtitle="Общий показатель"
          />

          <TrainerStatCard
            title="Целей создано"
            value={stats.goalsAchieved}
            icon={<Target className="h-6 w-6" />}
            trend={calculateTrend(stats.goalsAchieved, stats.previousPeriodGoals || 0)}
            color="blue"
            subtitle="За последний месяц"
          />

          <TrainerStatCard
            title="Активных сегодня"
            value={stats.updatesThisWeek}
            icon={<Activity className="h-6 w-6" />}
            color="default"
            subtitle="Обновлений эту неделю"
          />

          <Card 
            className="bg-purple-900/30 border-purple-700/30 hover:border-purple-600/50 transition-all duration-300 hover:scale-[1.02] cursor-pointer" 
            onClick={() => navigate('/trainer-dashboard?tab=ai-hub')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-2 flex-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  AI Actions
                </CardTitle>
                <div className="text-3xl font-bold">{pendingActions.length}</div>
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
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-6 w-6 text-purple-400" />
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Enhanced AI Insights Panel */}
        {clientsNeedingAttention.length > 0 && (
          <Card className="border-purple-700/30 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-transparent backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-400" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-orange-500/10 to-transparent rounded-lg border border-orange-500/20 hover:border-orange-500/30 transition-colors">
                  <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{clientsNeedingAttention.length} клиента нуждаются во внимании</p>
                    <p className="text-sm text-muted-foreground mt-1">Низкая активность или нет обновлений</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-orange-500/30 hover:bg-orange-500/10"
                    onClick={() => {
                      const aiInput = document.querySelector('[data-ai-input]') as HTMLTextAreaElement;
                      if (aiInput) {
                        aiInput.value = "Покажи клиентов, которым нужно внимание";
                        aiInput.focus();
                      }
                    }}
                  >
                    Спросить AI
                  </Button>
                </div>
                
                {stats.goalsAchieved > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-green-500/10 to-transparent rounded-lg border border-green-500/20 hover:border-green-500/30 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <PartyPopper className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{stats.goalsAchieved} целей создано</p>
                      <p className="text-sm text-muted-foreground mt-1">За последний месяц</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-green-500/30 hover:bg-green-500/10"
                    >
                      Детали
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modern Client Cards */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-trainer-orange" />
              Ваши клиенты
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2"
              onClick={() => navigate('/trainer-dashboard?tab=clients')}
            >
              Посмотреть всех
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedClients.map((client) => (
                <TrainerClientCard
                  key={client.id}
                  client={client}
                  healthScore={calculateHealthScore(client)}
                  metrics={[
                    ...(client.whoop_recovery_avg ? [{
                      name: 'Recovery',
                      value: client.whoop_recovery_avg,
                      unit: '%',
                      icon: <Zap className="h-4 w-4" />,
                      color: 'green' as const
                    }] : []),
                    ...(client.sleep_hours_avg ? [{
                      name: 'Sleep',
                      value: client.sleep_hours_avg.toFixed(1),
                      unit: 'h',
                      icon: <Moon className="h-4 w-4" />,
                      color: 'blue' as const
                    }] : []),
                    ...(client.weight_latest ? [{
                      name: 'Weight',
                      value: client.weight_latest.toFixed(1),
                      unit: 'kg',
                      icon: <Flame className="h-4 w-4" />,
                      color: 'orange' as const
                    }] : [])
                  ]}
                  isActive={client.last_measurement_date ? 
                    (Date.now() - new Date(client.last_measurement_date).getTime()) < 24 * 60 * 60 * 1000 
                    : false}
                  lastActivity={formatDate(client.last_measurement_date)}
                  onViewDetails={() => {
                    setSelectedClient(client, { type: 'overview' });
                    onClientSelect?.(client);
                  }}
                  onAskAI={() => {
                    navigate(`/trainer-dashboard?tab=ai-hub&client=${client.user_id}`);
                  }}
                />
              ))}
            </div>

            {clients.length > displayedClients.length && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="outline"
                  onClick={() => setClientsPage(prev => prev + 1)}
                  className="w-full max-w-xs"
                >
                  Загрузить ещё ({clients.length - displayedClients.length})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Widget Sidebar */}
      <div className="hidden lg:block">
        <div className="sticky top-6">
          <TrainerAIWidget />
        </div>
      </div>
    </div>
  );
}

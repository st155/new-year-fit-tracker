import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrainerAIWidget } from '@/components/trainer/TrainerAIWidget';
import { AIQuickActionsPanel } from '@/components/trainer/AIQuickActionsPanel';
import { useAIPendingActions } from '@/hooks/useAIPendingActions';
import { useAuth } from '@/hooks/useAuth';
import { Users, Target, CheckCircle, Clock, Activity, LayoutDashboard, Dumbbell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface QuickStat {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

export default function TrainerIndexPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pendingActions } = useAIPendingActions(user?.id);
  const [stats, setStats] = useState<QuickStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    try {
      const { count: activeClients } = await supabase
        .from('trainer_clients')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', user.id)
        .eq('active', true);

      // Get trainer clients first
      const { data: trainerClients } = await supabase
        .from('trainer_clients')
        .select('client_id')
        .eq('trainer_id', user.id)
        .eq('active', true);

      const clientIds = (trainerClients || []).map(tc => tc.client_id);

      const { count: activeGoals } = await supabase
        .from('goals')
        .select('*', { count: 'exact', head: true })
        .in('user_id', clientIds);

      const { count: completedToday } = await supabase
        .from('measurements')
        .select('*', { count: 'exact', head: true })
        .in('user_id', clientIds)
        .gte('created_at', new Date().toISOString().split('T')[0]);

      setStats([
        {
          label: 'Активных клиентов',
          value: activeClients || 0,
          icon: <Users className="h-5 w-5" />,
          color: 'text-blue-500'
        },
        {
          label: 'Активных целей',
          value: activeGoals || 0,
          icon: <Target className="h-5 w-5" />,
          color: 'text-green-500'
        },
        {
          label: 'Завершено сегодня',
          value: completedToday || 0,
          icon: <CheckCircle className="h-5 w-5" />,
          color: 'text-orange-500'
        },
        {
          label: 'Ожидает действий',
          value: pendingActions.length,
          icon: <Clock className="h-5 w-5" />,
          color: 'text-purple-500'
        }
      ]);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Тренерский кабинет</h1>
            <p className="text-muted-foreground mt-1">
              Управляйте клиентами и целями с помощью AI
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/trainer-dashboard')}
            className="gap-2"
          >
            <LayoutDashboard className="h-4 w-4" />
            Полный кабинет
          </Button>
        </div>

        {/* Hero с AI */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Главный AI Widget - занимает 2/3 */}
          <div className="lg:col-span-2">
            <TrainerAIWidget />
          </div>

          {/* Quick Stats - 1/3 */}
          <div className="space-y-4">
            {stats.map((stat, idx) => (
              <Card key={idx} className="relative overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                  <div className={stat.color}>{stat.icon}</div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}

            {pendingActions.length > 0 && (
              <Button
                className="w-full"
                onClick={() => navigate('/trainer-dashboard?tab=ai-hub')}
              >
                Просмотреть действия ({pendingActions.length})
              </Button>
            )}
          </div>
        </div>

        {/* Быстрый доступ к разделам */}
        <Card>
          <CardHeader>
            <CardTitle>Быстрый доступ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2"
                onClick={() => navigate('/trainer-dashboard?tab=clients')}
              >
                <Users className="h-5 w-5" />
                <span className="text-sm">Клиенты</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2"
                onClick={() => navigate('/trainer-dashboard?tab=goals')}
              >
                <Target className="h-5 w-5" />
                <span className="text-sm">Цели</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2"
                onClick={() => navigate('/trainer-dashboard?tab=plans')}
              >
                <Dumbbell className="h-5 w-5" />
                <span className="text-sm">Планы</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2"
                onClick={() => navigate('/trainer-dashboard?tab=challenges')}
              >
                <Activity className="h-5 w-5" />
                <span className="text-sm">Челленджи</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2"
                onClick={() => navigate('/trainer-dashboard?tab=analytics')}
              >
                <Clock className="h-5 w-5" />
                <span className="text-sm">Аналитика</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <AIQuickActionsPanel />
    </div>
  );
}

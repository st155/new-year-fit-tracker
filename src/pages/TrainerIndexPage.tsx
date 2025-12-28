import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useAIPendingActions } from '@/hooks/useAIPendingActions';
import { useAuth } from '@/hooks/useAuth';
import { Users, Target, CheckCircle, Clock, Activity, LayoutDashboard, Dumbbell, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface QuickStat {
  labelKey: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

export default function TrainerIndexPage() {
  const { t } = useTranslation('trainerDashboard');
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
          labelKey: 'index.stats.activeClients',
          value: activeClients || 0,
          icon: <Users className="h-5 w-5" />,
          color: 'text-blue-500'
        },
        {
          labelKey: 'index.stats.activeGoals',
          value: activeGoals || 0,
          icon: <Target className="h-5 w-5" />,
          color: 'text-green-500'
        },
        {
          labelKey: 'index.stats.completedToday',
          value: completedToday || 0,
          icon: <CheckCircle className="h-5 w-5" />,
          color: 'text-orange-500'
        },
        {
          labelKey: 'index.stats.pendingActions',
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
            <h1 className="text-3xl font-bold tracking-tight">{t('index.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('index.description')}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/trainer-dashboard')}
            className="gap-2"
          >
            <LayoutDashboard className="h-4 w-4" />
            {t('index.fullDashboard')}
          </Button>
        </div>

        {/* Hero Card */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {t('index.aiDescription')}
            </p>
            <Button
              onClick={() => navigate('/trainer-dashboard')}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/25"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {t('index.openAI')}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <Card key={idx} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t(stat.labelKey)}</CardTitle>
                <div className={stat.color}>{stat.icon}</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Быстрый доступ к разделам */}
        <Card>
          <CardHeader>
            <CardTitle>{t('index.quickAccess')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2"
                onClick={() => navigate('/trainer-dashboard?tab=clients')}
              >
                <Users className="h-5 w-5" />
                <span className="text-sm">{t('tabs.clients')}</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2"
                onClick={() => navigate('/trainer-dashboard?tab=plans')}
              >
                <Dumbbell className="h-5 w-5" />
                <span className="text-sm">{t('tabs.plans')}</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2"
                onClick={() => navigate('/trainer-dashboard?tab=challenges')}
              >
                <Activity className="h-5 w-5" />
                <span className="text-sm">{t('tabs.challenges')}</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col gap-2"
                onClick={() => navigate('/trainer-dashboard?tab=analytics')}
              >
                <Clock className="h-5 w-5" />
                <span className="text-sm">{t('tabs.analytics')}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

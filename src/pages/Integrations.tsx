import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WhoopIntegration } from '@/components/integrations/WhoopIntegration';
import { WithingsIntegration } from '@/components/integrations/WithingsIntegration';
import { AppleHealthIntegration } from '@/components/integrations/AppleHealthIntegration';
import { GarminIntegration } from '@/components/integrations/GarminIntegration';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { EmptyState } from '@/components/ui/empty-state';
import { 
  Heart, 
  Smartphone, 
  Watch, 
  Database,
  Settings,
  Activity,
  Zap,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface HealthStats {
  totalRecords: number;
  lastWeek: number;
  sources: { [key: string]: number };
}

interface IntegrationStatus {
  whoop: 'connected' | 'disconnected' | 'pending' | 'error';
  withings: 'connected' | 'disconnected' | 'pending' | 'error';
  appleHealth: 'connected' | 'disconnected' | 'pending' | 'error';
  garmin: 'connected' | 'disconnected' | 'pending' | 'error';
}

const IntegrationsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [healthStats, setHealthStats] = useState<HealthStats>({ totalRecords: 0, lastWeek: 0, sources: {} });
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    whoop: 'disconnected',
    withings: 'disconnected', 
    appleHealth: 'disconnected',
    garmin: 'disconnected'
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadHealthStats();
      checkIntegrationStatus();
    }
  }, [user]);

  const checkIntegrationStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Проверяем статус подключений по наличию данных
      const { data: metricValues } = await supabase
        .from('metric_values')
        .select('user_metrics!inner(source)')
        .eq('user_id', user.id)
        .gte('measurement_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      const sources = new Set(metricValues?.map(mv => mv.user_metrics.source) || []);
      
      setIntegrationStatus({
        whoop: sources.has('whoop') ? 'connected' : 'disconnected',
        withings: sources.has('withings') ? 'connected' : 'disconnected',
        appleHealth: sources.has('apple_health') ? 'connected' : 'disconnected',
        garmin: sources.has('garmin') ? 'connected' : 'disconnected'
      });
    } catch (error) {
      console.error('Error checking integration status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHealthStats = async () => {
    if (!user) return;

    try {
      // Получаем общую статистику
      const { data: totalData } = await supabase
        .from('health_records')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id);

      // Получаем статистику за последнюю неделю
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data: weekData } = await supabase
        .from('health_records')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('created_at', oneWeekAgo.toISOString());

      // Получаем статистику по источникам
      const { data: sourcesData } = await supabase
        .from('health_records')
        .select('source_name')
        .eq('user_id', user.id);

      const sources: { [key: string]: number } = {};
      sourcesData?.forEach(record => {
        const source = record.source_name || 'Unknown';
        sources[source] = (sources[source] || 0) + 1;
      });

      setHealthStats({
        totalRecords: totalData?.length || 0,
        lastWeek: weekData?.length || 0,
        sources
      });
    } catch (error) {
      console.error('Error loading health stats:', error);
    }
  };

  const refreshIntegrations = async () => {
    await checkIntegrationStatus();
    await loadHealthStats();
    toast({
      title: "Обновлено",
      description: "Статус интеграций обновлен",
    });
  };

  const integrationItems = [
    {
      id: 'whoop',
      name: 'Whoop',
      description: 'Ремешок для отслеживания активности и восстановления',
      icon: Activity,
      status: integrationStatus.whoop,
      component: <WhoopIntegration userId={user?.id || ''} />
    },
    {
      id: 'withings',
      name: 'Withings',
      description: 'Умные весы и трекеры здоровья',
      icon: Heart,
      status: integrationStatus.withings,
      component: <WithingsIntegration />
    },
    {
      id: 'appleHealth',
      name: 'Apple Health',
      description: 'Импорт данных из приложения Здоровье',
      icon: Smartphone,
      status: integrationStatus.appleHealth,
      component: <AppleHealthIntegration />
    },
    {
      id: 'garmin',
      name: 'Garmin',
      description: 'Спортивные часы и фитнес-трекеры',
      icon: Watch,
      status: integrationStatus.garmin,
      component: <GarminIntegration userId={user?.id || ''} />
    }
  ];

  const connectedCount = Object.values(integrationStatus).filter(status => status === 'connected').length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Заголовок */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Интеграции
              </h1>
              <p className="text-muted-foreground mt-2">
                Подключите свои фитнес-устройства и приложения для автоматического сбора данных
              </p>
            </div>
            <Button 
              onClick={refreshIntegrations} 
              variant="outline"
              className="flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Подключено</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {connectedCount}/4
              </div>
              <p className="text-xs text-muted-foreground">устройств</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Всего записей</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{healthStats.totalRecords.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">данных</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">За неделю</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{healthStats.lastWeek}</div>
              <p className="text-xs text-muted-foreground">новых записей</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Источники</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(healthStats.sources).length}</div>
              <p className="text-xs text-muted-foreground">активных</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Обзор
            </TabsTrigger>
            <TabsTrigger value="setup" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Настройка
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {connectedCount === 0 ? (
              <EmptyState
                icon={<Zap className="h-16 w-16" />}
                title="Нет подключенных устройств"
                description="Подключите свои фитнес-трекеры и приложения для автоматического сбора данных о тренировках, сне и здоровье."
                action={{
                  label: "Настроить интеграции",
                  onClick: () => setActiveTab('setup')
                }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {integrationItems.map((item) => (
                  <Card key={item.id} className="relative overflow-hidden">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <item.icon className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{item.name}</CardTitle>
                            <CardDescription className="text-sm">
                              {item.description}
                            </CardDescription>
                          </div>
                        </div>
                        <StatusIndicator status={item.status} />
                      </div>
                    </CardHeader>
                    
                    {item.status === 'connected' && (
                      <CardContent>
                        <div className="text-sm text-muted-foreground">
                          <p>Записей от {item.name}: {healthStats.sources[item.id] || 0}</p>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="setup" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {integrationItems.map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <item.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{item.name}</CardTitle>
                          <CardDescription>
                            {item.description}
                          </CardDescription>
                        </div>
                      </div>
                      <StatusIndicator status={item.status} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {item.component}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default IntegrationsPage;
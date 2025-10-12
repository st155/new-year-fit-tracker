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
import { TerraIntegration } from '@/components/integrations/TerraIntegration';
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
  terra: 'connected' | 'disconnected' | 'pending' | 'error';
}

const IntegrationsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [healthStats, setHealthStats] = useState<HealthStats>({ totalRecords: 0, lastWeek: 0, sources: {} });
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    whoop: 'disconnected',
    withings: 'disconnected', 
    appleHealth: 'disconnected',
    garmin: 'disconnected',
    terra: 'disconnected'
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
      
      // Проверяем статус подключений по наличию токенов
      const { data: whoopTokens } = await supabase
        .from('whoop_tokens')
        .select('id')
        .eq('user_id', user.id)
        .not('access_token', 'is', null);

      const { data: withingsTokens } = await supabase
        .from('withings_tokens')
        .select('id')
        .eq('user_id', user.id)
        .not('access_token', 'is', null);

      const { data: appleHealthData } = await supabase
        .from('health_records')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      const { data: terraTokens } = await supabase
        .from('terra_tokens')
        .select('id')
        .eq('user_id', user.id);
      
      setIntegrationStatus({
        whoop: whoopTokens && whoopTokens.length > 0 ? 'connected' : 'disconnected',
        withings: withingsTokens && withingsTokens.length > 0 ? 'connected' : 'disconnected',
        appleHealth: appleHealthData && appleHealthData.length > 0 ? 'connected' : 'disconnected',
        garmin: 'disconnected',
        terra: terraTokens && terraTokens.length > 0 ? 'connected' : 'disconnected'
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
      // Получаем общую статистику по всем данным
      const { data: healthData, count: healthCount } = await supabase
        .from('health_records')
        .select('id, source_name, created_at', { count: 'exact' })
        .eq('user_id', user.id);

      const { data: metricData, count: metricCount } = await supabase
        .from('metric_values')
        .select('id, created_at, user_metrics!inner(source)', { count: 'exact' })
        .eq('user_id', user.id);

      // Получаем статистику за последнюю неделю
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data: recentHealthData } = await supabase
        .from('health_records')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', oneWeekAgo.toISOString());

      const { data: recentMetricData } = await supabase
        .from('metric_values')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', oneWeekAgo.toISOString());

      // Получаем статистику по источникам
      const sources: { [key: string]: number } = {};
      
      // Добавляем health_records
      healthData?.forEach(record => {
        const source = record.source_name || 'Unknown';
        sources[source] = (sources[source] || 0) + 1;
      });

      // Добавляем metric_values
      metricData?.forEach(record => {
        const source = record.user_metrics.source || 'Unknown';
        sources[source] = (sources[source] || 0) + 1;
      });

      const totalRecords = (healthCount || 0) + (metricCount || 0);
      const lastWeekRecords = (recentHealthData?.length || 0) + (recentMetricData?.length || 0);

      setHealthStats({
        totalRecords,
        lastWeek: lastWeekRecords,
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
      title: "Updated",
      description: "Integration status updated",
    });
  };

  const integrationItems = [
    {
      id: 'whoop',
      name: 'Whoop',
      description: 'Band for tracking activity and recovery',
      icon: Activity,
      status: integrationStatus.whoop,
      component: <WhoopIntegration userId={user?.id || ''} />
    },
    {
      id: 'withings',
      name: 'Withings',
      description: 'Smart scales and health trackers',
      icon: Heart,
      status: integrationStatus.withings,
      component: <WithingsIntegration />
    },
    {
      id: 'appleHealth',
      name: 'Apple Health',
      description: 'Import data from Health app',
      icon: Smartphone,
      status: integrationStatus.appleHealth,
      component: <AppleHealthIntegration />
    },
    {
      id: 'garmin',
      name: 'Garmin',
      description: 'Sports watches and fitness trackers',
      icon: Watch,
      status: integrationStatus.garmin,
      component: <GarminIntegration userId={user?.id || ''} />
    },
    {
      id: 'terra',
      name: 'Terra API',
      description: 'UltraHuman, Oura, Fitbit and more',
      icon: Zap,
      status: integrationStatus.terra,
      component: <TerraIntegration />
    }
  ];

  const connectedCount = Object.values(integrationStatus).filter(status => status === 'connected').length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        {/* Заголовок с градиентом */}
        <div className="mb-8 px-4 py-6 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl border border-border/50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                Integrations
              </h1>
              <p className="text-muted-foreground">
                Connect your fitness devices and apps for automatic data collection
              </p>
            </div>
            <Button 
              onClick={refreshIntegrations} 
              variant="outline"
              className="flex items-center gap-2 hover:bg-primary/10 border-primary/20"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Статистика с градиентами */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <Card className="border-2 border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10 shadow-lg hover:shadow-green-500/20 transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Zap className="h-5 w-5 text-green-500" />
                </div>
                <CardTitle className="text-sm font-medium">Connected</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">
                {connectedCount}/5
              </div>
              <p className="text-xs text-muted-foreground mt-1">devices</p>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 shadow-lg hover:shadow-blue-500/20 transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Database className="h-5 w-5 text-blue-500" />
                </div>
                <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-500">{healthStats.totalRecords.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">data points</p>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 shadow-lg hover:shadow-purple-500/20 transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Activity className="h-5 w-5 text-purple-500" />
                </div>
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-500">{healthStats.lastWeek}</div>
              <p className="text-xs text-muted-foreground mt-1">new records</p>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-yellow-500/10 shadow-lg hover:shadow-orange-500/20 transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <Settings className="h-5 w-5 text-orange-500" />
                </div>
                <CardTitle className="text-sm font-medium">Sources</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-500">{Object.keys(healthStats.sources).length}</div>
              <p className="text-xs text-muted-foreground mt-1">active</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="setup" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Setup
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {connectedCount === 0 ? (
              <EmptyState
                icon={<Zap className="h-16 w-16" />}
                title="No Connected Devices"
                description="Connect your fitness trackers and apps to automatically collect data about workouts, sleep, and health."
                action={{
                  label: "Setup Integrations",
                  onClick: () => setActiveTab('setup')
                }}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {integrationItems.map((item, index) => {
                  const colors = [
                    { border: 'border-red-500/30', bg: 'from-red-500/10 to-orange-500/10', icon: 'bg-red-500/20', iconColor: 'text-red-500' },
                    { border: 'border-blue-500/30', bg: 'from-blue-500/10 to-cyan-500/10', icon: 'bg-blue-500/20', iconColor: 'text-blue-500' },
                    { border: 'border-purple-500/30', bg: 'from-purple-500/10 to-pink-500/10', icon: 'bg-purple-500/20', iconColor: 'text-purple-500' },
                    { border: 'border-green-500/30', bg: 'from-green-500/10 to-emerald-500/10', icon: 'bg-green-500/20', iconColor: 'text-green-500' }
                  ];
                  const color = colors[index % colors.length];
                  
                  return (
                    <Card key={item.id} className={`relative overflow-hidden border-2 ${color.border} bg-gradient-to-br ${color.bg} shadow-lg hover:scale-[1.02] transition-all duration-300`}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-3 ${color.icon} rounded-xl`}>
                              <item.icon className={`h-6 w-6 ${color.iconColor}`} />
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
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className={`${color.iconColor} border-current`}>
                              {healthStats.sources[item.id === 'appleHealth' ? 'apple_health' : item.id] || healthStats.sources[item.name] || 0} records
                            </Badge>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="setup" className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:gap-6">
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
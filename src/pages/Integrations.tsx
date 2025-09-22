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
import { IntegrationsCard } from '@/components/dashboard/integrations-card';
import { 
  Heart, 
  Smartphone, 
  Watch, 
  Database,
  Settings,
  Shield,
  Clock,
  Activity,
  TrendingUp,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface HealthStats {
  totalRecords: number;
  lastWeek: number;
  sources: { [key: string]: number };
}

const IntegrationsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [healthStats, setHealthStats] = useState<HealthStats>({ totalRecords: 0, lastWeek: 0, sources: {} });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user) {
      loadHealthStats();
    }
  }, [user]);

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

  const handleIntegrationUpdate = () => {
    loadHealthStats();
    toast({
      title: 'Интеграция обновлена',
      description: 'Данные успешно синхронизированы.',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50">
      <div className="container mx-auto px-4 py-8">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
            Интеграции
          </h1>
          <p className="text-muted-foreground">
            Подключите ваши устройства и приложения для автоматической синхронизации данных о здоровье и фитнесе
          </p>
        </div>

        {/* Общая статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Всего записей</p>
                  <p className="text-3xl font-bold">{healthStats.totalRecords.toLocaleString()}</p>
                </div>
                <Database className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">За последнюю неделю</p>
                  <p className="text-3xl font-bold text-green-600">{healthStats.lastWeek.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Источников данных</p>
                  <p className="text-3xl font-bold text-blue-600">{Object.keys(healthStats.sources).length}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Вкладки интеграций */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Обзор</TabsTrigger>
            <TabsTrigger value="withings">Withings</TabsTrigger>
            <TabsTrigger value="whoop">Whoop</TabsTrigger>
            <TabsTrigger value="apple">Apple Health</TabsTrigger>
            <TabsTrigger value="garmin">Garmin</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <IntegrationsCard />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Безопасность данных
                </CardTitle>
                <CardDescription>
                  Ваши данные защищены и обрабатываются согласно политике конфиденциальности
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-900">Шифрование данных</h4>
                      <p className="text-sm text-green-800">Все данные шифруются при передаче и хранении</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Контроль доступа</h4>
                      <p className="text-sm text-blue-800">Только вы имеете доступ к своим данным</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <Clock className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-purple-900">Автоматическое удаление</h4>
                      <p className="text-sm text-purple-800">Неактивные токены автоматически удаляются</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <Settings className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-orange-900">GDPR совместимость</h4>
                      <p className="text-sm text-orange-800">Соответствие европейским стандартам защиты данных</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Статистика по источникам */}
            {Object.keys(healthStats.sources).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Источники данных</CardTitle>
                  <CardDescription>
                    Распределение ваших данных по источникам
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(healthStats.sources)
                      .sort(([,a], [,b]) => b - a)
                      .map(([source, count]) => (
                        <div key={source} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <span className="font-medium">{source}</span>
                          <Badge variant="secondary">{count.toLocaleString()} записей</Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="withings" className="space-y-6">
            <WithingsIntegration />
          </TabsContent>

          <TabsContent value="whoop" className="space-y-6">
            <WhoopIntegration 
              userId={user?.id || ''} 
            />
          </TabsContent>

          <TabsContent value="apple" className="space-y-6">
            <AppleHealthIntegration />
          </TabsContent>

          <TabsContent value="garmin" className="space-y-6">
            <GarminIntegration 
              userId={user?.id || ''} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default IntegrationsPage;
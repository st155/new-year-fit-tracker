import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Watch, Apple, Wifi, WifiOff, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface IntegrationStatus {
  name: string;
  icon: React.ReactNode;
  isConnected: boolean;
  lastSync?: string;
  dataCount?: number;
}

const IntegrationsCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadIntegrationsStatus();
    }
  }, [user]);

  const loadIntegrationsStatus = async () => {
    try {
      // Проверяем Whoop интеграцию
      const { data: whoopTokens } = await supabase
        .from('whoop_tokens')
        .select('updated_at')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false })
        .limit(1);

      // Подсчитываем данные Whoop
      const { data: whoopMetrics } = await supabase
        .from('user_metrics')
        .select('id')
        .eq('user_id', user?.id)
        .eq('source', 'whoop');

      const whoopMetricIds = whoopMetrics?.map(m => m.id) || [];
      
      let whoopDataCount = 0;
      if (whoopMetricIds.length > 0) {
        const { count } = await supabase
          .from('metric_values')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user?.id)
          .in('metric_id', whoopMetricIds);
        whoopDataCount = count || 0;
      }

      // Подсчитываем данные Apple Health
      const { data: appleMetrics } = await supabase
        .from('user_metrics')
        .select('id')
        .eq('user_id', user?.id)
        .eq('source', 'apple_health');

      const appleMetricIds = appleMetrics?.map(m => m.id) || [];
      
      let appleDataCount = 0;
      if (appleMetricIds.length > 0) {
        const { count } = await supabase
          .from('metric_values')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user?.id)
          .in('metric_id', appleMetricIds);
        appleDataCount = count || 0;
      }

      const integrationsData: IntegrationStatus[] = [
        {
          name: 'Whoop',
          icon: <Watch className="h-5 w-5" />,
          isConnected: whoopTokens && whoopTokens.length > 0,
          lastSync: whoopTokens?.[0]?.updated_at,
          dataCount: whoopDataCount
        },
        {
          name: 'Apple Health',
          icon: <Apple className="h-5 w-5" />,
          isConnected: appleDataCount > 0,
          dataCount: appleDataCount
        },
        {
          name: 'Garmin',
          icon: <Smartphone className="h-5 w-5" />,
          isConnected: false,
          dataCount: 0
        }
      ];

      setIntegrations(integrationsData);
    } catch (error) {
      console.error('Error loading integrations status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (integrationName: string) => {
    switch (integrationName) {
      case 'Whoop':
        window.location.href = '/progress#whoop';
        break;
      case 'Apple Health':
        window.location.href = '/fitness-data';
        break;
      default:
        toast({
          title: 'Скоро будет доступно',
          description: `Интеграция с ${integrationName} находится в разработке`,
        });
    }
  };

  const formatLastSync = (dateString?: string) => {
    if (!dateString) return 'Никогда';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Только что';
    if (diffHours < 24) return `${diffHours}ч назад`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}д назад`;
    
    return date.toLocaleDateString('ru-RU');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Интеграции
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const connectedCount = integrations.filter(i => i.isConnected).length;
  const totalDataPoints = integrations.reduce((sum, i) => sum + (i.dataCount || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-5 w-5" />
          Интеграции
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{connectedCount} из {integrations.length} подключено</span>
          <span>•</span>
          <span>{totalDataPoints} точек данных</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {integrations.map((integration) => (
            <div key={integration.name} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {integration.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{integration.name}</span>
                    {integration.isConnected ? (
                      <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                        <Wifi className="h-3 w-3 mr-1" />
                        Подключено
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        <WifiOff className="h-3 w-3 mr-1" />
                        Не подключено
                      </Badge>
                    )}
                  </div>
                  {integration.isConnected && (
                    <div className="text-xs text-muted-foreground mt-1">
                      <span>Последняя синхронизация: {formatLastSync(integration.lastSync)}</span>
                      {integration.dataCount && integration.dataCount > 0 && (
                        <span> • {integration.dataCount} записей</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <Button
                size="sm"
                variant={integration.isConnected ? "outline" : "default"}
                onClick={() => handleConnect(integration.name)}
                className="ml-2"
              >
                {integration.isConnected ? (
                  <>
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Управление
                  </>
                ) : (
                  'Подключить'
                )}
              </Button>
            </div>
          ))}
        </div>
        
        {connectedCount === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <WifiOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Подключите устройства для автоматического</p>
            <p className="text-sm">отслеживания вашего прогресса</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IntegrationsCard;
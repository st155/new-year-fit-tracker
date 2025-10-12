import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, 
  Activity, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Database,
  Smartphone,
  Watch,
  Plus,
  ExternalLink,
  Loader2,
  Scale
} from 'lucide-react';

interface IntegrationStatus {
  name: string;
  icon: React.ReactNode;
  isConnected: boolean;
  lastSync?: string;
  dataCount?: number;
  status?: 'active' | 'syncing' | 'error' | 'pending';
  description?: string;
}

export const IntegrationsCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadIntegrationsStatus();
      
      // Автообновление каждые 60 секунд
      const interval = setInterval(() => {
        loadIntegrationsStatus();
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [user]);

  const loadIntegrationsStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Проверяем Whoop интеграцию
      const { data: whoopTokens } = await supabase
        .from('whoop_tokens')
        .select('updated_at, access_token')
        .eq('user_id', user.id)
        .not('access_token', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1);

      const { data: whoopData } = await supabase
        .from('metric_values')
        .select('id, user_metrics!inner(source)')
        .eq('user_id', user.id)
        .eq('user_metrics.source', 'whoop');

      // Проверяем Withings интеграцию
      const { data: withingsTokens } = await supabase
        .from('withings_tokens')
        .select('updated_at, access_token')
        .eq('user_id', user.id)
        .not('access_token', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1);

      const { data: withingsData } = await supabase
        .from('metric_values')
        .select('id, user_metrics!inner(source)')
        .eq('user_id', user.id)
        .eq('user_metrics.source', 'withings');

      // Проверяем Apple Health интеграцию
      const { data: appleHealthData } = await supabase
        .from('health_records')
        .select('id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: appleHealthCount } = await supabase
        .from('health_records')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id);

      const integrationsList: IntegrationStatus[] = [
        {
          name: 'Withings',
          icon: <Scale className="w-6 h-6 text-red-500" />,
          isConnected: !!withingsTokens?.length,
          lastSync: withingsTokens?.[0]?.updated_at,
          dataCount: withingsData?.length || 0,
          status: withingsTokens?.length ? 'active' : 'pending',
          description: 'Умные весы и устройства здоровья для отслеживания состава тела'
        },
        {
          name: 'Whoop',
          icon: <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">W</div>,
          isConnected: !!whoopTokens?.length,
          lastSync: whoopTokens?.[0]?.updated_at,
          dataCount: whoopData?.length || 0,
          status: whoopTokens?.length ? 'active' : 'pending',
          description: 'Автоматическая синхронизация данных о восстановлении, сне и тренировках'
        },
        {
          name: 'Apple Health',
          icon: <div className="w-6 h-6 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg flex items-center justify-center text-white text-sm">🍎</div>,
          isConnected: !!appleHealthData?.length,
          lastSync: appleHealthData?.[0]?.created_at,
          dataCount: appleHealthCount?.length || 0,
          status: appleHealthData?.length ? 'active' : 'pending',
          description: 'Импорт данных из приложения "Здоровье" на iPhone'
        },
        {
          name: 'Garmin',
          icon: <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">G</div>,
          isConnected: false,
          dataCount: 0,
          status: 'pending',
          description: 'Скоро: синхронизация с устройствами Garmin'
        }
      ];

      setIntegrations(integrationsList);
    } catch (error) {
      console.error('Error loading integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (integrationName: string) => {
    navigate('/integrations');
  };

  const formatLastSync = (dateString?: string) => {
    if (!dateString) return 'Никогда';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Только что';
    if (diffHours < 24) return `${diffHours}ч назад`;
    if (diffDays < 7) return `${diffDays}д назад`;
    
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short'
    });
  };

  const getStatusIcon = (status?: string, isConnected?: boolean) => {
    if (status === 'syncing') return <Loader2 className="h-3 w-3 animate-spin" />;
    if (status === 'error') return <AlertCircle className="h-3 w-3 text-red-500" />;
    if (isConnected) return <CheckCircle className="h-3 w-3 text-green-500" />;
    return <Clock className="h-3 w-3 text-muted-foreground" />;
  };

  const getStatusText = (status?: string, isConnected?: boolean) => {
    if (status === 'syncing') return 'Синхронизация...';
    if (status === 'error') return 'Ошибка';
    if (isConnected) return 'Подключено';
    return 'Не подключено';
  };

  const connectedCount = integrations.filter(i => i.isConnected).length;
  const totalDataPoints = integrations.reduce((sum, i) => sum + (i.dataCount || 0), 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Загрузка интеграций...</span>
        </CardContent>
      </Card>
    );
  }

  // Если нет подключенных интеграций, показываем полную карточку для новых пользователей
  if (connectedCount === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Интеграции
              </CardTitle>
              <CardDescription>
                Подключите ваши устройства и приложения для автоматической синхронизации данных
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/integrations')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Управление
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Список интеграций для новых пользователей */}
          <div className="space-y-3">
            {integrations.map((integration) => (
              <div
                key={integration.name}
                className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  {integration.icon}
                </div>
                
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{integration.name}</span>
                    
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleConnect(integration.name)}
                      disabled={integration.name === 'Garmin'}
                      className="flex-shrink-0"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Подключить
                    </Button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2 pr-2">
                    {integration.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center py-4">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <Smartphone className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Подключите ваши устройства для автоматической синхронизации данных о здоровье и фитнесе
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Для пользователей с интеграциями показываем только статус
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Интеграции
            </CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/integrations')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Управление
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Только статус для существующих пользователей */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Подключено</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {connectedCount}/{integrations.length}
            </p>
          </div>
          
          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
            <div className="flex items-center gap-2 mb-1">
              <Database className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Данных</span>
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">
              {totalDataPoints.toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
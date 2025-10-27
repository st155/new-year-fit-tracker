import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  ExternalLink,
  RefreshCw,
  Activity
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useSystemStatus } from '@/hooks/metrics/useSystemStatus';

type ServiceStatus = 'operational' | 'degraded' | 'down' | 'checking';

interface SystemHealth {
  supabase: ServiceStatus;
  terra: ServiceStatus;
  lastCheck: Date;
}

export function SystemHealthIndicator() {
  const [health, setHealth] = useState<SystemHealth>({
    supabase: 'checking',
    terra: 'checking',
    lastCheck: new Date(),
  });
  const [isOpen, setIsOpen] = useState(false);
  const { data: systemStatus } = useSystemStatus();

  const checkHealth = async () => {
    const newHealth: SystemHealth = {
      supabase: 'checking',
      terra: 'checking',
      lastCheck: new Date(),
    };

    // Check Supabase
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .abortSignal(AbortSignal.timeout(3000));

      if (error) {
        console.warn('Supabase health check failed:', error);
        newHealth.supabase = 'degraded';
      } else {
        newHealth.supabase = 'operational';
      }
    } catch (error: any) {
      console.error('Supabase health check error:', error);
      if (error.name === 'AbortError' || error.message?.includes('timeout')) {
        newHealth.supabase = 'degraded';
      } else {
        newHealth.supabase = 'down';
      }
    }

    // Check Terra based on actual data flow
    let terraStatus: ServiceStatus = 'operational';
    if (systemStatus) {
      const { webhooksLast1h, pendingJobs, lastProcessedTime } = systemStatus;
      
      // No webhooks = devices not sending data
      if (webhooksLast1h === 0) {
        terraStatus = 'degraded';
      }
      // Queue is stalled
      else if (pendingJobs > 5) {
        terraStatus = 'degraded';
      }
      // Last processing was too long ago
      else if (lastProcessedTime) {
        const hoursSince = (Date.now() - new Date(lastProcessedTime).getTime()) / (1000 * 60 * 60);
        if (hoursSince > 2) terraStatus = 'degraded';
      }
    }
    newHealth.terra = terraStatus;

    setHealth(newHealth);
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [systemStatus]);

  const getOverallStatus = (): ServiceStatus => {
    if (health.supabase === 'down' || health.terra === 'down') return 'down';
    if (health.supabase === 'degraded' || health.terra === 'degraded') return 'degraded';
    if (health.supabase === 'checking' || health.terra === 'checking') return 'checking';
    return 'operational';
  };

  const getStatusIcon = (status: ServiceStatus) => {
    switch (status) {
      case 'operational':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'down':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'checking':
        return <Activity className="h-4 w-4 text-muted-foreground animate-pulse" />;
    }
  };

  const getStatusText = (status: ServiceStatus) => {
    switch (status) {
      case 'operational':
        return 'Работает';
      case 'degraded':
        return 'Проблемы';
      case 'down':
        return 'Недоступно';
      case 'checking':
        return 'Проверка...';
    }
  };

  const getTerraDescription = (): string => {
    if (!systemStatus) return 'Проверка...';
    
    const { webhooksLast1h, pendingJobs, processingJobs, lastProcessedTime } = systemStatus;
    
    // Critical: Queue is stalled while webhooks are coming
    if (webhooksLast1h > 0 && pendingJobs > 5) {
      return `⚠️ Очередь застопорилась: ${pendingJobs} задач ожидают обработки. Вебхуки приходят, но не обрабатываются.`;
    }
    
    if (webhooksLast1h === 0) {
      return 'Нет данных от устройств за час. Проверьте подключения.';
    }
    
    if (pendingJobs > 5) {
      return `Застой в очереди: ${pendingJobs} задач`;
    }
    
    if (processingJobs > 0) {
      return `Обрабатывается: ${processingJobs} задач`;
    }
    
    if (lastProcessedTime) {
      const minutes = Math.floor((Date.now() - new Date(lastProcessedTime).getTime()) / (1000 * 60));
      if (minutes < 60) {
        return `Обработано ${minutes} мин назад`;
      }
      return `Обработано ${Math.floor(minutes / 60)}ч назад`;
    }
    
    return 'Данные обрабатываются нормально';
  };

  const getStatusColor = (status: ServiceStatus) => {
    switch (status) {
      case 'operational':
        return 'bg-green-600 border border-green-700';
      case 'degraded':
        return 'bg-orange-500 border border-orange-600';
      case 'down':
        return 'bg-red-600 border border-red-700';
      case 'checking':
        return 'bg-muted border border-border animate-pulse';
    }
  };

  const getStatusBadgeVariant = (status: ServiceStatus): 'default' | 'destructive' | 'secondary' => {
    switch (status) {
      case 'operational':
        return 'default';
      case 'degraded':
        return 'secondary';
      case 'down':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const overallStatus = getOverallStatus();

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <div className={`h-2 w-2 rounded-full ${getStatusColor(overallStatus)}`} />
          <span className="text-xs">Статус системы</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Статус системы</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={checkHealth}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {/* Supabase Status */}
            <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(health.supabase)}
                  <p className="text-sm font-medium">БД & Авторизация</p>
                </div>
                <Badge 
                  variant={getStatusBadgeVariant(health.supabase)}
                  className="text-xs border"
                >
                  {getStatusText(health.supabase)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {health.supabase === 'operational' 
                  ? 'База данных работает стабильно' 
                  : 'Проблемы с подключением к БД'}
              </p>
            </div>

            {/* Terra Status */}
            <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(health.terra)}
                  <p className="text-sm font-medium">Устройства (Terra API)</p>
                </div>
                <Badge 
                  variant={getStatusBadgeVariant(health.terra)}
                  className="text-xs border"
                >
                  {getStatusText(health.terra)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {getTerraDescription()}
              </p>
              {systemStatus && (
                <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                  <span>Вебхуки 1ч: {systemStatus.webhooksLast1h}</span>
                  <span>Очередь: {systemStatus.pendingJobs}</span>
                  <span>Обработка: {systemStatus.processingJobs}</span>
                </div>
              )}
            </div>
          </div>

          {/* Last Check */}
          <div className="text-xs text-muted-foreground text-center">
            Последняя проверка: {health.lastCheck.toLocaleTimeString('ru-RU')}
          </div>

          {/* Status Links */}
          <div className="pt-2 border-t space-y-2">
            <a
              href="https://status.supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Статус Supabase</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://status.tryterra.co"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Статус Terra</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Warning Message */}
          {overallStatus !== 'operational' && (
            <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-muted-foreground">
                  {overallStatus === 'degraded' && (
                    'Сервисы работают медленнее обычного. Возможны задержки.'
                  )}
                  {overallStatus === 'down' && (
                    'Обнаружены проблемы с сервисами. Проверьте официальные страницы статуса.'
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

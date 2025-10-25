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

    // Check Terra API (simple HEAD request)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch('https://api.tryterra.co/v2/auth/generateAuthURL', {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok || response.status === 405) {
        // 405 Method Not Allowed is expected for HEAD - API is up
        newHealth.terra = 'operational';
      } else if (response.status >= 500) {
        newHealth.terra = 'down';
      } else {
        newHealth.terra = 'degraded';
      }
    } catch (error: any) {
      console.error('Terra health check error:', error);
      if (error.name === 'AbortError') {
        newHealth.terra = 'degraded';
      } else {
        newHealth.terra = 'down';
      }
    }

    setHealth(newHealth);
  };

  useEffect(() => {
    checkHealth();

    // Auto-refresh every 30 seconds
    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, []);

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
        return 'Замедлена';
      case 'down':
        return 'Недоступна';
      case 'checking':
        return 'Проверка...';
    }
  };

  const getStatusColor = (status: ServiceStatus) => {
    switch (status) {
      case 'operational':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'down':
        return 'bg-red-500';
      case 'checking':
        return 'bg-gray-400 animate-pulse';
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
            <div className="flex items-center justify-between p-2 border rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(health.supabase)}
                <div>
                  <div className="text-sm font-medium">Supabase</div>
                  <div className="text-xs text-muted-foreground">
                    База данных & Auth
                  </div>
                </div>
              </div>
              <Badge
                variant={health.supabase === 'operational' ? 'default' : 'destructive'}
                className={health.supabase === 'degraded' ? 'bg-yellow-500' : ''}
              >
                {getStatusText(health.supabase)}
              </Badge>
            </div>

            {/* Terra Status */}
            <div className="flex items-center justify-between p-2 border rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(health.terra)}
                <div>
                  <div className="text-sm font-medium">Terra API</div>
                  <div className="text-xs text-muted-foreground">
                    Интеграции с устройствами
                  </div>
                </div>
              </div>
              <Badge
                variant={health.terra === 'operational' ? 'default' : 'destructive'}
                className={health.terra === 'degraded' ? 'bg-yellow-500' : ''}
              >
                {getStatusText(health.terra)}
              </Badge>
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

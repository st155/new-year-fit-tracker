import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, Calendar, CheckCircle2, XCircle, Zap, Heart, Watch, Smartphone, AlertCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TerraProvider {
  provider: string;
  connectedAt: string;
  lastSync?: string;
  terraUserId: string;
}

interface TerraStatus {
  connected: boolean;
  providers: TerraProvider[];
}

const providerIcons: Record<string, any> = {
  ULTRAHUMAN: Zap,
  WHOOP: Activity,
  GARMIN: Watch,
  FITBIT: Heart,
  OURA: Activity,
  APPLE_HEALTH: Smartphone,
  WITHINGS: Heart,
};

const providerNames: Record<string, string> = {
  ULTRAHUMAN: 'UltraHuman Ring',
  WHOOP: 'Whoop Band',
  GARMIN: 'Garmin',
  FITBIT: 'Fitbit',
  OURA: 'Oura Ring',
  APPLE_HEALTH: 'Apple Health',
  WITHINGS: 'Withings',
};

export function TerraIntegration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<TerraStatus>({ connected: false, providers: [] });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  useEffect(() => {
    if (user) {
      checkConnectionStatus();
    }
  }, [user]);

  const checkConnectionStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('terra-integration', {
        method: 'POST',
        body: { action: 'check-status' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setStatus(data);
    } catch (error: any) {
      console.error('Error checking Terra status:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectTerra = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('terra-integration', {
        method: 'POST',
        body: { 
          action: 'get-auth-url',
          baseUrl: window.location.origin
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      // Открыть Terra Widget в новом окне
      const width = 500;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        data.url,
        'Terra Connect',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Слушать сообщение об успешном подключении
      const handleMessage = (event: MessageEvent) => {
        if (event.data === 'terra-success') {
          popup?.close();
          checkConnectionStatus();
          toast({
            title: "✅ Успешно подключено",
            description: "Устройство подключено через Terra API",
          });
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);

    } catch (error: any) {
      console.error('Error connecting Terra:', error);
      toast({
        title: "Ошибка подключения",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const disconnectProvider = async (provider: string) => {
    try {
      setDisconnecting(provider);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error } = await supabase.functions.invoke('terra-integration', {
        method: 'POST',
        body: {
          action: 'disconnect',
          provider
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      await checkConnectionStatus();
      toast({
        title: "Отключено",
        description: `${providerNames[provider]} отключен`,
      });

    } catch (error: any) {
      console.error('Error disconnecting provider:', error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDisconnecting(null);
    }
  };

  const syncData = async () => {
    try {
      setSyncing(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error } = await supabase.functions.invoke('terra-integration', {
        method: 'POST',
        body: { action: 'sync-data' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "🔄 Синхронизация",
        description: "Данные обновляются в фоновом режиме",
      });

      // Обновить кэши
      window.dispatchEvent(new Event('fitness-data-updated'));

    } catch (error: any) {
      console.error('Error syncing Terra data:', error);
      toast({
        title: "Ошибка синхронизации",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const testWebhook = async () => {
    try {
      setTestingWebhook(true);
      setShowDiagnostics(true);
      
      const webhookUrl = 'https://ueykmmzmguzjppdudvef.functions.supabase.co/webhook-terra';
      
      toast({
        title: "🧪 Запуск диагностики",
        description: "Проверка webhook подключения...",
      });

      // 1. Проверяем токены в БД
      const { data: tokens, error: tokensError } = await supabase
        .from('terra_tokens')
        .select('*')
        .eq('user_id', user?.id);

      // 2. Проверяем последние события
      const { data: payloads, error: payloadsError } = await supabase
        .from('terra_data_payloads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // 3. Пробуем сделать запрос к webhook напрямую
      let webhookReachable = false;
      try {
        const response = await fetch(webhookUrl);
        webhookReachable = response.status === 400; // Должно быть 400 (missing signature)
      } catch (e) {
        webhookReachable = false;
      }

      const result = {
        timestamp: new Date().toISOString(),
        checks: {
          webhookUrl: {
            url: webhookUrl,
            status: webhookReachable ? 'ok' : 'fail',
            message: webhookReachable 
              ? 'Webhook доступен (ожидает подпись Terra)' 
              : 'Webhook недоступен - проверьте деплой',
          },
          terraTokens: {
            status: tokens && tokens.length > 0 ? 'ok' : 'fail',
            count: tokens?.length || 0,
            message: tokens && tokens.length > 0
              ? `Найдено ${tokens.length} подключений`
              : 'Нет auth событий от Terra - проверьте настройки Webhooks',
          },
          dataEvents: {
            status: payloads && payloads.length > 0 ? 'ok' : 'warning',
            count: payloads?.length || 0,
            message: payloads && payloads.length > 0
              ? `Получено ${payloads.length} событий`
              : 'Нет данных от устройств (нормально если только подключили)',
          },
          configuration: {
            status: 'info',
            steps: [
              { 
                text: 'В Terra Dashboard → Webhooks включён event "auth"',
                link: 'https://dashboard.tryterra.co/webhooks'
              },
              {
                text: 'Webhook URL правильный',
                value: webhookUrl
              },
              {
                text: 'Signing Secret соответствует проекту Terra',
                link: 'https://supabase.com/dashboard/project/ueykmmzmguzjppdudvef/settings/functions'
              }
            ]
          }
        },
        userId: user?.id,
      };

      setDiagnostics(result);
      console.log('🧪 Полная диагностика Terra:', result);

      const hasIssues = result.checks.terraTokens.status === 'fail' || !webhookReachable;
      
      toast({
        title: hasIssues ? "⚠️ Обнаружены проблемы" : "✅ Диагностика завершена",
        description: hasIssues 
          ? "Смотрите детали на странице ниже"
          : "Все проверки пройдены успешно",
        variant: hasIssues ? "destructive" : "default",
      });

    } catch (error: any) {
      console.error('Error testing webhook:', error);
      toast({
        title: "Ошибка диагностики",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!status.connected) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <CardTitle>Terra API - Универсальная интеграция</CardTitle>
            </div>
            <Badge variant="outline">Не подключено</Badge>
          </div>
          <CardDescription>
            Подключите все носимые устройства через одну интеграцию
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              📱 Поддерживаемые устройства:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4" />
                <span>UltraHuman Ring - глюкоза, метаболизм</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                <span>Whoop - восстановление, нагрузка</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Watch className="h-4 w-4" />
                <span>Garmin - тренировки, VO2max</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Heart className="h-4 w-4" />
                <span>Fitbit - активность, сердце</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                <span>Oura - восстановление, сон</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Smartphone className="h-4 w-4" />
                <span>Apple Health - все данные</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Heart className="h-4 w-4" />
                <span>Withings - вес, давление</span>
              </div>
            </div>
          </div>

          <Button
            onClick={connectTerra}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Подключение...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Подключить устройство
              </>
            )}
          </Button>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              💡 После подключения данные будут автоматически синхронизироваться через webhook
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-green-500" />
            <CardTitle>Terra API</CardTitle>
          </div>
          <Badge className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {status.providers.length} устройств
          </Badge>
        </div>
        <CardDescription>
          Подключенные носимые устройства
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Список подключенных устройств */}
        <div className="space-y-2">
          {status.providers.map((provider) => {
            const Icon = providerIcons[provider.provider] || Activity;
            const isDisconnecting = disconnecting === provider.provider;
            
            return (
              <div 
                key={provider.provider} 
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {providerNames[provider.provider] || provider.provider}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        Подключено: {new Date(provider.connectedAt).toLocaleDateString('ru-RU')}
                      </span>
                      {provider.lastSync && (
                        <>
                          <span>•</span>
                          <span>
                            Синх: {new Date(provider.lastSync).toLocaleDateString('ru-RU')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => disconnectProvider(provider.provider)}
                  disabled={isDisconnecting}
                  variant="ghost"
                  size="sm"
                >
                  {isDisconnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Кнопки действий */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={syncData}
            disabled={syncing}
            variant="outline"
            className="flex-1"
          >
            {syncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Синхронизация...
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                Обновить данные
              </>
            )}
          </Button>

          <Button
            onClick={testWebhook}
            disabled={testingWebhook}
            variant="outline"
            size="sm"
          >
            {testingWebhook ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "🧪 Тест"
            )}
          </Button>

          <Button
            onClick={connectTerra}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <Zap className="h-4 w-4" />
          </Button>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            ℹ️ Данные автоматически синхронизируются через webhook от Terra API
          </p>
        </div>

        {/* Диагностика */}
        {showDiagnostics && diagnostics && (
          <div className="pt-4 border-t space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Диагностика webhook</h3>
              <Badge variant="outline" className="text-xs">
                {new Date(diagnostics.timestamp).toLocaleTimeString('ru-RU')}
              </Badge>
            </div>

            {/* Webhook URL */}
            <Alert className={diagnostics.checks.webhookUrl.status === 'ok' ? 'border-green-500' : 'border-red-500'}>
              <div className="flex items-start gap-2">
                {diagnostics.checks.webhookUrl.status === 'ok' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                )}
                <div className="flex-1">
                  <AlertDescription className="text-xs">
                    <strong>Webhook endpoint:</strong> {diagnostics.checks.webhookUrl.message}
                    <div className="mt-1 text-muted-foreground break-all">
                      {diagnostics.checks.webhookUrl.url}
                    </div>
                  </AlertDescription>
                </div>
              </div>
            </Alert>

            {/* Terra Tokens */}
            <Alert className={diagnostics.checks.terraTokens.status === 'ok' ? 'border-green-500' : 'border-red-500'}>
              <div className="flex items-start gap-2">
                {diagnostics.checks.terraTokens.status === 'ok' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                )}
                <div className="flex-1">
                  <AlertDescription className="text-xs">
                    <strong>Auth события:</strong> {diagnostics.checks.terraTokens.message}
                  </AlertDescription>
                </div>
              </div>
            </Alert>

            {/* Data Events */}
            <Alert className="border-blue-500">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <AlertDescription className="text-xs">
                    <strong>События данных:</strong> {diagnostics.checks.dataEvents.message}
                  </AlertDescription>
                </div>
              </div>
            </Alert>

            {/* Инструкции по настройке */}
            {diagnostics.checks.terraTokens.status === 'fail' && (
              <Alert className="border-orange-500">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <AlertDescription className="text-xs space-y-2">
                  <strong className="block">Что проверить:</strong>
                  {diagnostics.checks.configuration.steps.map((step: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-muted-foreground">{idx + 1}.</span>
                      <div className="flex-1">
                        {step.text}
                        {step.link && (
                          <a 
                            href={step.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="ml-2 text-primary hover:underline inline-flex items-center gap-1"
                          >
                            Открыть <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {step.value && (
                          <div className="mt-1 text-muted-foreground font-mono text-xs break-all">
                            {step.value}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={() => setShowDiagnostics(false)}
              variant="ghost"
              size="sm"
              className="w-full"
            >
              Скрыть диагностику
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

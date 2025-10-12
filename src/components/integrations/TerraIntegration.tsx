import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, Calendar, CheckCircle2, XCircle, Zap, Heart, Watch, Smartphone, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
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
  const [isSyncing, setIsSyncing] = useState(false);
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

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      toast({
        title: "Синхронизация данных...",
        description: "Получаем данные от всех подключенных устройств",
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.functions.invoke('terra-integration', {
        method: 'POST',
        body: { action: 'sync-data' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Данные успешно синхронизированы!",
        description: "Все данные от подключенных устройств обновлены",
      });
      
      console.log('Sync results:', data);
      
      // Обновляем статус
      await checkConnectionStatus();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Ошибка синхронизации",
        description: error.message || 'Не удалось синхронизировать данные',
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const connectTerra = async (specificProvider?: string) => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      console.log('🔌 Requesting Terra widget URL...', specificProvider || 'all providers');

      const { data, error } = await supabase.functions.invoke('terra-integration', {
        method: 'POST',
        body: { 
          action: 'get-auth-url',
          baseUrl: window.location.origin,
          ...(specificProvider ? { providers: specificProvider } : {})
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('❌ Terra integration error:', error);
        throw new Error(error.message || 'Terra вернула ошибку при генерации сессии');
      }

      if (!data?.url) {
        console.error('❌ No widget URL received:', data);
        throw new Error('Не получен URL виджета Terra');
      }

      console.log('✅ Terra widget URL received:', data.url);

      // Сохраняем текущий URL для возврата
      sessionStorage.setItem('terra_return_url', window.location.pathname);
      
      // Открываем виджет в той же вкладке
      window.location.href = data.url;

    } catch (error: any) {
      console.error('❌ Error connecting Terra:', error);
      toast({
        title: 'Ошибка подключения',
        description: error?.message || 'Не удалось загрузить виджет Terra',
        variant: 'destructive',
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
      
      const webhookUrl = 'https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/webhook-terra';
      const { data: { session } } = await supabase.auth.getSession();
      
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
        const response = await fetch(webhookUrl, { method: 'GET' });
        // Считаем доступным, если функция отвечает (200 для health, 400/405 без подписи)
        webhookReachable = [200, 400, 405].includes(response.status);
      } catch (e) {
        webhookReachable = false;
      }

      // 4. Генерируем пример подписи сервером (dryRun)
      let signatureDiag: any = null;
      try {
        if (session) {
          const resp = await supabase.functions.invoke('terra-webhook-test', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: { type: 'auth', provider: 'WHOOP', dryRun: true }
          });
          signatureDiag = resp.data;
        }
      } catch {}

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
          signature: {
            status: 'info',
            headerPreferred: signatureDiag?.header_examples?.preferred,
            headerAlternative: signatureDiag?.header_examples?.alternative,
            timestamp: signatureDiag?.timestamp,
            bodyPreview: signatureDiag?.bodyPreview,
          },
          configuration: {
            status: 'info',
            steps: [
              {
                text: 'Auth приходит автоматически после подключения через Terra Connect (отдельно включать не нужно)',
                link: 'https://dashboard.tryterra.co/webhooks'
              },
              {
                text: 'Webhook URL (точно такой): https://ueykmmzmguzjppdudvef.supabase.co/functions/v1/webhook-terra',
                value: webhookUrl
              },
              {
                text: 'Signing Secret совпадает у Terra и в Supabase (TERRA_SIGNING_SECRET)',
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

      // Предложить симуляцию auth, если токенов нет
      if (result.checks.terraTokens.count === 0) {
        const proceed = confirm('Смоделировать событие Terra auth для проверки интеграции?');
        if (proceed) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const sim = await supabase.functions.invoke('terra-webhook-test', {
              method: 'POST',
              headers: { Authorization: `Bearer ${session.access_token}` },
              body: { type: 'auth', provider: 'WHOOP' }
            });
            console.log('🧪 Симуляция Terra auth:', sim);
            // Перечитать статус сразу после симуляции
            await checkConnectionStatus();
          }
        }
      }

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

  const simulateAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await supabase.functions.invoke('terra-webhook-test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { type: 'auth', provider: 'WHOOP' }
      });
      console.log('🧪 Симулированный auth ответ:', res);
      toast({ title: 'Отправлен тестовый auth', description: 'Проверяю статус подключения...' });
      await checkConnectionStatus();
      setShowDiagnostics(true);
    } catch (e: any) {
      console.error('simulateAuth error', e);
      toast({ title: 'Ошибка симуляции', description: e.message, variant: 'destructive' });
    }
  };
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!status.connected) {
    return (
      <div className="space-y-6">
        <div className="glass-card border-primary/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-gradient-primary">
                <Zap className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Terra API - Универсальная интеграция</h2>
                <Badge className="mt-1 bg-gradient-secondary border-0">Рекомендуем</Badge>
              </div>
            </div>
            <Badge variant="outline" className="border-muted-foreground/30">Не подключено</Badge>
          </div>
          <p className="text-base text-muted-foreground mb-6">
            Подключите все носимые устройства через одну интеграцию
          </p>
          <div className="space-y-3">
            <p className="text-sm font-semibold">
              📱 Поддерживаемые устройства:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg glass bg-gradient-to-r from-primary/5 to-transparent border border-primary/10">
                <Zap className="h-5 w-5 text-primary" />
                <span className="text-sm">UltraHuman Ring - глюкоза, метаболизм</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg glass bg-gradient-to-r from-secondary/5 to-transparent border border-secondary/10">
                <Activity className="h-5 w-5 text-secondary" />
                <span className="text-sm">Whoop - восстановление, нагрузка</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg glass bg-gradient-to-r from-accent/5 to-transparent border border-accent/10">
                <Watch className="h-5 w-5 text-accent" />
                <span className="text-sm">Garmin - тренировки, VO2max</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg glass bg-gradient-to-r from-metric-recovery/5 to-transparent border border-metric-recovery/10">
                <Heart className="h-5 w-5 text-metric-recovery" />
                <span className="text-sm">Fitbit - активность, сердце</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg glass bg-gradient-to-r from-success/5 to-transparent border border-success/10">
                <Activity className="h-5 w-5 text-success" />
                <span className="text-sm">Oura - восстановление, сон</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg glass bg-gradient-to-r from-primary/5 to-transparent border border-primary/10">
                <Smartphone className="h-5 w-5 text-primary" />
                <span className="text-sm">Apple Health - все данные</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-semibold">Выберите устройство:</p>
            <div className="grid grid-cols-2 gap-3">
              {['ULTRAHUMAN', 'WHOOP', 'GARMIN', 'OURA', 'WITHINGS'].map((provider) => {
                const Icon = providerIcons[provider];
                return (
                  <Button
                    key={provider}
                    onClick={() => connectTerra(provider)}
                    disabled={loading}
                    variant="outline"
                    className="justify-start h-auto py-3 glass hover:bg-gradient-primary hover:text-primary-foreground hover:border-primary transition-all duration-300"
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Icon className="mr-2 h-5 w-5" />
                    )}
                    <span className="text-base">{providerNames[provider]}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={testWebhook}
              disabled={testingWebhook}
              variant="outline"
              className="shrink-0"
            >
              {testingWebhook ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "🧪"
              )}
            </Button>

            <Button
              onClick={simulateAuth}
              variant="secondary"
              size="sm"
              className="ml-2"
            >
              ⚗️ Симуляция auth
            </Button>
          </div>

          <div className="pt-4 border-t border-border">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
              <p className="text-sm">
                💡 После подключения данные будут автоматически синхронизироваться через webhook
              </p>
            </div>
          </div>

          {/* Диагностика для disconnected state */}
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
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-card border-primary/20 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-gradient-primary">
              <Zap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Terra API</h2>
              <p className="text-sm text-muted-foreground">Подключенные носимые устройства</p>
            </div>
          </div>
          <Badge className="bg-success border-0">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {status.providers.length} устройств
          </Badge>
        </div>
        {/* Кнопка синхронизации */}
        <div className="mb-4">
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Синхронизация...' : 'Синхронизировать данные'}
          </Button>
        </div>

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

          <div className="space-y-2">
            <p className="text-sm font-medium">Добавить еще устройство:</p>
            <div className="grid grid-cols-2 gap-2">
              {['ULTRAHUMAN', 'WHOOP', 'GARMIN', 'OURA', 'WITHINGS'].map((provider) => {
                const Icon = providerIcons[provider];
                const isConnected = status.providers.some(p => p.provider === provider);
                return (
                  <Button
                    key={provider}
                    onClick={() => connectTerra(provider)}
                    disabled={loading || isConnected}
                    variant="outline"
                    size="sm"
                    className="justify-start"
                  >
                    {isConnected ? (
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                    ) : loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Icon className="mr-2 h-4 w-4" />
                    )}
                    {providerNames[provider]}
                  </Button>
                );
              })}
            </div>
          </div>
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
      </div>
    </div>
  );
}

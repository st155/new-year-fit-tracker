import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, Calendar, CheckCircle2, XCircle, Zap, Heart, Watch, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

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
            onClick={connectTerra}
            disabled={loading}
            variant="outline"
          >
            <Zap className="h-4 w-4" />
          </Button>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            ℹ️ Данные автоматически синхронизируются через webhook от Terra API
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

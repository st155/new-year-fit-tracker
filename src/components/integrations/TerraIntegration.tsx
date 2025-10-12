import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface TerraStatus {
  connected: boolean;
  connectedAt?: string;
  userId?: string;
}

export function TerraIntegration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<TerraStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

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
        method: 'GET',
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
        method: 'GET',
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
            description: "Terra интеграция активирована",
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

  const disconnectTerra = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error } = await supabase.functions.invoke('terra-integration', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setStatus({ connected: false });
      toast({
        title: "Отключено",
        description: "Terra интеграция отключена",
      });

    } catch (error: any) {
      console.error('Error disconnecting Terra:', error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const syncData = async () => {
    try {
      setSyncing(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error } = await supabase.functions.invoke('terra-integration', {
        method: 'POST',
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
              <Activity className="h-5 w-5" />
              <CardTitle>Terra API</CardTitle>
            </div>
            <Badge variant="outline">Не подключено</Badge>
          </div>
          <CardDescription>
            Подключите носимые устройства через Terra API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Terra API поддерживает:
            </p>
            <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
              <li>UltraHuman Ring - глюкоза, метаболизм, сон</li>
              <li>Whoop - восстановление, нагрузка, сон</li>
              <li>Garmin - тренировки, VO2max, метрики</li>
              <li>Fitbit - активность, сердце, сон</li>
              <li>Oura - восстановление, готовность, сон</li>
              <li>Apple Health - все данные о здоровье</li>
            </ul>
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
              'Подключить устройство'
            )}
          </Button>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              💡 После подключения данные будут автоматически синхронизироваться
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
            <Activity className="h-5 w-5 text-green-500" />
            <CardTitle>Terra API</CardTitle>
          </div>
          <Badge className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Подключено
          </Badge>
        </div>
        <CardDescription>
          Носимые устройства подключены через Terra
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Статус</span>
            <span className="font-medium text-green-500">Активно</span>
          </div>
          {status.connectedAt && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Подключено</span>
              <span className="font-medium">
                {new Date(status.connectedAt).toLocaleDateString('ru-RU')}
              </span>
            </div>
          )}
          {status.userId && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Terra User ID</span>
              <span className="font-mono text-xs">{status.userId.slice(0, 8)}...</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
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
            onClick={disconnectTerra}
            disabled={loading}
            variant="destructive"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            ℹ️ Данные автоматически синхронизируются через webhook
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

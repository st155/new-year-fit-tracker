import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function WhoopCallback() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [autoTried, setAutoTried] = useState(false);

  useEffect(() => {
    // If user landed here after OAuth redirect, automatically open Terra Connect (WHOOP)
    const params = new URLSearchParams(window.location.search);
    const hasOAuthParams = params.has("code") || params.has("state") || params.has("scope");
    if (hasOAuthParams && !autoTried) {
      setAutoTried(true);
      setTimeout(() => openTerraWidget(), 600);
    }
  }, [autoTried]);

  const openTerraWidget = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Вы не авторизованы");

      const { data, error } = await supabase.functions.invoke('terra-integration', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          action: 'get-auth-url',
          baseUrl: window.location.origin,
          providers: 'WHOOP'
        }
      });

      if (error) throw error;
      if (!data?.url) throw new Error('Terra не вернула URL виджета');

      // Navigate to Terra Connect widget session
      window.location.href = data.url;
    } catch (e: any) {
      console.error('WhoopCallback openTerraWidget error', e);
      toast({ title: 'Не удалось открыть Terra', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const goIntegrations = () => {
    window.location.href = '/integrations';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-xl w-full">
        <CardHeader>
          <CardTitle>Whoop Callback (устаревший)</CardTitle>
          <CardDescription>
            Прямая интеграция Whoop отключена. Используем Terra API для подключения Whoop.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Если вы видите эту страницу после авторизации Whoop — это старый редирект. Нажмите кнопку ниже,
              чтобы открыть официальный Terra Connect для Whoop. После подключения Terra вернёт вас на /terra-callback.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={openTerraWidget} disabled={loading} className="sm:w-auto w-full">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <ExternalLink className="h-4 w-4 mr-2"/>}
              Открыть Terra Connect (Whoop)
            </Button>
            <Button variant="outline" onClick={goIntegrations} className="sm:w-auto w-full">
              <RefreshCw className="h-4 w-4 mr-2"/>
              К интеграциям
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ExternalLink } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function WhoopLegacyCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [connecting, setConnecting] = useState(false);

  const connectViaTerra = async () => {
    try {
      setConnecting(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Не авторизовано");

      const { data, error } = await supabase.functions.invoke('terra-integration', {
        method: 'POST',
        body: {
          action: 'get-auth-url',
          baseUrl: window.location.origin,
          providers: 'WHOOP'
        },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error || !data?.url) {
        throw new Error(error?.message || 'Terra не вернула URL для подключения');
      }

      // Переходим в Terra Connect
      window.location.href = data.url;
    } catch (err: any) {
      console.error('Whoop legacy callback error:', err);
      toast({
        title: 'Подключение Whoop через Terra',
        description: err?.message || 'Не удалось запустить Terra Connect',
        variant: 'destructive'
      });
    } finally {
      setConnecting(false);
    }
  };

  useEffect(() => {
    const [params] = ((): any => {
      try { return (new URL(window.location.href)).searchParams; } catch { return new URLSearchParams(); }
    })();
    const hasWhoopCode = params?.has('code') && params?.has('state');
    const alreadyRedirected = sessionStorage.getItem('whoop_legacy_redirected') === '1';

    // Автозапуск Terra только если это не возврат со старого Whoop и мы ещё не редиректили в этой сессии
    if (!hasWhoopCode && !alreadyRedirected) {
      sessionStorage.setItem('whoop_legacy_redirected', '1');
      connectViaTerra();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="container mx-auto p-4 md:p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Обновление интеграции Whoop</CardTitle>
          <CardDescription>
            Прямая интеграция Whoop устарела. Мы перевели подключение на Terra API для стабильности и единого потока данных.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Сейчас перенаправим вас в Terra Connect для корректного подключения Whoop.
            Если этого не произошло автоматически — нажмите кнопку ниже.
          </p>
          <div className="flex gap-3">
            <Button onClick={connectViaTerra} disabled={connecting}>
              {connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
              Подключить Whoop через Terra
            </Button>
            <Button variant="outline" onClick={() => navigate('/integrations')}>
              К странице интеграций
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

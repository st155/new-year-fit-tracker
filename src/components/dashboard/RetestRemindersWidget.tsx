import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calendar, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function RetestRemindersWidget() {
  const navigate = useNavigate();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['retest-reminders'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('protocol_lifecycle_alerts')
        .select('*')
        .eq('user_id', user.id)
        .eq('alert_type', 'retest_prompt')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading || !alerts || alerts.length === 0) {
    return null;
  }

  return (
    <Card className="border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-orange-500" />
          Напоминания о пересдаче
          <Badge variant="secondary" className="ml-auto">
            {alerts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              "p-3 rounded-lg border transition-all hover:shadow-[0_0_10px_rgba(249,115,22,0.2)]",
              "border-orange-500/30 bg-orange-500/5"
            )}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-relaxed">
                  {alert.message}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(alert.created_at).toLocaleDateString('ru-RU')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/supplements')}
                className="flex-shrink-0"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/supplements')}
          className="w-full mt-2"
        >
          Перейти к добавкам
        </Button>
      </CardContent>
    </Card>
  );
}

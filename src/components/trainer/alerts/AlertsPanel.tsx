import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle, X, ExternalLink, Flame, Wifi, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  data: {
    client_id?: string;
    source?: string;
    days_stale?: number;
    avg_strain?: number;
    avg_recovery?: number;
    alert_type: 'integration_issue' | 'client_overtrain' | 'low_recovery';
  };
  created_at: string;
  read_at?: string;
}

export function AlertsPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAlerts();
      
      // Subscribe to new alerts
      const subscription = supabase
        .channel('trainer-alerts')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'user_notifications',
            filter: `user_id=eq.${user.id}`
          }, 
          (payload) => {
            const newNotif = payload.new as any;
            if (newNotif.metadata?.alert_type) {
              const newAlert: Alert = {
                id: newNotif.id,
                type: newNotif.type || 'system',
                title: newNotif.title || '',
                message: newNotif.message || '',
                data: newNotif.metadata,
                created_at: newNotif.created_at
              };
              setAlerts(prev => [newAlert, ...prev]);
              toast.info(newAlert.title);
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user!.id)
        .is('read', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Filter alerts that have alert_type in metadata
      const systemAlerts = (data || []).filter(notification => 
        notification.metadata && 
        ['integration_issue', 'client_overtrain', 'low_recovery'].includes(notification.metadata.alert_type)
      ).map(n => ({
        id: n.id,
        type: n.type || 'system',
        title: n.title || '',
        message: n.message || '',
        data: n.metadata as Alert['data'],
        created_at: n.created_at,
        read_at: n.read ? n.read_at : undefined
      }));

      setAlerts(systemAlerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(alerts.filter(a => a.id !== alertId));
      toast.success('Алерт отмечен как прочитанный');
    } catch (error) {
      console.error('Error dismissing alert:', error);
      toast.error('Ошибка при закрытии алерта');
    }
  };

  const handleViewClient = (clientId: string) => {
    // Navigate to client detail view
    navigate(`/trainer-dashboard?tab=clients&client=${clientId}`);
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'integration_issue':
        return <Wifi className="h-5 w-5 text-orange-500" />;
      case 'client_overtrain':
        return <Flame className="h-5 w-5 text-red-500" />;
      case 'low_recovery':
        return <TrendingDown className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getAlertColor = (alertType: string) => {
    switch (alertType) {
      case 'integration_issue':
        return 'border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20';
      case 'client_overtrain':
        return 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20';
      case 'low_recovery':
        return 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20';
      default:
        return 'border-l-muted';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Загрузка алертов...</div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return null; // Don't show if no alerts
  }

  const criticalAlerts = alerts.filter(a => a.data.alert_type === 'client_overtrain');
  const warningAlerts = alerts.filter(a => a.data.alert_type === 'integration_issue' || a.data.alert_type === 'low_recovery');

  return (
    <Card className="border-l-4 border-l-destructive">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Важные уведомления
          </CardTitle>
          <div className="flex gap-2">
            {criticalAlerts.length > 0 && (
              <Badge variant="destructive">{criticalAlerts.length} критичных</Badge>
            )}
            {warningAlerts.length > 0 && (
              <Badge variant="outline" className="border-orange-500 text-orange-600">
                {warningAlerts.length} предупреждений
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "p-4 border-l-4 rounded-lg transition-all hover:shadow-sm",
                  getAlertColor(alert.data.alert_type)
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    {getAlertIcon(alert.data.alert_type)}
                    <div className="flex-1 space-y-1">
                      <div className="font-semibold text-sm">{alert.title}</div>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{format(new Date(alert.created_at), 'dd MMM, HH:mm', { locale: ru })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {alert.data.client_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewClient(alert.data.client_id!)}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Клиент
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleDismiss(alert.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

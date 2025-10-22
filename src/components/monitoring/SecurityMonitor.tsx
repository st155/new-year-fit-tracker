import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface SecurityLog {
  id: string;
  action_type: string;
  success: boolean;
  created_at: string;
  error_message?: string;
  resource_type?: string;
}

export function SecurityMonitor() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadSecurityLogs = async () => {
      const { data, error } = await supabase
        .from('security_audit_log')
        .select('id, action_type, success, created_at, error_message, resource_type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setLogs(data);
      }
      setLoading(false);
    };

    loadSecurityLogs();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('security_logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_audit_log',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setLogs((prev) => [payload.new as SecurityLog, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  if (loading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Security Activity Monitor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {logs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No security events recorded</p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 border border-border rounded-md"
              >
                <div className="flex items-center gap-3">
                  {log.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{log.action_type}</p>
                    {log.error_message && (
                      <p className="text-xs text-muted-foreground">{log.error_message}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {log.resource_type && (
                    <Badge variant="outline">{log.resource_type}</Badge>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(log.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

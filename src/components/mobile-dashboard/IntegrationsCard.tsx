import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plug, Check, AlertTriangle, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type ConnectionStatus = 'active' | 'needs_sync' | 'disconnected';

interface Integration {
  name: string;
  status: ConnectionStatus;
}

export function IntegrationsCard() {
  const { user } = useAuth();

  const { data: integrations = [] } = useQuery({
    queryKey: ['mobile-integrations-status', user?.id],
    queryFn: async (): Promise<Integration[]> => {
      if (!user?.id) return [];
      
      // Use any to bypass strict type checking for tables not in generated types
      const { data } = await (supabase as any)
        .from('wearable_connections')
        .select('provider, status, last_sync_at')
        .eq('user_id', user.id);

      if (!data) return [];

      return (data as Array<{ provider: string; status: string; last_sync_at: string | null }>).map(conn => {
        const hoursSinceSync = conn.last_sync_at 
          ? (Date.now() - new Date(conn.last_sync_at).getTime()) / (1000 * 60 * 60)
          : 999;

        let status: ConnectionStatus = 'disconnected';
        if (conn.status === 'connected') {
          status = hoursSinceSync < 24 ? 'active' : 'needs_sync';
        }

        return {
          name: conn.provider.charAt(0).toUpperCase() + conn.provider.slice(1),
          status
        };
      });
    },
    enabled: !!user?.id,
    staleTime: 60000
  });

  const getStatusIcon = (status: ConnectionStatus) => {
    switch (status) {
      case 'active':
        return <Check className="w-3 h-3 text-green-500" />;
      case 'needs_sync':
        return <AlertTriangle className="w-3 h-3 text-yellow-500" />;
      default:
        return <X className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: ConnectionStatus) => {
    switch (status) {
      case 'active': return 'Активно';
      case 'needs_sync': return 'Синхр.';
      default: return 'Откл.';
    }
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="min-w-[150px] p-3 rounded-2xl bg-card/50 border border-border/50 flex flex-col gap-2"
    >
      <Link to="/fitness-data?tab=connections" className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <Plug className="w-4 h-4 text-orange-500" />
          </div>
          <span className="text-xs font-medium text-foreground">Интеграции</span>
        </div>

        <div className="space-y-1.5">
          {integrations.length > 0 ? (
            integrations.slice(0, 2).map((integration) => (
              <div key={integration.name} className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">{integration.name}</span>
                <div className="flex items-center gap-1">
                  {getStatusIcon(integration.status)}
                  <span className="text-[10px] text-muted-foreground">
                    {getStatusText(integration.status)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-[11px] text-muted-foreground">Нет подключений</p>
          )}
        </div>

        <div className="text-[10px] text-primary mt-auto">Настроить →</div>
      </Link>
    </motion.div>
  );
}

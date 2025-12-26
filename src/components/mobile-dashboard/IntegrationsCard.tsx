import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plug, Check, AlertTriangle, Circle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type ConnectionStatus = 'active' | 'needs_sync' | 'disconnected';

interface Integration {
  name: string;
  provider: string;
  status: ConnectionStatus;
}

const PROVIDER_DISPLAY: Record<string, string> = {
  'WHOOP': 'WHOOP',
  'GARMIN': 'Garmin',
  'OURA': 'Oura',
  'WITHINGS': 'Withings',
  'FITBIT': 'Fitbit',
  'APPLE': 'Apple',
  'GOOGLE': 'Google Fit',
};

export function IntegrationsCard() {
  const { user } = useAuth();

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ['mobile-integrations-status', user?.id],
    queryFn: async (): Promise<Integration[]> => {
      if (!user?.id) return [];
      
      const { data } = await supabase
        .from('terra_tokens')
        .select('provider, is_active, last_sync_date')
        .eq('user_id', user.id);

      if (!data) return [];

      const now = new Date();
      return data.map(conn => {
        const hoursSinceSync = conn.last_sync_date 
          ? (now.getTime() - new Date(conn.last_sync_date).getTime()) / (1000 * 60 * 60)
          : 999;

        let status: ConnectionStatus = 'disconnected';
        if (conn.is_active) {
          status = hoursSinceSync < 24 ? 'active' : 'needs_sync';
        }

        return {
          name: PROVIDER_DISPLAY[conn.provider] || conn.provider,
          provider: conn.provider,
          status
        };
      });
    },
    enabled: !!user?.id,
    staleTime: 60000
  });

  const getStatusIndicator = (status: ConnectionStatus) => {
    switch (status) {
      case 'active':
        return <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />;
      case 'needs_sync':
        return <Circle className="w-2 h-2 fill-amber-500 text-amber-500" />;
      default:
        return <Circle className="w-2 h-2 fill-muted-foreground/50 text-muted-foreground/50" />;
    }
  };

  const getStatusText = (status: ConnectionStatus) => {
    switch (status) {
      case 'active': return 'Синхр.';
      case 'needs_sync': return 'Обновить';
      default: return 'Откл.';
    }
  };

  const activeCount = integrations.filter(i => i.status === 'active').length;

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="min-w-[160px] p-3 rounded-2xl bg-card/50 border border-border/50 flex flex-col gap-2"
    >
      <Link to="/fitness-data?tab=connections" className="flex flex-col gap-2 h-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Plug className="w-4 h-4 text-orange-500" />
            </div>
            <span className="text-xs font-medium text-foreground">Интеграции</span>
          </div>
          {activeCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 font-medium">
              {activeCount}
            </span>
          )}
        </div>

        <div className="space-y-1.5 flex-1">
          {isLoading ? (
            <div className="space-y-1.5">
              <div className="h-4 bg-muted/50 rounded animate-pulse" />
              <div className="h-4 bg-muted/50 rounded animate-pulse w-3/4" />
            </div>
          ) : integrations.length > 0 ? (
            integrations.slice(0, 3).map((integration) => (
              <div key={integration.provider} className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">{integration.name}</span>
                <div className="flex items-center gap-1.5">
                  {getStatusIndicator(integration.status)}
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

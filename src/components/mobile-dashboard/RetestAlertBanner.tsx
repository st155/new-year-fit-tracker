import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Alert {
  id: string;
  message: string;
}

export function RetestAlertBanner() {
  const { user } = useAuth();

  const { data: alerts } = useQuery({
    queryKey: ['mobile-retest-alerts', user?.id],
    queryFn: async (): Promise<Alert[]> => {
      if (!user?.id) return [];
      
      const { data } = await supabase
        .from('protocol_lifecycle_alerts')
        .select('id, message')
        .eq('user_id', user.id)
        .eq('alert_type', 'retest_prompt')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(3) as { data: Array<{ id: string; message: string }> | null };

      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 60000
  });

  if (!alerts?.length) return null;

  // Extract biomarker names from messages
  const biomarkerNames = alerts
    .map(alert => {
      const match = alert.message?.match(/пересдать\s+(.+?)(?:\s+для|\s*$)/i);
      return match?.[1] || 'анализ';
    })
    .slice(0, 2);

  const displayText = biomarkerNames.join(', ');
  const moreCount = alerts.length > 2 ? alerts.length - 2 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-4"
    >
      <Link to="/supplements">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 text-orange-500" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground">
                Пора пересдать анализы
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-500 font-medium">
                {alerts.length}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {displayText}{moreCount > 0 ? ` и ещё ${moreCount}` : ''}
            </p>
          </div>

          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>
      </Link>
    </motion.div>
  );
}

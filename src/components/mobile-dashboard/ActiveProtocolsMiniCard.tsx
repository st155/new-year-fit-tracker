import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Timer } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Protocol {
  id: string;
  name: string;
  adherence: number;
  progress: number;
}

export function ActiveProtocolsMiniCard() {
  const { t } = useTranslation('supplements');
  const { user } = useAuth();

  const { data: protocols = [], isLoading } = useQuery({
    queryKey: ['mobile-active-protocols', user?.id],
    queryFn: async (): Promise<Protocol[]> => {
      if (!user?.id) return [];
      
      const { data } = await supabase
        .from('protocols')
        .select('id, name, adherence_rate, start_date, end_date')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(2);

      if (!data) return [];

      const now = new Date();
      return data.map(protocol => {
        const startDate = new Date(protocol.start_date);
        const endDate = protocol.end_date ? new Date(protocol.end_date) : null;
        
        let progress = 0;
        if (endDate) {
          const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
          const daysPassed = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
          progress = Math.min(100, Math.max(0, Math.round((daysPassed / totalDays) * 100)));
        } else {
          // If no end date, show time-based progress (assume 12 weeks)
          const daysPassed = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
          progress = Math.min(100, Math.round((daysPassed / 84) * 100));
        }

        return {
          id: protocol.id,
          name: protocol.name,
          adherence: protocol.adherence_rate || 0,
          progress
        };
      });
    },
    enabled: !!user?.id,
    staleTime: 60000
  });

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="min-w-[160px] p-3 rounded-2xl bg-card/50 border border-border/50 flex flex-col gap-2"
    >
      <Link to="/supplements?tab=protocols" className="flex flex-col gap-2 h-full">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Timer className="w-4 h-4 text-primary" />
          </div>
          <span className="text-xs font-medium text-foreground">{t('miniCard.protocols')}</span>
        </div>

        <div className="space-y-2 flex-1">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-4 bg-muted/50 rounded animate-pulse" />
              <div className="h-1 bg-muted/50 rounded animate-pulse" />
            </div>
          ) : protocols.length > 0 ? (
            protocols.map((protocol) => (
              <div key={protocol.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground truncate max-w-[90px]">
                    {protocol.name}
                  </span>
                  <span className="text-[10px] font-medium text-emerald-500">
                    {protocol.adherence}%
                  </span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${protocol.progress}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-[11px] text-muted-foreground">{t('miniCard.noActive')}</p>
          )}
        </div>

        <div className="text-[10px] text-primary mt-auto">{t('miniCard.viewAll')}</div>
      </Link>
    </motion.div>
  );
}

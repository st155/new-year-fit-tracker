import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Timer } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Protocol {
  id: string;
  name: string;
  progress: number;
}

export function ActiveProtocolsMiniCard() {
  const { user } = useAuth();

  const { data: protocols = [] } = useQuery({
    queryKey: ['mobile-active-protocols', user?.id],
    queryFn: async (): Promise<Protocol[]> => {
      if (!user?.id) return [];
      
      // Use any to bypass strict type checking for tables not in generated types
      const { data } = await (supabase as any)
        .from('supplement_protocols')
        .select('id, protocol_name, start_date, duration_weeks')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(2);

      if (!data) return [];

      return (data as Array<{ id: string; protocol_name: string; start_date: string; duration_weeks: number | null }>).map(protocol => {
        const startDate = new Date(protocol.start_date);
        const now = new Date();
        const daysPassed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const totalDays = (protocol.duration_weeks || 12) * 7;
        const progress = Math.min(100, Math.round((daysPassed / totalDays) * 100));

        return {
          id: protocol.id,
          name: protocol.protocol_name,
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
      className="min-w-[150px] p-3 rounded-2xl bg-card/50 border border-border/50 flex flex-col gap-2"
    >
      <Link to="/supplements?tab=protocols" className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Timer className="w-4 h-4 text-primary" />
          </div>
          <span className="text-xs font-medium text-foreground">Протоколы</span>
        </div>

        <div className="space-y-2">
          {protocols.length > 0 ? (
            protocols.map((protocol) => (
              <div key={protocol.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground truncate max-w-[80px]">
                    {protocol.name}
                  </span>
                  <span className="text-[10px] font-medium text-foreground">
                    {protocol.progress}%
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
            <p className="text-[11px] text-muted-foreground">Нет активных</p>
          )}
        </div>

        <div className="text-[10px] text-primary mt-auto">Все протоколы →</div>
      </Link>
    </motion.div>
  );
}

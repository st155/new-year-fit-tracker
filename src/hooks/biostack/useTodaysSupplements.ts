import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface UnifiedSupplementItem {
  id: string;
  name: string;
  brand?: string;
  dosage: string;
  form?: string;
  intakeTime: string;
  source: 'manual' | 'protocol';
  sourceId: string; // user_stack.id or protocol_item.id
  protocolName?: string;
  takenToday: boolean;
  takenAt?: Date;
  productId?: string;
}

export function useTodaysSupplements() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Fetch active user_stack items (manual supplements) with today's intake logs
  const { data: manualSupplements = [] } = useQuery({
    queryKey: ['manual-supplements-today', user?.id, todayStart.toISOString()],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: stackItems, error: stackError } = await supabase
        .from('user_stack')
        .select(`
          *,
          supplement_products (
            name,
            brand,
            form,
            dosage_amount,
            dosage_unit
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .not('intake_times', 'is', null);

      if (stackError) throw stackError;

      // Fetch today's intake logs
      const stackItemIds = stackItems?.map(item => item.id) || [];
      const { data: logs } = await supabase
        .from('intake_logs')
        .select('*')
        .in('stack_item_id', stackItemIds)
        .gte('taken_at', todayStart.toISOString())
        .lte('taken_at', todayEnd.toISOString());

      const logsMap = new Map(logs?.map(log => [log.stack_item_id, log]) || []);

      // Transform to unified format
      const items: UnifiedSupplementItem[] = [];
      stackItems?.forEach(item => {
        const product = item.supplement_products;
        const intakeTimes = item.intake_times || [];
        
        intakeTimes.forEach(time => {
          const log = logsMap.get(item.id);
          items.push({
            id: `${item.id}-${time}`,
            name: product?.name || 'Unknown',
            brand: product?.brand,
            dosage: `${product?.dosage_amount || 0}${product?.dosage_unit || 'mg'}`,
            form: product?.form,
            intakeTime: time,
            source: 'manual',
            sourceId: item.id,
            takenToday: !!log,
            takenAt: log?.taken_at ? new Date(log.taken_at) : undefined,
            productId: item.product_id || undefined,
          });
        });
      });

      return items;
    },
    enabled: !!user?.id,
  });

  // Fetch protocol items with today's supplement logs
  const { data: protocolSupplements = [] } = useQuery({
    queryKey: ['protocol-supplements-today', user?.id, todayStart.toISOString()],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: protocols, error: protocolError } = await supabase
        .from('protocols')
        .select(`
          id,
          name,
          protocol_items (
            id,
            intake_time,
            supplement_products (
              id,
              name,
              brand,
              form,
              dosage_amount,
              dosage_unit
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (protocolError) throw protocolError;

      // Fetch today's supplement logs
      const protocolItemIds = protocols?.flatMap(p => 
        p.protocol_items?.map((item: any) => item.id) || []
      ) || [];
      
      const { data: logs } = await supabase
        .from('supplement_logs')
        .select('*')
        .in('protocol_item_id', protocolItemIds)
        .gte('scheduled_time', todayStart.toISOString())
        .lte('scheduled_time', todayEnd.toISOString())
        .eq('status', 'taken');

      const logsMap = new Map(logs?.map(log => [log.protocol_item_id, log]) || []);

      // Transform to unified format
      const items: UnifiedSupplementItem[] = [];
      protocols?.forEach(protocol => {
        protocol.protocol_items?.forEach((item: any) => {
          const product = item.supplement_products;
          const log = logsMap.get(item.id);
          
          items.push({
            id: `${item.id}-${item.intake_time}`,
            name: product?.name || 'Unknown',
            brand: product?.brand,
            dosage: `${product?.dosage_amount || 0}${product?.dosage_unit || 'mg'}`,
            form: product?.form,
            intakeTime: item.intake_time || 'morning',
            source: 'protocol',
            sourceId: item.id,
            protocolName: protocol.name,
            takenToday: !!log,
            takenAt: log?.taken_at ? new Date(log.taken_at) : undefined,
            productId: product?.id,
          });
        });
      });

      return items;
    },
    enabled: !!user?.id,
  });

  // Merge and group by intake time
  const allSupplements = [...manualSupplements, ...protocolSupplements];
  
  const groupedSupplements = {
    morning: allSupplements.filter(s => s.intakeTime === 'morning'),
    afternoon: allSupplements.filter(s => s.intakeTime === 'afternoon'),
    evening: allSupplements.filter(s => s.intakeTime === 'evening'),
    before_sleep: allSupplements.filter(s => s.intakeTime === 'before_sleep'),
    as_needed: allSupplements.filter(s => s.intakeTime === 'as_needed'),
  };

  // Log intake for selected items
  const logIntakeMutation = useMutation({
    mutationFn: async (items: UnifiedSupplementItem[]) => {
      if (!user?.id) throw new Error('Not authenticated');

      const manualItems = items.filter(i => i.source === 'manual');
      const protocolItems = items.filter(i => i.source === 'protocol');

      // Log manual supplements
      if (manualItems.length > 0) {
        const intakeLogs = manualItems.map(item => ({
          user_id: user.id,
          stack_item_id: item.sourceId,
          taken_at: new Date().toISOString(),
          servings_taken: 1,
        }));

        const { error: intakeError } = await supabase
          .from('intake_logs')
          .insert(intakeLogs);

        if (intakeError) throw intakeError;
      }

      // Log protocol supplements
      for (const item of protocolItems) {
        const { error: logError } = await supabase
          .from('supplement_logs')
          .update({ 
            status: 'taken',
            taken_at: new Date().toISOString(),
            servings_taken: 1
          })
          .eq('protocol_item_id', item.sourceId)
          .eq('status', 'pending')
          .gte('scheduled_time', todayStart.toISOString())
          .lte('scheduled_time', todayEnd.toISOString())
          .order('scheduled_time', { ascending: true })
          .limit(1);

        if (logError) throw logError;
      }
    },
    onSuccess: (_, items) => {
      queryClient.invalidateQueries({ queryKey: ['manual-supplements-today'] });
      queryClient.invalidateQueries({ queryKey: ['protocol-supplements-today'] });
      toast.success(`✅ Logged ${items.length} supplement${items.length > 1 ? 's' : ''}`);
    },
    onError: (error) => {
      console.error('Error logging intake:', error);
      toast.error('Failed to log intake');
    },
  });

  return {
    groupedSupplements,
    allSupplements,
    logIntakeMutation,
  };
}

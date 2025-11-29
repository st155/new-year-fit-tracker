import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { calculateTimeStatus } from "@/lib/supplement-timing";

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
  imageUrl?: string;
  
  // Smart timing fields
  scheduledTime?: string;        // "08:00", "14:00", "22:00"
  intakeInstruction?: string;    // "with_food", "before_sleep_30", etc.
  timeWindowMinutes: number;     // 60 = ±30 min
  
  // Computed fields
  isDueNow: boolean;
  isOverdue: boolean;
  minutesUntilDue?: number;
  minutesOverdue?: number;
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
            dosage_unit,
            image_url
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
          const takenAt = log?.taken_at ? new Date(log.taken_at) : undefined;
          const timeStatus = calculateTimeStatus(
            item.specific_time,
            item.time_window_minutes || 60,
            takenAt
          );
          
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
            takenAt,
            productId: item.product_id || undefined,
            imageUrl: product?.image_url,
            scheduledTime: item.specific_time,
            intakeInstruction: item.intake_instruction,
            timeWindowMinutes: item.time_window_minutes || 60,
            ...timeStatus,
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
            intake_times,
            daily_dosage,
            notes,
            supplement_products (
              id,
              name,
              brand,
              form,
              dosage_amount,
              dosage_unit,
              image_url
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

      // Group logs by protocol_item_id and intake_time (extracted from scheduled_time)
      const logsMap = new Map<string, any>();
      logs?.forEach(log => {
        const scheduledTime = new Date(log.scheduled_time);
        const hour = scheduledTime.getHours();
        let intakeTime = 'morning';
        if (hour >= 12 && hour < 17) intakeTime = 'afternoon';
        else if (hour >= 17 && hour < 21) intakeTime = 'evening';
        else if (hour >= 21 || hour < 6) intakeTime = 'before_sleep';
        
        const key = `${log.protocol_item_id}-${intakeTime}`;
        logsMap.set(key, log);
      });

      // Transform to unified format - expand intake_times array
      const items: UnifiedSupplementItem[] = [];
      protocols?.forEach(protocol => {
        protocol.protocol_items?.forEach((item: any) => {
          const product = item.supplement_products;
          const intakeTimes = item.intake_times || ['morning'];
          
          // Create separate entry for each intake time
          intakeTimes.forEach((time: string) => {
            const logKey = `${item.id}-${time}`;
            const log = logsMap.get(logKey);
            const takenAt = log?.taken_at ? new Date(log.taken_at) : undefined;
            const timeStatus = calculateTimeStatus(
              item.specific_time,
              item.time_window_minutes || 60,
              takenAt
            );
            
            items.push({
              id: `protocol-${item.id}-${time}`,
              name: product?.name || 'Unknown',
              brand: product?.brand,
              dosage: `${item.daily_dosage || product?.dosage_amount || 0}${product?.dosage_unit || 'mg'}`,
              form: product?.form,
              intakeTime: time,
              source: 'protocol',
              sourceId: item.id,
              protocolName: protocol.name,
              takenToday: !!log,
              takenAt,
              productId: product?.id,
              imageUrl: product?.image_url,
              scheduledTime: item.specific_time,
              intakeInstruction: item.intake_instruction,
              timeWindowMinutes: item.time_window_minutes || 60,
              ...timeStatus,
            });
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
        // Extract intake time from id (format: protocol-{itemId}-{time})
        const parts = item.id.split('-');
        const intakeTime = parts[parts.length - 1];
        
        // Map intake time to hour range for scheduled_time filtering
        let hourStart = 6, hourEnd = 12;
        if (intakeTime === 'afternoon') { hourStart = 12; hourEnd = 17; }
        else if (intakeTime === 'evening') { hourStart = 17; hourEnd = 21; }
        else if (intakeTime === 'before_sleep') { hourStart = 21; hourEnd = 24; }
        
        const scheduleStart = new Date(todayStart);
        scheduleStart.setHours(hourStart, 0, 0, 0);
        const scheduleEnd = new Date(todayStart);
        scheduleEnd.setHours(hourEnd, 0, 0, 0);
        
        const { error: logError } = await supabase
          .from('supplement_logs')
          .update({ 
            status: 'taken',
            taken_at: new Date().toISOString(),
            servings_taken: 1
          })
          .eq('protocol_item_id', item.sourceId)
          .eq('status', 'pending')
          .gte('scheduled_time', scheduleStart.toISOString())
          .lte('scheduled_time', scheduleEnd.toISOString())
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

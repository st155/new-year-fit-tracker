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
  linkedBiomarkerIds?: string[];
  logId?: string; // ID of the intake log for cancellation
  todayIntakeCount: number; // How many times taken today
  
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
  
  // Use local date to avoid UTC timezone conversion issues
  const now = new Date();
  const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Fetch active user_stack items (manual supplements) with today's intake logs
  const { data: manualSupplements = [] } = useQuery({
    queryKey: ['manual-supplements-today', user?.id, todayDateStr],
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

      // Fetch today's intake logs with intake_time
      const stackItemIds = stackItems?.map(item => item.id) || [];
      const { data: logs } = await supabase
        .from('intake_logs')
        .select('*')
        .in('stack_item_id', stackItemIds)
        .gte('taken_at', todayStart.toISOString())
        .lte('taken_at', todayEnd.toISOString());

      // Use composite key: stack_item_id + intake_time, count intakes
      const logsMap = new Map<string, any>();
      const logsCountMap = new Map<string, number>();
      logs?.forEach(log => {
        const key = `${log.stack_item_id}-${log.intake_time || 'unknown'}`;
        if (!logsMap.has(key)) {
          logsMap.set(key, log);
        }
        logsCountMap.set(key, (logsCountMap.get(key) || 0) + 1);
      });

      // Transform to unified format
      const items: UnifiedSupplementItem[] = [];
      stackItems?.forEach(item => {
        const product = item.supplement_products;
        const intakeTimes = item.intake_times || [];
        
        intakeTimes.forEach(time => {
          const logKey = `${item.id}-${time}`;
          const log = logsMap.get(logKey);
          const takenAt = log?.taken_at ? new Date(log.taken_at) : undefined;
          const intakeCount = logsCountMap.get(logKey) || 0;
          const timeStatus = calculateTimeStatus(
            (item as any).specific_time,
            (item as any).time_window_minutes || 60,
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
            logId: log?.id,
            productId: item.product_id || undefined,
            imageUrl: product?.image_url,
            linkedBiomarkerIds: item.linked_biomarker_ids || [],
            scheduledTime: (item as any).specific_time,
            intakeInstruction: (item as any).intake_instruction,
            timeWindowMinutes: (item as any).time_window_minutes || 60,
            todayIntakeCount: intakeCount,
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
    queryKey: ['protocol-supplements-today', user?.id, todayDateStr],
    queryFn: async () => {
      if (!user?.id) return [];

      console.log('🔍 [useTodaysSupplements] Fetching protocols for user:', user.id);

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

      console.log('📦 [useTodaysSupplements] Protocols fetched:', protocols?.length);
      console.log('📦 [useTodaysSupplements] Protocol items with intake_times:', 
        protocols?.flatMap(p => p.protocol_items?.map((i: any) => ({
          name: i.supplement_products?.name,
          intake_times: i.intake_times
        }))));

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

      // Group logs by protocol_item_id and intake_time (extracted from scheduled_time), count intakes
      const logsMap = new Map<string, any>();
      const logsCountMap = new Map<string, number>();
      logs?.forEach(log => {
        const scheduledTime = new Date(log.scheduled_time);
        const hour = scheduledTime.getHours();
        let intakeTime = 'morning';
        if (hour >= 12 && hour < 17) intakeTime = 'afternoon';
        else if (hour >= 17 && hour < 21) intakeTime = 'evening';
        else if (hour >= 21 || hour < 6) intakeTime = 'before_sleep';
        
        const key = `${log.protocol_item_id}-${intakeTime}`;
        if (!logsMap.has(key)) {
          logsMap.set(key, log);
        }
        logsCountMap.set(key, (logsCountMap.get(key) || 0) + 1);
      });

      // Transform to unified format - expand intake_times array
      const items: UnifiedSupplementItem[] = [];
      protocols?.forEach(protocol => {
        protocol.protocol_items?.forEach((item: any) => {
          const product = item.supplement_products;
          // Ensure intake_times is valid and non-empty
          const intakeTimes = (item.intake_times && item.intake_times.length > 0) 
            ? item.intake_times 
            : ['morning'];
          
          console.log(`🕐 [useTodaysSupplements] Processing item: ${product?.name}, intake_times:`, intakeTimes);
          
          // Create separate entry for each intake time
          intakeTimes.forEach((time: string) => {
            const logKey = `${item.id}-${time}`;
            const log = logsMap.get(logKey);
            const takenAt = log?.taken_at ? new Date(log.taken_at) : undefined;
            const intakeCount = logsCountMap.get(logKey) || 0;
            const timeStatus = calculateTimeStatus(
              (item as any).specific_time,
              (item as any).time_window_minutes || 60,
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
              logId: log?.id,
              productId: product?.id,
              imageUrl: product?.image_url,
              linkedBiomarkerIds: (item as any).linked_biomarker_ids || [],
              scheduledTime: (item as any).specific_time,
              intakeInstruction: (item as any).intake_instruction,
              timeWindowMinutes: (item as any).time_window_minutes || 60,
              todayIntakeCount: intakeCount,
              ...timeStatus,
            });
          });
        });
      });

      console.log('📦 [useTodaysSupplements] Protocol items transformed:', items.length);
      console.log('🌙 [useTodaysSupplements] Evening items:', items.filter(i => i.intakeTime === 'evening').length);
      console.log('😴 [useTodaysSupplements] Before sleep items:', items.filter(i => i.intakeTime === 'before_sleep').length);

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

  // Debug log for grouped supplements
  console.log('📊 [useTodaysSupplements] Grouped supplements:', {
    morning: groupedSupplements.morning.length,
    afternoon: groupedSupplements.afternoon.length,
    evening: groupedSupplements.evening.length,
    before_sleep: groupedSupplements.before_sleep.length,
    as_needed: groupedSupplements.as_needed.length,
    total: allSupplements.length,
  });

  // Log intake for selected items (only items NOT already taken today)
  const logIntakeMutation = useMutation({
    mutationFn: async (items: UnifiedSupplementItem[]) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Filter out already taken items to prevent duplicates
      const notTakenItems = items.filter(i => !i.takenToday);
      if (notTakenItems.length === 0) {
        throw new Error('All selected items already taken today');
      }

      const manualItems = notTakenItems.filter(i => i.source === 'manual');
      const protocolItems = notTakenItems.filter(i => i.source === 'protocol');

      // Log manual supplements with intake_time and intake_date
      if (manualItems.length > 0) {
        const stackItemIds = manualItems.map(item => item.sourceId);
        
        // Check which logs already exist for today
        const { data: existingLogs } = await supabase
          .from('intake_logs')
          .select('stack_item_id, intake_time')
          .eq('user_id', user.id)
          .eq('intake_date', todayDateStr)
          .in('stack_item_id', stackItemIds);

        // Build set of existing keys
        const existingKeys = new Set(
          (existingLogs || []).map(log => `${log.stack_item_id}-${log.intake_time}`)
        );

        // Filter to only items that don't have a log yet
        const itemsToInsert = manualItems.filter(item => {
          const key = `${item.sourceId}-${item.intakeTime}`;
          return !existingKeys.has(key);
        });

        if (itemsToInsert.length > 0) {
          const now = new Date();
          const intakeLogs = itemsToInsert.map(item => ({
            user_id: user.id,
            stack_item_id: item.sourceId,
            intake_time: item.intakeTime,
            intake_date: todayDateStr,
            taken_at: now.toISOString(),
            servings_taken: 1,
          }));

          const { error: intakeError } = await supabase
            .from('intake_logs')
            .insert(intakeLogs);

          if (intakeError) throw intakeError;
        }
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
        
        const { data: updatedLogs, error: logError } = await supabase
          .from('supplement_logs')
          .update({ 
            status: 'taken',
            taken_at: new Date().toISOString(),
            servings_taken: 1
          })
          .eq('protocol_item_id', item.sourceId)
          .eq('user_id', user.id)
          .in('status', ['scheduled', 'pending'])
          .gte('scheduled_time', scheduleStart.toISOString())
          .lte('scheduled_time', scheduleEnd.toISOString())
          .select('id');

        if (logError) throw logError;
        
        // Fallback: if no existing log found, create a new one with status='taken'
        if (!updatedLogs || updatedLogs.length === 0) {
          console.log(`No supplement_logs found, inserting new record for protocol_item_id=${item.sourceId}, time=${intakeTime}, scheduleStart=${scheduleStart.toISOString()}`);
          const { error: insertError } = await supabase
            .from('supplement_logs')
            .insert({
              user_id: user.id,
              protocol_item_id: item.sourceId,
              scheduled_time: scheduleStart.toISOString(), // Use scheduleStart to match the correct time slot
              status: 'taken',
              taken_at: new Date().toISOString(),
              servings_taken: 1
            });
          
          if (insertError) throw insertError;
        }
      }
      
      return notTakenItems.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['manual-supplements-today'] });
      queryClient.invalidateQueries({ queryKey: ['protocol-supplements-today'] });
      toast.success(`✅ Принято: ${count}`);
    },
    onError: (error: any) => {
      console.error('Error logging intake:', error);
      if (error.message === 'All selected items already taken today') {
        toast.info('Все выбранные добавки уже приняты сегодня');
      } else {
        toast.error('Ошибка при сохранении');
      }
    },
  });

  // Toggle intake (take or cancel)
  const toggleIntakeMutation = useMutation({
    mutationFn: async (item: UnifiedSupplementItem) => {
      if (!user?.id) throw new Error('Not authenticated');

      if (item.takenToday && item.logId) {
        // CANCEL - delete the log
        if (item.source === 'manual') {
          const { error } = await supabase
            .from('intake_logs')
            .delete()
            .eq('id', item.logId);
          
          if (error) throw error;
        } else {
          // Protocol: revert to scheduled
          const { error } = await supabase
            .from('supplement_logs')
            .update({ status: 'scheduled', taken_at: null })
            .eq('id', item.logId);
          
          if (error) throw error;
        }
        return { action: 'cancelled', name: item.name };
      } else {
        // TAKE - create log
        if (item.source === 'manual') {
          // Check if already exists
          const { data: existing } = await supabase
            .from('intake_logs')
            .select('id')
            .eq('user_id', user.id)
            .eq('stack_item_id', item.sourceId)
            .eq('intake_time', item.intakeTime)
            .eq('intake_date', todayDateStr)
            .maybeSingle();

          if (existing) {
            // Already taken - just return success
            return { action: 'taken', name: item.name };
          }

          const { error } = await supabase
            .from('intake_logs')
            .insert({
              user_id: user.id,
              stack_item_id: item.sourceId,
              intake_time: item.intakeTime,
              intake_date: todayDateStr,
              taken_at: new Date().toISOString(),
              servings_taken: 1,
            });
          
          if (error) throw error;
        } else {
          // Protocol: mark as taken
          const parts = item.id.split('-');
          const intakeTime = parts[parts.length - 1];
          
          let hourStart = 6, hourEnd = 12;
          if (intakeTime === 'afternoon') { hourStart = 12; hourEnd = 17; }
          else if (intakeTime === 'evening') { hourStart = 17; hourEnd = 21; }
          else if (intakeTime === 'before_sleep') { hourStart = 21; hourEnd = 24; }
          
          const scheduleStart = new Date(todayStart);
          scheduleStart.setHours(hourStart, 0, 0, 0);
          const scheduleEnd = new Date(todayStart);
          scheduleEnd.setHours(hourEnd, 0, 0, 0);
          
          const { data: updated, error } = await supabase
            .from('supplement_logs')
            .update({ 
              status: 'taken',
              taken_at: new Date().toISOString(),
              servings_taken: 1
            })
            .eq('protocol_item_id', item.sourceId)
            .eq('user_id', user.id)
            .in('status', ['scheduled', 'pending'])
            .gte('scheduled_time', scheduleStart.toISOString())
            .lte('scheduled_time', scheduleEnd.toISOString())
            .select('id');
          
          if (error) throw error;
          
          // Fallback: if no existing log found, create a new one with status='taken'
          if (!updated || updated.length === 0) {
            console.log(`No supplement_logs found for toggle, inserting new record for protocol_item_id=${item.sourceId}, scheduleStart=${scheduleStart.toISOString()}`);
            const { error: insertError } = await supabase
              .from('supplement_logs')
              .insert({
                user_id: user.id,
                protocol_item_id: item.sourceId,
                scheduled_time: scheduleStart.toISOString(), // Use scheduleStart to match the correct time slot
                status: 'taken',
                taken_at: new Date().toISOString(),
                servings_taken: 1
              });
            
            if (insertError) throw insertError;
          }
        }
        return { action: 'taken', name: item.name };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['manual-supplements-today'] });
      queryClient.invalidateQueries({ queryKey: ['protocol-supplements-today'] });
      if (result.action === 'cancelled') {
        toast.info(`↩️ Отменено: ${result.name}`);
      } else {
        toast.success(`✅ Принято: ${result.name}`);
      }
    },
    onError: (error) => {
      console.error('Error toggling intake:', error);
      toast.error('Ошибка');
    },
  });

  // Increment intake - add another serving for an already taken supplement
  const incrementIntakeMutation = useMutation({
    mutationFn: async (item: UnifiedSupplementItem) => {
      if (!user?.id) throw new Error('Not authenticated');

      if (item.source === 'manual') {
        const { error } = await supabase
          .from('intake_logs')
          .insert({
            user_id: user.id,
            stack_item_id: item.sourceId,
            intake_time: item.intakeTime,
            intake_date: todayDateStr,
            taken_at: new Date().toISOString(),
            servings_taken: 1,
          });
        
        if (error) throw error;
      } else {
        // Protocol: add another supplement_log entry with unique scheduled_time (current time)
        const now = new Date();

        const { error } = await supabase
          .from('supplement_logs')
          .insert({
            user_id: user.id,
            protocol_item_id: item.sourceId,
            scheduled_time: now.toISOString(), // Use current time to avoid duplicate key error
            status: 'taken',
            taken_at: now.toISOString(),
            servings_taken: 1
          });
        
        if (error) throw error;
      }
      
      return item;
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['manual-supplements-today'] });
      queryClient.invalidateQueries({ queryKey: ['protocol-supplements-today'] });
      toast.success(`➕ Добавлен приём: ${item.name}`);
    },
    onError: (error) => {
      console.error('Error incrementing intake:', error);
      toast.error('Ошибка при добавлении приёма');
    },
  });

  return {
    groupedSupplements,
    allSupplements,
    logIntakeMutation,
    toggleIntakeMutation,
    incrementIntakeMutation,
  };
}

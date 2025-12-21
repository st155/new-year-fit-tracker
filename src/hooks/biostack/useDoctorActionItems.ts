import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ActionType = 'supplement' | 'exercise' | 'lifestyle' | 'test' | 'medication' | 'consultation';

export interface DoctorActionItem {
  id: string;
  user_id: string;
  document_id: string;
  action_type: ActionType;
  name: string;
  details: string | null;
  dosage: string | null;
  frequency: string | null;
  schedule: string | null;
  duration: string | null;
  rationale: string | null;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'active' | 'completed' | 'dismissed' | 'added_to_library';
  doctor_name: string | null;
  prescription_date: string | null;
  confidence_score: number | null;
  added_to_library_at: string | null;
  protocol_tag: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupedActionItems {
  supplements: DoctorActionItem[];
  exercises: DoctorActionItem[];
  lifestyle: DoctorActionItem[];
  tests: DoctorActionItem[];
  medications: DoctorActionItem[];
  consultations: DoctorActionItem[];
}

export interface ProtocolGroup {
  protocolTag: string;
  doctorName: string | null;
  prescriptionDate: string | null;
  items: DoctorActionItem[];
  documentId: string;
}

export function useDoctorActionItems() {
  return useQuery({
    queryKey: ['doctor-action-items'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('doctor_action_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DoctorActionItem[];
    },
  });
}

export function useGroupedActionItems() {
  const { data: items, ...rest } = useDoctorActionItems();

  const grouped: GroupedActionItems = {
    supplements: [],
    exercises: [],
    lifestyle: [],
    tests: [],
    medications: [],
    consultations: [],
  };

  if (items) {
    items.forEach(item => {
      switch (item.action_type) {
        case 'supplement':
          grouped.supplements.push(item);
          break;
        case 'exercise':
          grouped.exercises.push(item);
          break;
        case 'lifestyle':
          grouped.lifestyle.push(item);
          break;
        case 'test':
          grouped.tests.push(item);
          break;
        case 'medication':
          grouped.medications.push(item);
          break;
        case 'consultation':
          grouped.consultations.push(item);
          break;
      }
    });
  }

  return { data: grouped, items, ...rest };
}

export function useProtocolGroups() {
  const { data: items, ...rest } = useDoctorActionItems();

  const protocols: ProtocolGroup[] = [];
  
  if (items) {
    const protocolMap = new Map<string, ProtocolGroup>();
    
    items.forEach(item => {
      const key = item.protocol_tag || `Документ ${item.document_id.substring(0, 8)}`;
      
      if (!protocolMap.has(key)) {
        protocolMap.set(key, {
          protocolTag: key,
          doctorName: item.doctor_name,
          prescriptionDate: item.prescription_date,
          items: [],
          documentId: item.document_id,
        });
      }
      
      protocolMap.get(key)!.items.push(item);
    });
    
    protocols.push(...protocolMap.values());
    
    // Sort by date (newest first)
    protocols.sort((a, b) => {
      const dateA = a.prescriptionDate ? new Date(a.prescriptionDate).getTime() : 0;
      const dateB = b.prescriptionDate ? new Date(b.prescriptionDate).getTime() : 0;
      return dateB - dateA;
    });
  }

  return { data: protocols, ...rest };
}

export function useUpdateActionItemStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      itemId, 
      status 
    }: { 
      itemId: string; 
      status: DoctorActionItem['status'];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updateData: Record<string, unknown> = { status };
      
      if (status === 'added_to_library') {
        updateData.added_to_library_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('doctor_action_items')
        .update(updateData)
        .eq('id', itemId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-action-items'] });
    },
  });
}

export function useDismissActionItem() {
  const updateStatus = useUpdateActionItemStatus();

  return useMutation({
    mutationFn: async (itemId: string) => {
      await updateStatus.mutateAsync({ itemId, status: 'dismissed' });
    },
    onSuccess: () => {
      toast.success('Рекомендация отклонена');
    },
  });
}

// Helper to parse schedule format like "1-0-1"
export function parseScheduleFormat(schedule: string): {
  morning: number;
  afternoon: number;
  evening: number;
  intakeTimes: string[];
} {
  const parts = schedule.split('-').map(Number);
  
  if (parts.length === 3 && parts.every(n => !isNaN(n))) {
    const [morning, afternoon, evening] = parts;
    const intakeTimes: string[] = [];
    
    if (morning > 0) intakeTimes.push('morning');
    if (afternoon > 0) intakeTimes.push('afternoon');
    if (evening > 0) intakeTimes.push('evening');
    
    return { morning, afternoon, evening, intakeTimes };
  }
  
  // Fallback for text-based schedules
  const lower = schedule.toLowerCase();
  const result = { morning: 0, afternoon: 0, evening: 0, intakeTimes: [] as string[] };
  
  if (lower.includes('утр') || lower.includes('morning')) {
    result.morning = 1;
    result.intakeTimes.push('morning');
  }
  if (lower.includes('день') || lower.includes('обед') || lower.includes('noon') || lower.includes('afternoon')) {
    result.afternoon = 1;
    result.intakeTimes.push('afternoon');
  }
  if (lower.includes('вечер') || lower.includes('ноч') || lower.includes('evening') || lower.includes('night')) {
    result.evening = 1;
    result.intakeTimes.push('evening');
  }
  
  // If nothing matched, assume morning
  if (result.intakeTimes.length === 0) {
    result.morning = 1;
    result.intakeTimes.push('morning');
  }
  
  return result;
}

// Format schedule for display
export function formatScheduleDisplay(schedule: string | null): string {
  if (!schedule) return '';
  
  // Check if it's "1-0-1" format
  const parts = schedule.split('-');
  if (parts.length === 3 && parts.every(p => /^\d+$/.test(p))) {
    const times: string[] = [];
    if (parseInt(parts[0]) > 0) times.push(`${parts[0]} утром`);
    if (parseInt(parts[1]) > 0) times.push(`${parts[1]} днём`);
    if (parseInt(parts[2]) > 0) times.push(`${parts[2]} вечером`);
    return times.join(', ');
  }
  
  return schedule;
}

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ScheduleEvent {
  id: string;
  trainer_id: string;
  client_id?: string;
  training_plan_id?: string;
  event_type: 'workout' | 'consultation' | 'reminder' | 'other';
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  is_completed: boolean;
  is_cancelled: boolean;
  recurrence_rule?: string;
  reminder_minutes?: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  client?: {
    user_id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
  training_plan?: {
    id: string;
    name: string;
  };
}

export function useScheduleEvents(startDate?: Date, endDate?: Date) {
  const { user } = useAuth();
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = async () => {
    if (!user) return;

    try {
      setLoading(true);

      let query = supabase
        .from('trainer_schedule_events')
        .select(`
          *,
          client:profiles!trainer_schedule_events_client_id_fkey (
            user_id,
            username,
            full_name,
            avatar_url
          ),
          training_plan:training_plans!trainer_schedule_events_training_plan_id_fkey (
            id,
            name
          )
        `)
        .eq('trainer_id', user.id)
        .order('start_time', { ascending: true });

      if (startDate) {
        query = query.gte('start_time', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('start_time', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      setEvents((data as any) || []);
    } catch (error) {
      console.error('Error loading schedule events:', error);
      toast.error('Ошибка загрузки событий');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [user, startDate, endDate]);

  const createEvent = async (event: Omit<ScheduleEvent, 'id' | 'trainer_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('trainer_schedule_events')
        .insert({
          ...event,
          trainer_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Событие создано');
      await loadEvents();
      return data;
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Ошибка создания события');
      return null;
    }
  };

  const updateEvent = async (id: string, updates: Partial<ScheduleEvent>) => {
    try {
      const { error } = await supabase
        .from('trainer_schedule_events')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast.success('Событие обновлено');
      await loadEvents();
      return true;
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Ошибка обновления события');
      return false;
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('trainer_schedule_events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Событие удалено');
      await loadEvents();
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Ошибка удаления события');
      return false;
    }
  };

  const toggleCompleted = async (id: string, isCompleted: boolean) => {
    return updateEvent(id, { is_completed: isCompleted });
  };

  return {
    events,
    loading,
    refetch: loadEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    toggleCompleted,
  };
}

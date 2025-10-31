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

      const { data, error } = await supabase
        .rpc('get_trainer_schedule_events', {
          p_trainer_id: user.id,
          p_start_date: startDate?.toISOString(),
          p_end_date: endDate?.toISOString()
        }) as { data: any[] | null; error: any };

      if (error) throw error;

      // Map RPC results to expected format
      const formattedEvents: ScheduleEvent[] = ((data as any[]) || []).map((event: any) => ({
        id: event.id,
        trainer_id: event.trainer_id,
        client_id: event.client_id,
        training_plan_id: event.training_plan_id,
        event_type: event.event_type,
        title: event.title,
        description: event.description,
        start_time: event.start_time,
        end_time: event.end_time,
        location: event.location,
        is_completed: event.is_completed,
        is_cancelled: event.is_cancelled,
        recurrence_rule: event.recurrence_rule,
        reminder_minutes: event.reminder_minutes,
        metadata: event.metadata,
        created_at: event.created_at,
        updated_at: event.updated_at,
        client: event.client_user_id ? {
          user_id: event.client_user_id,
          username: event.client_username || '',
          full_name: event.client_full_name || '',
          avatar_url: event.client_avatar_url
        } : undefined,
        training_plan: event.training_plan_name ? {
          id: event.training_plan_id!,
          name: event.training_plan_name
        } : undefined
      }));

      setEvents(formattedEvents);
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

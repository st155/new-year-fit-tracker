import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { ScheduleEvent } from '@/hooks/useScheduleEvents';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

interface ScheduleEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: ScheduleEvent | null;
  onSave: (event: any) => Promise<void>;
  defaultDate?: Date;
}

interface Client {
  user_id: string;
  username: string;
  full_name: string;
}

interface TrainingPlan {
  id: string;
  name: string;
}

export function ScheduleEventDialog({ open, onOpenChange, event, onSave, defaultDate }: ScheduleEventDialogProps) {
  const { t, i18n } = useTranslation('trainer');
  const locale = i18n.language === 'ru' ? ru : enUS;
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [plans, setPlans] = useState<TrainingPlan[]>([]);

  const [formData, setFormData] = useState({
    event_type: event?.event_type || 'workout',
    title: event?.title || '',
    description: event?.description || '',
    client_id: event?.client_id || '',
    training_plan_id: event?.training_plan_id || '',
    start_time: event?.start_time ? new Date(event.start_time) : defaultDate || new Date(),
    end_time: event?.end_time ? new Date(event.end_time) : defaultDate || new Date(),
    location: event?.location || '',
    reminder_minutes: event?.reminder_minutes || 30,
    is_completed: event?.is_completed || false,
    is_cancelled: event?.is_cancelled || false,
  });

  useEffect(() => {
    if (open) {
      loadClients();
      loadPlans();
    }
  }, [open]);

  useEffect(() => {
    if (event) {
      setFormData({
        event_type: event.event_type,
        title: event.title,
        description: event.description || '',
        client_id: event.client_id || '',
        training_plan_id: event.training_plan_id || '',
        start_time: new Date(event.start_time),
        end_time: new Date(event.end_time),
        location: event.location || '',
        reminder_minutes: event.reminder_minutes || 30,
        is_completed: event.is_completed,
        is_cancelled: event.is_cancelled,
      });
    } else if (defaultDate) {
      const endTime = new Date(defaultDate);
      endTime.setHours(endTime.getHours() + 1);
      setFormData(prev => ({
        ...prev,
        start_time: defaultDate,
        end_time: endTime,
      }));
    }
  }, [event, defaultDate]);

  const loadClients = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('trainer_clients')
        .select(`
          client_id,
          profiles!trainer_clients_client_id_fkey (
            user_id,
            username,
            full_name
          )
        `)
        .eq('trainer_id', user.id)
        .eq('active', true);

      if (error) throw error;

      setClients(data?.map((tc: any) => tc.profiles) || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadPlans = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('training_plans')
        .select('id, name')
        .eq('trainer_id', user.id)
        .order('name');

      if (error) throw error;

      setPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave({
        ...formData,
        start_time: formData.start_time.toISOString(),
        end_time: formData.end_time.toISOString(),
        client_id: formData.client_id || null,
        training_plan_id: formData.training_plan_id || null,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving event:', error);
    } finally {
      setLoading(false);
    }
  };

  const setTimeForDate = (date: Date, hours: number, minutes: number) => {
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? t('calendar.dialog.editTitle') : t('calendar.dialog.createTitle')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event_type">{t('calendar.dialog.eventType')}</Label>
            <Select
              value={formData.event_type}
              onValueChange={(value: any) => setFormData({ ...formData, event_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="workout">{t('calendar.eventTypes.workout')}</SelectItem>
                <SelectItem value="consultation">{t('calendar.eventTypes.consultation')}</SelectItem>
                <SelectItem value="reminder">{t('calendar.eventTypes.reminder')}</SelectItem>
                <SelectItem value="other">{t('calendar.eventTypes.other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">{t('calendar.dialog.title')}</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('calendar.dialog.description')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('calendar.dialog.client')}</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('calendar.dialog.selectClient')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('calendar.dialog.noClient')}</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.user_id} value={client.user_id}>
                      {client.full_name || client.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('calendar.dialog.trainingPlan')}</Label>
              <Select
                value={formData.training_plan_id}
                onValueChange={(value) => setFormData({ ...formData, training_plan_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('calendar.dialog.selectPlan')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('calendar.dialog.noPlan')}</SelectItem>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('calendar.dialog.startDate')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.start_time, 'PPP', { locale })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.start_time}
                    onSelect={(date) => date && setFormData({ 
                      ...formData, 
                      start_time: setTimeForDate(date, formData.start_time.getHours(), formData.start_time.getMinutes())
                    })}
                    locale={locale}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>{t('calendar.dialog.startTime')}</Label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={format(formData.start_time, 'HH:mm')}
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(':').map(Number);
                    setFormData({ 
                      ...formData, 
                      start_time: setTimeForDate(formData.start_time, hours, minutes)
                    });
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('calendar.dialog.endDate')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.end_time, 'PPP', { locale })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.end_time}
                    onSelect={(date) => date && setFormData({ 
                      ...formData, 
                      end_time: setTimeForDate(date, formData.end_time.getHours(), formData.end_time.getMinutes())
                    })}
                    locale={locale}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>{t('calendar.dialog.endTime')}</Label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={format(formData.end_time, 'HH:mm')}
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(':').map(Number);
                    setFormData({ 
                      ...formData, 
                      end_time: setTimeForDate(formData.end_time, hours, minutes)
                    });
                  }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">{t('calendar.dialog.location')}</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder={t('calendar.dialog.locationPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder">{t('calendar.dialog.reminder')}</Label>
            <Select
              value={formData.reminder_minutes.toString()}
              onValueChange={(value) => setFormData({ ...formData, reminder_minutes: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">{t('calendar.dialog.reminders.none')}</SelectItem>
                <SelectItem value="15">{t('calendar.dialog.reminders.15min')}</SelectItem>
                <SelectItem value="30">{t('calendar.dialog.reminders.30min')}</SelectItem>
                <SelectItem value="60">{t('calendar.dialog.reminders.1hour')}</SelectItem>
                <SelectItem value="120">{t('calendar.dialog.reminders.2hours')}</SelectItem>
                <SelectItem value="1440">{t('calendar.dialog.reminders.1day')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('calendar.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('calendar.dialog.saving') : event ? t('calendar.dialog.save') : t('calendar.dialog.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

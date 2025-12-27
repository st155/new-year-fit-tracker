import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clients: Array<{ user_id: string; username: string; full_name: string }>;
}

export const CreateTaskDialog = ({ open, onClose, onSuccess, clients }: CreateTaskDialogProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [priority, setPriority] = useState('normal');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation('trainer');

  const handleSubmit = async () => {
    if (!title.trim() || !clientId) {
      toast({
        title: t('tasks.error'),
        description: t('tasks.fillRequired'),
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('client_tasks')
        .insert({
          trainer_id: user.user.id,
          client_id: clientId,
          title: title.trim(),
          description: description.trim() || null,
          priority,
          deadline: deadline || null,
          status: 'pending'
        });

      if (error) throw error;

      console.log('Task created successfully');
      
      toast({
        title: t('tasks.createSuccess')
      });

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Detailed error:', error);
      toast({
        title: t('tasks.error'),
        description: error.message || t('tasks.createError'),
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setClientId('');
    setPriority('normal');
    setDeadline('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('tasks.createTask')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>{t('tasks.client')} *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder={t('tasks.selectClient')} />
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.user_id} value={client.user_id}>
                    {client.full_name} (@{client.username})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t('tasks.taskTitle')} *</Label>
            <Input
              placeholder={t('tasks.taskTitlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <Label>{t('tasks.description')}</Label>
            <Textarea
              placeholder={t('tasks.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('tasks.priority')}</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('tasks.priorities.low')}</SelectItem>
                  <SelectItem value="normal">{t('tasks.priorities.normal')}</SelectItem>
                  <SelectItem value="high">{t('tasks.priorities.high')}</SelectItem>
                  <SelectItem value="urgent">{t('tasks.priorities.urgent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('tasks.deadline')}</Label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('tasks.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? t('tasks.creating') : t('tasks.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

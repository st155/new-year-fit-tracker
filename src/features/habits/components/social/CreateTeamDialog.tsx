import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useCreateTeam } from '@/hooks/useHabitTeams';

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTeamDialog({ open, onOpenChange }: CreateTeamDialogProps) {
  const { t } = useTranslation('habits');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [maxMembers, setMaxMembers] = useState(10);

  const createTeam = useCreateTeam();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    await createTeam.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      is_public: isPublic,
      member_limit: maxMembers,
    });

    onOpenChange(false);
    setName('');
    setDescription('');
    setIsPublic(true);
    setMaxMembers(10);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('createTeam.title')}</DialogTitle>
          <DialogDescription>
            {t('createTeam.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">{t('createTeam.teamName')}</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('createTeam.teamNamePlaceholder')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-description">{t('createTeam.descriptionLabel')}</Label>
            <Textarea
              id="team-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('createTeam.descriptionPlaceholder')}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-members">{t('createTeam.maxMembers')}</Label>
            <Input
              id="max-members"
              type="number"
              min={2}
              max={100}
              value={maxMembers}
              onChange={(e) => setMaxMembers(parseInt(e.target.value) || 10)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="is-public">{t('createTeam.isPublic')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('createTeam.publicHint')}
              </p>
            </div>
            <Switch
              id="is-public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('createTeam.cancel')}
            </Button>
            <Button type="submit" disabled={createTeam.isPending || !name.trim()}>
              {createTeam.isPending ? t('createTeam.creating') : t('createTeam.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

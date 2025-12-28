import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ClientCandidate {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
}

interface Disambiguation {
  mentionedName: string;
  candidates: ClientCandidate[];
}

interface ClientDisambiguationModalProps {
  open: boolean;
  disambiguations: Disambiguation[];
  onResolve: (resolvedClients: Map<string, string>) => void;
  onClose: () => void;
}

export const ClientDisambiguationModal = ({
  open,
  disambiguations,
  onResolve,
  onClose
}: ClientDisambiguationModalProps) => {
  const { t } = useTranslation('trainer');
  const [selections, setSelections] = React.useState<Map<string, ClientCandidate>>(new Map());
  const [rememberChoices, setRememberChoices] = React.useState<Set<string>>(new Set());

  const handleSelect = (mentionedName: string, client: ClientCandidate, remember: boolean) => {
    setSelections(prev => new Map(prev).set(mentionedName, client));
    if (remember) {
      setRememberChoices(prev => new Set(prev).add(mentionedName));
    } else {
      setRememberChoices(prev => {
        const next = new Set(prev);
        next.delete(mentionedName);
        return next;
      });
    }
  };

  const handleConfirm = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Save aliases for "remember" selections
    const aliasPromises = Array.from(selections.entries())
      .filter(([name]) => rememberChoices.has(name))
      .map(([aliasName, client]) =>
        supabase.from('client_aliases').insert({
          trainer_id: user.id,
          client_id: client.user_id,
          alias_name: aliasName,
          used_count: 1
        })
      );

    if (aliasPromises.length > 0) {
      const results = await Promise.all(aliasPromises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('Error saving aliases:', errors);
        toast.error(t('disambiguation.saveError'));
      } else {
        toast.success(t('disambiguation.savedCount', { count: aliasPromises.length }));
      }
    }

    // Return resolved mappings
    const resolved = new Map(
      Array.from(selections.entries()).map(([name, client]) => [name, client.user_id])
    );
    onResolve(resolved);
    onClose();
  };

  const allSelected = disambiguations.every(d => selections.has(d.mentionedName));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('disambiguation.title')}</DialogTitle>
          <DialogDescription>
            {t('disambiguation.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {disambiguations.map((disambiguation) => {
            const selected = selections.get(disambiguation.mentionedName);
            const remember = rememberChoices.has(disambiguation.mentionedName);

            return (
              <div key={disambiguation.mentionedName} className="space-y-3">
                <div className="font-medium">
                  {t('disambiguation.mentioned')}: <span className="text-primary">@{disambiguation.mentionedName}</span>
                </div>
                <div className="space-y-2">
                  {disambiguation.candidates.map((candidate) => {
                    const isSelected = selected?.user_id === candidate.user_id;
                    
                    return (
                      <div
                        key={candidate.user_id}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => handleSelect(disambiguation.mentionedName, candidate, remember)}
                      >
                        <Avatar className="h-10 w-10">
                          {candidate.avatar_url && (
                            <img src={candidate.avatar_url} alt={candidate.full_name} />
                          )}
                          <AvatarFallback>
                            {candidate.full_name?.substring(0, 2).toUpperCase() || 'CL'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="font-medium">{candidate.full_name}</div>
                          <div className="text-sm text-muted-foreground">@{candidate.username}</div>
                        </div>

                        {isSelected && (
                          <div className="flex items-center gap-2">
                            <Check className="h-5 w-5 text-primary" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selected && (
                  <div className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      id={`remember-${disambiguation.mentionedName}`}
                      checked={remember}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRememberChoices(prev => new Set(prev).add(disambiguation.mentionedName));
                        } else {
                          setRememberChoices(prev => {
                            const next = new Set(prev);
                            next.delete(disambiguation.mentionedName);
                            return next;
                          });
                        }
                      }}
                      className="rounded"
                    />
                    <label
                      htmlFor={`remember-${disambiguation.mentionedName}`}
                      className="cursor-pointer"
                    >
                      {t('disambiguation.remember')}: "<strong>{disambiguation.mentionedName}</strong>" → {selected.full_name}
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={!allSelected}>
            {t('disambiguation.confirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

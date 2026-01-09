/**
 * Keyboard Shortcuts Hint Panel
 * Shows all available keyboard shortcuts (triggered by '?')
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Keyboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ShortcutHintPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Shortcut {
  keys: string[];
  descriptionKey: string;
  category: string;
}

const SHORTCUTS: Shortcut[] = [
  // Navigation
  { keys: ['⌘', 'K'], descriptionKey: 'openCommandPalette', category: 'navigation' },
  { keys: ['G', 'H'], descriptionKey: 'goToHabits', category: 'navigation' },
  { keys: ['G', 'G'], descriptionKey: 'goToGoals', category: 'navigation' },
  { keys: ['G', 'D'], descriptionKey: 'goToDashboard', category: 'navigation' },
  { keys: ['G', 'C'], descriptionKey: 'goToChallenges', category: 'navigation' },
  
  // Actions
  { keys: ['N'], descriptionKey: 'createNew', category: 'actions' },
  { keys: ['Enter'], descriptionKey: 'completeHabit', category: 'actions' },
  { keys: ['E'], descriptionKey: 'edit', category: 'actions' },
  { keys: ['→'], descriptionKey: 'swipeRight', category: 'actions' },
  { keys: ['←'], descriptionKey: 'swipeLeft', category: 'actions' },
  
  // General
  { keys: ['Esc'], descriptionKey: 'closeModal', category: 'general' },
  { keys: ['?'], descriptionKey: 'showHints', category: 'general' },
  { keys: ['⌘', 'S'], descriptionKey: 'save', category: 'general' },
];

const KeyBadge = ({ keyLabel }: { keyLabel: string }) => (
  <Badge 
    variant="outline" 
    className="min-w-[32px] h-7 flex items-center justify-center font-mono text-xs px-2"
  >
    {keyLabel}
  </Badge>
);

export function ShortcutsHintPanel({ open, onOpenChange }: ShortcutHintPanelProps) {
  const { t } = useTranslation('shortcuts');
  const categories = ['navigation', 'actions', 'general'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            <DialogTitle>{t('title')}</DialogTitle>
          </div>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {categories.map(category => (
              <div key={category}>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                  {t(`categories.${category}`)}
                </h3>
                <div className="space-y-2">
                  {SHORTCUTS.filter(s => s.category === category).map((shortcut, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm">{t(`shortcuts.${shortcut.descriptionKey}`)}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <KeyBadge key={keyIndex} keyLabel={key} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
              {t('legend')}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <KeyBadge keyLabel="⌘" />
                <span>{t('keys.command')}</span>
              </div>
              <div className="flex items-center gap-2">
                <KeyBadge keyLabel="⇧" />
                <span>{t('keys.shift')}</span>
              </div>
              <div className="flex items-center gap-2">
                <KeyBadge keyLabel="⌥" />
                <span>{t('keys.option')}</span>
              </div>
              <div className="flex items-center gap-2">
                <KeyBadge keyLabel="Esc" />
                <span>{t('keys.escape')}</span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

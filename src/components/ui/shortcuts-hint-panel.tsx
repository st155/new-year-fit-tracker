/**
 * Keyboard Shortcuts Hint Panel
 * Shows all available keyboard shortcuts (triggered by '?')
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Keyboard } from 'lucide-react';

interface ShortcutHintPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const SHORTCUTS: Shortcut[] = [
  // Navigation
  { keys: ['⌘', 'K'], description: 'Открыть палитру команд', category: 'Навигация' },
  { keys: ['G', 'H'], description: 'Перейти к Привычкам', category: 'Навигация' },
  { keys: ['G', 'G'], description: 'Перейти к Целям', category: 'Навигация' },
  { keys: ['G', 'D'], description: 'Перейти к Dashboard', category: 'Навигация' },
  { keys: ['G', 'C'], description: 'Перейти к Челленджам', category: 'Навигация' },
  
  // Actions
  { keys: ['N'], description: 'Создать новую привычку/цель', category: 'Действия' },
  { keys: ['Enter'], description: 'Завершить привычку (в фокусе)', category: 'Действия' },
  { keys: ['E'], description: 'Редактировать (в фокусе)', category: 'Действия' },
  { keys: ['→'], description: 'Свайп вправо (завершить)', category: 'Действия' },
  { keys: ['←'], description: 'Свайп влево (опции)', category: 'Действия' },
  
  // General
  { keys: ['Esc'], description: 'Закрыть модальное окно', category: 'Общие' },
  { keys: ['?'], description: 'Показать подсказки', category: 'Общие' },
  { keys: ['⌘', 'S'], description: 'Сохранить', category: 'Общие' },
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
  const categories = Array.from(new Set(SHORTCUTS.map(s => s.category)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            <DialogTitle>Клавиатурные сокращения</DialogTitle>
          </div>
          <DialogDescription>
            Используйте эти сочетания клавиш для быстрого доступа к функциям
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6">
            {categories.map(category => (
              <div key={category}>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                  {category}
                </h3>
                <div className="space-y-2">
                  {SHORTCUTS.filter(s => s.category === category).map((shortcut, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm">{shortcut.description}</span>
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
              Обозначения
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <KeyBadge keyLabel="⌘" />
                <span>Command (Mac) / Ctrl (Windows)</span>
              </div>
              <div className="flex items-center gap-2">
                <KeyBadge keyLabel="⇧" />
                <span>Shift</span>
              </div>
              <div className="flex items-center gap-2">
                <KeyBadge keyLabel="⌥" />
                <span>Option (Mac) / Alt (Windows)</span>
              </div>
              <div className="flex items-center gap-2">
                <KeyBadge keyLabel="Esc" />
                <span>Escape</span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
/**
 * Keyboard Shortcuts Panel
 * Shows available keyboard shortcuts in a modal
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Command, Keyboard } from "lucide-react";

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ['Space'], description: 'Start/Stop timer', category: 'Workout' },
  { keys: ['L'], description: 'Log current set', category: 'Workout' },
  { keys: ['N'], description: 'Next exercise', category: 'Navigation' },
  { keys: ['P'], description: 'Previous exercise', category: 'Navigation' },
  { keys: ['Esc'], description: 'Close modal/dialog', category: 'General' },
  { keys: ['?'], description: 'Show shortcuts', category: 'General' },
];

interface ShortcutsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ShortcutsPanel({ open, onOpenChange }: ShortcutsPanelProps) {
  const categories = [...new Set(SHORTCUTS.map(s => s.category))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-6">
            {categories.map(category => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {SHORTCUTS.filter(s => s.category === category).map((shortcut, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2">
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex gap-1">
                        {shortcut.keys.map((key, keyIdx) => (
                          <Badge key={keyIdx} variant="outline" className="font-mono text-xs">
                            {key}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <Command className="w-3 h-3 inline mr-1" />
            Press <Badge variant="outline" className="mx-1 font-mono">?</Badge> anytime to view shortcuts
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

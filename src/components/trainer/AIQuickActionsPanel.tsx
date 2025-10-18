import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Sparkles } from 'lucide-react';
import { TrainerAIWidget } from './TrainerAIWidget';

export const AIQuickActionsPanel = () => {
  const [isOpen, setIsOpen] = useState(false);

  const quickPrompts = [
    { label: 'Кто не тренировался сегодня?', prompt: 'Кто из моих клиентов не тренировался сегодня?' },
    { label: 'Прогресс за неделю', prompt: 'Какой прогресс у моих клиентов за эту неделю?' },
    { label: 'Кому обновить цели?', prompt: 'У кого из клиентов нужно обновить цели?' },
    { label: 'Задачи на завтра', prompt: 'Создать задачи на завтра для всех клиентов' }
  ];

  return (
    <>
      {/* Floating button */}
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        onClick={() => setIsOpen(true)}
      >
        <Sparkles className="h-6 w-6" />
      </Button>

      {/* Quick actions sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:w-[500px] p-0">
          <SheetHeader className="p-6 pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Assistant
            </SheetTitle>
          </SheetHeader>

          <div className="px-6 pb-6 space-y-4">
            {/* Quick prompts */}
            <div className="grid grid-cols-2 gap-2">
              {quickPrompts.map((item, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  className="h-auto py-3 text-xs whitespace-normal"
                  onClick={() => {
                    // TODO: Send prompt directly
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </div>

            {/* Mini chat */}
            <div className="h-[calc(100vh-300px)]">
              <TrainerAIWidget compact embedded />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

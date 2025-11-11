/**
 * Command Palette Component
 * Quick access to actions and navigation (Cmd+K)
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Command, 
  CommandDialog,
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList,
  CommandSeparator
} from '@/components/ui/command';
import { 
  Target, 
  CheckCircle, 
  Trophy, 
  Home, 
  BarChart3,
  Settings,
  Activity,
  Calendar,
  Plus
} from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();

  const runCommand = (command: () => void) => {
    command();
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Поиск действий..." />
      <CommandList>
        <CommandEmpty>Ничего не найдено</CommandEmpty>
        
        <CommandGroup heading="Быстрые действия">
          <CommandItem onSelect={() => runCommand(() => navigate('/goals'))}>
            <Plus className="mr-2 h-4 w-4" />
            Создать цель
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/habits'))}>
            <Plus className="mr-2 h-4 w-4" />
            Создать привычку
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/challenges'))}>
            <Plus className="mr-2 h-4 w-4" />
            Присоединиться к челленджу
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Навигация">
          <CommandItem onSelect={() => runCommand(() => navigate('/'))}>
            <Home className="mr-2 h-4 w-4" />
            Главная
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/goals'))}>
            <Target className="mr-2 h-4 w-4" />
            Цели
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/habits'))}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Привычки
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/challenges'))}>
            <Trophy className="mr-2 h-4 w-4" />
            Челленджи
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/fitness-data'))}>
            <Activity className="mr-2 h-4 w-4" />
            Фитнес данные
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/analytics'))}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Аналитика
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/calendar'))}>
            <Calendar className="mr-2 h-4 w-4" />
            Календарь
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Настройки">
          <CommandItem onSelect={() => runCommand(() => navigate('/profile'))}>
            <Settings className="mr-2 h-4 w-4" />
            Профиль
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

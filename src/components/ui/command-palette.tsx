/**
 * Command Palette Component
 * Quick access to actions and navigation (Cmd+K)
 */

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
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
  const { t } = useTranslation('navigation');

  const runCommand = (command: () => void) => {
    command();
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t('command.searchPlaceholder')} />
      <CommandList>
        <CommandEmpty>{t('command.noResults')}</CommandEmpty>
        
        <CommandGroup heading={t('command.quickActions')}>
          <CommandItem onSelect={() => runCommand(() => navigate('/goals'))}>
            <Plus className="mr-2 h-4 w-4" />
            {t('command.createGoal')}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/habits'))}>
            <Plus className="mr-2 h-4 w-4" />
            {t('command.createHabit')}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/challenges'))}>
            <Plus className="mr-2 h-4 w-4" />
            {t('command.joinChallenge')}
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading={t('command.navigation')}>
          <CommandItem onSelect={() => runCommand(() => navigate('/'))}>
            <Home className="mr-2 h-4 w-4" />
            {t('home')}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/goals'))}>
            <Target className="mr-2 h-4 w-4" />
            {t('goals')}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/habits'))}>
            <CheckCircle className="mr-2 h-4 w-4" />
            {t('habits')}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/challenges'))}>
            <Trophy className="mr-2 h-4 w-4" />
            {t('challenges')}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/fitness-data'))}>
            <Activity className="mr-2 h-4 w-4" />
            {t('fitnessData')}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/analytics'))}>
            <BarChart3 className="mr-2 h-4 w-4" />
            {t('analytics')}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/calendar'))}>
            <Calendar className="mr-2 h-4 w-4" />
            {t('calendar')}
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading={t('settings')}>
          <CommandItem onSelect={() => runCommand(() => navigate('/profile'))}>
            <Settings className="mr-2 h-4 w-4" />
            {t('profile')}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

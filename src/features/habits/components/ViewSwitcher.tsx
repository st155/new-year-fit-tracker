/**
 * ViewSwitcher - минималистичный иконочный переключатель видов
 */

import { motion } from 'framer-motion';
import { LayoutGrid, List, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'widgets' | 'list' | 'analytics';

interface ViewSwitcherProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const views: { mode: ViewMode; icon: typeof LayoutGrid; label: string }[] = [
  { mode: 'widgets', icon: LayoutGrid, label: 'Виджеты' },
  { mode: 'list', icon: List, label: 'Список' },
  { mode: 'analytics', icon: BarChart3, label: 'Аналитика' },
];

export function ViewSwitcher({ value, onChange }: ViewSwitcherProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 backdrop-blur-sm">
      {views.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={cn(
            "relative p-2 rounded-lg transition-colors",
            value === mode 
              ? "text-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
          title={label}
        >
          {value === mode && (
            <motion.div
              layoutId="viewSwitcherIndicator"
              className="absolute inset-0 bg-background rounded-lg shadow-sm"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <Icon className="w-5 h-5 relative z-10" />
        </button>
      ))}
    </div>
  );
}

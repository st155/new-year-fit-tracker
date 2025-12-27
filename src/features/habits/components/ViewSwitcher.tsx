/**
 * ViewSwitcher - минималистичный иконочный переключатель видов
 */

import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { LayoutGrid, List, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'widgets' | 'list' | 'analytics';

interface ViewSwitcherProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewSwitcher({ value, onChange }: ViewSwitcherProps) {
  const { t } = useTranslation('habits');

  const views: { mode: ViewMode; icon: typeof LayoutGrid; labelKey: string }[] = [
    { mode: 'widgets', icon: LayoutGrid, labelKey: 'viewSwitcher.widgets' },
    { mode: 'list', icon: List, labelKey: 'viewSwitcher.list' },
    { mode: 'analytics', icon: BarChart3, labelKey: 'viewSwitcher.analytics' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 backdrop-blur-sm">
      {views.map(({ mode, icon: Icon, labelKey }) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={cn(
            "relative p-2 rounded-lg transition-colors",
            value === mode 
              ? "text-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
          title={t(labelKey)}
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

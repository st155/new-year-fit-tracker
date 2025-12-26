/**
 * Timeline Section - Accordion section for time of day
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Sunrise, Sun, Sunset, Moon, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TimelineSupplementCard } from './TimelineSupplementCard';
import { cn } from '@/lib/utils';
import type { UnifiedSupplementItem } from '@/hooks/biostack/useTodaysSupplements';

interface TimelineSectionProps {
  timeSlot: 'morning' | 'noon' | 'evening' | 'bedtime';
  items: UnifiedSupplementItem[];
  lowStockIds: Set<string>;
  onToggleItem: (item: UnifiedSupplementItem) => void;
  onTakeAll: () => void;
  isExpanded: boolean;
  onToggle: () => void;
  togglingItemId?: string;
}

const timeSlotConfig = {
  morning: { 
    label: 'Утро', 
    icon: Sunrise,
    gradient: 'from-amber-500/20 to-orange-500/20'
  },
  noon: { 
    label: 'День', 
    icon: Sun,
    gradient: 'from-yellow-500/20 to-amber-500/20'
  },
  evening: { 
    label: 'Вечер', 
    icon: Sunset,
    gradient: 'from-purple-500/20 to-pink-500/20'
  },
  bedtime: { 
    label: 'Перед сном', 
    icon: Moon,
    gradient: 'from-indigo-500/20 to-purple-500/20'
  },
};

export function TimelineSection({
  timeSlot,
  items,
  lowStockIds,
  onToggleItem,
  onTakeAll,
  isExpanded,
  onToggle,
  togglingItemId,
}: TimelineSectionProps) {
  const config = timeSlotConfig[timeSlot];
  const Icon = config.icon;
  
  const takenCount = items.filter(i => i.takenToday).length;
  const totalCount = items.length;
  const allTaken = takenCount === totalCount && totalCount > 0;
  const hasItems = items.length > 0;

  if (!hasItems) return null;

  return (
    <motion.div
      layout
      className={cn(
        "rounded-2xl border overflow-hidden transition-colors",
        allTaken 
          ? "bg-green-500/5 border-green-500/20" 
          : "bg-card/30 border-border/50"
      )}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-3 p-4 transition-colors",
          "hover:bg-muted/30"
        )}
      >
        {/* Icon */}
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br",
          config.gradient
        )}>
          <Icon className={cn(
            "w-5 h-5",
            allTaken ? "text-green-500" : "text-foreground"
          )} />
        </div>

        {/* Label + count */}
        <div className="flex-1 text-left">
          <p className={cn(
            "font-semibold",
            allTaken && "text-green-500"
          )}>
            {config.label}
          </p>
          <p className="text-sm text-muted-foreground">
            {takenCount} / {totalCount} принято
          </p>
        </div>

        {/* Status indicator */}
        {allTaken ? (
          <CheckCircle2 className="w-6 h-6 text-green-500" />
        ) : (
          <ChevronDown className={cn(
            "w-5 h-5 text-muted-foreground transition-transform",
            isExpanded && "rotate-180"
          )} />
        )}
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {/* Take All button */}
              {!allTaken && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTakeAll();
                  }}
                  className="w-full mb-2 border-dashed"
                >
                  Принять всё ({totalCount - takenCount})
                </Button>
              )}

              {/* Supplement cards */}
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <TimelineSupplementCard
                    item={item}
                    isLowStock={lowStockIds.has(item.sourceId)}
                    onToggle={() => onToggleItem(item)}
                    isToggling={togglingItemId === item.id}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

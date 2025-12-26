/**
 * Timeline Supplement Card - Individual supplement with checkbox
 */

import { motion } from 'framer-motion';
import { Pill, Droplet, FlaskConical, Check, ShoppingCart } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { UnifiedSupplementItem } from '@/hooks/biostack/useTodaysSupplements';

interface TimelineSupplementCardProps {
  item: UnifiedSupplementItem;
  isLowStock: boolean;
  onToggle: () => void;
  isToggling: boolean;
}

// Icon based on supplement form
function getFormIcon(form?: string) {
  switch (form?.toLowerCase()) {
    case 'capsule':
    case 'softgel':
      return Droplet;
    case 'powder':
    case 'liquid':
      return FlaskConical;
    default:
      return Pill;
  }
}

export function TimelineSupplementCard({ 
  item, 
  isLowStock, 
  onToggle, 
  isToggling 
}: TimelineSupplementCardProps) {
  const FormIcon = getFormIcon(item.form);
  const isTaken = item.takenToday;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "relative flex items-center gap-3 p-3 rounded-xl border transition-all",
        isTaken 
          ? "bg-green-500/10 border-green-500/30" 
          : "bg-card/50 border-border/50",
        isToggling && "opacity-50 pointer-events-none"
      )}
      onClick={onToggle}
    >
      {/* Low stock indicator */}
      {isLowStock && !isTaken && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
          <ShoppingCart className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Form icon */}
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center",
        isTaken 
          ? "bg-green-500/20" 
          : "bg-muted/50"
      )}>
        <FormIcon className={cn(
          "w-5 h-5",
          isTaken ? "text-green-500" : "text-muted-foreground"
        )} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium truncate",
          isTaken && "text-green-500"
        )}>
          {item.name}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {item.dosage}
          {item.brand && ` • ${item.brand}`}
        </p>
      </div>

      {/* Checkbox */}
      <div className="flex-shrink-0">
        {isTaken ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
          >
            <Check className="w-4 h-4 text-white" />
          </motion.div>
        ) : (
          <Checkbox 
            checked={false}
            className="w-6 h-6 rounded-full border-2"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          />
        )}
      </div>
    </motion.div>
  );
}

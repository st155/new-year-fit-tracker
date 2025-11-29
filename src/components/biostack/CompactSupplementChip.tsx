import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, Pill } from "lucide-react";
import { UnifiedSupplementItem } from "@/hooks/biostack/useTodaysSupplements";
import { cn } from "@/lib/utils";

interface CompactSupplementChipProps {
  item: UnifiedSupplementItem;
  isSelected: boolean;
  onToggle: () => void;
}

export function CompactSupplementChip({ item, isSelected, onToggle }: CompactSupplementChipProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "relative flex items-center gap-2 p-3 rounded-lg border transition-all cursor-pointer group",
              item.takenToday
                ? "bg-green-500/5 border-green-500/20 opacity-60"
                : "bg-neutral-900/50 border-border/50 hover:border-green-500/50 hover:bg-green-500/5 hover:shadow-[0_0_15px_rgba(34,197,94,0.15)]",
              isSelected && !item.takenToday && "border-green-500/50 bg-green-500/10"
            )}
            onClick={!item.takenToday ? onToggle : undefined}
          >
            {/* Photo or Icon */}
            <div className="flex-shrink-0">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-10 h-10 rounded-full object-cover border border-border/30"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <Pill className="w-5 h-5 text-green-500/70" />
                </div>
              )}
            </div>

            {/* Name and Dosage */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {item.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.dosage}
              </p>
            </div>

            {/* Status Indicator */}
            <div className="flex-shrink-0">
              {item.takenToday ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={onToggle}
                  onClick={(e) => e.stopPropagation()}
                  className="border-border data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                />
              )}
            </div>
          </div>
        </TooltipTrigger>
        
        <TooltipContent side="top" className="max-w-xs bg-neutral-900 border-border/50">
          <div className="space-y-2">
            <div>
              <p className="font-semibold text-foreground">{item.name}</p>
              {item.brand && (
                <p className="text-xs text-muted-foreground">{item.brand}</p>
              )}
            </div>
            
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Dosage:</span>
                <span className="text-foreground">{item.dosage}</span>
              </div>
              {item.form && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Form:</span>
                  <span className="text-foreground">{item.form}</span>
                </div>
              )}
              {item.protocolName && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Protocol:</span>
                  <span className="text-blue-400">📋 {item.protocolName}</span>
                </div>
              )}
              {item.source === 'manual' && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Source:</span>
                  <span className="text-foreground">🏷️ Manual</span>
                </div>
              )}
            </div>
            
            {item.takenToday && item.takenAt && (
              <div className="pt-2 border-t border-border/30">
                <p className="text-xs text-green-500">
                  ✅ Taken at {item.takenAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, Pill, Camera, TrendingUp, TrendingDown, Minus, Plus } from "lucide-react";
import { UnifiedSupplementItem } from "@/hooks/biostack/useTodaysSupplements";
import { cn } from "@/lib/utils";
import { useLinkedBiomarkers } from "@/hooks/biostack/useLinkedBiomarkers";
import { Link } from "react-router-dom";

interface CompactSupplementChipProps {
  item: UnifiedSupplementItem;
  isSelected: boolean;
  onToggle: () => void;
  onToggleIntake?: () => void;
  onIncrementIntake?: () => void;
  isToggling?: boolean;
  onAddPhoto?: (productId: string, productName: string) => void;
}

export function CompactSupplementChip({ item, isSelected, onToggle, onToggleIntake, onIncrementIntake, isToggling, onAddPhoto }: CompactSupplementChipProps) {
  const { data: linkedBiomarkers } = useLinkedBiomarkers(item.linkedBiomarkerIds);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable' | null) => {
    if (trend === 'up') return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-3 w-3 text-red-500" />;
    if (trend === 'stable') return <Minus className="h-3 w-3 text-blue-500" />;
    return null;
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "relative flex items-center gap-2 p-3 rounded-lg border transition-all cursor-pointer group",
              item.takenToday
                ? "bg-green-500/15 border-green-500/50 ring-1 ring-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.15)]"
                : "bg-neutral-900/50 border-border/50 hover:border-green-500/50 hover:bg-green-500/5 hover:shadow-[0_0_15px_rgba(34,197,94,0.15)]",
              isSelected && !item.takenToday && "border-green-500/50 bg-green-500/10"
            )}
            onClick={!item.takenToday ? onToggle : undefined}
          >
            {/* Photo or Icon */}
            <div className="flex-shrink-0 relative group/photo">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className={cn(
                    "w-10 h-10 rounded-full object-cover border",
                    item.takenToday ? "border-green-500/50" : "border-border/30"
                  )}
                />
              ) : (
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  item.takenToday 
                    ? "bg-green-500/20 border border-green-500/40" 
                    : "bg-green-500/10 border border-green-500/20"
                )}>
                  <Pill className={cn(
                    "w-5 h-5",
                    item.takenToday ? "text-green-500" : "text-green-500/70"
                  )} />
                </div>
              )}
              {/* Camera overlay on hover if no image and onAddPhoto is provided */}
              {!item.imageUrl && item.productId && onAddPhoto && !item.takenToday && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddPhoto(item.productId!, item.name);
                  }}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/photo:opacity-100 transition-opacity rounded-full"
                >
                  <Camera className="h-4 w-4 text-white" />
                </button>
              )}
              {/* Green checkmark overlay for taken items */}
              {item.takenToday && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-neutral-950">
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
              )}
            </div>

            {/* Name and Dosage */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={cn(
                  "text-sm font-medium truncate",
                  item.takenToday ? "text-green-500" : "text-foreground"
                )}>
                  {item.name}
                </p>
                {item.takenToday && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500/20 text-green-500 uppercase tracking-wider">
                    ✓
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {item.dosage}
              </p>
            </div>

            {/* Status Indicator */}
            <div className="flex-shrink-0 flex items-center gap-1">
              {item.takenToday ? (
                <>
                  {/* Intake count badge - red for visibility */}
                  {item.todayIntakeCount > 1 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500 text-white min-w-[24px] text-center shadow-sm">
                      ×{item.todayIntakeCount}
                    </span>
                  )}
                  
                  {/* Increment button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onIncrementIntake?.();
                    }}
                    disabled={isToggling}
                    className="p-1 rounded-full bg-blue-500/20 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                    title="Добавить ещё приём"
                  >
                    <Plus className="h-4 w-4 text-blue-400" />
                  </button>
                  
                  {/* Cancel button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleIntake?.();
                    }}
                    disabled={isToggling}
                    className="p-1 rounded-full bg-green-500/20 hover:bg-green-500/30 transition-colors disabled:opacity-50"
                    title="Отменить приём"
                  >
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </button>
                </>
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
                <span className="text-muted-foreground">Дозировка:</span>
                <span className="text-foreground">{item.dosage}</span>
              </div>
              {item.form && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Форма:</span>
                  <span className="text-foreground">{item.form}</span>
                </div>
              )}
              {item.protocolName && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Протокол:</span>
                  <span className="text-blue-400">📋 {item.protocolName}</span>
                </div>
              )}
              {item.source === 'manual' && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Источник:</span>
                  <span className="text-foreground">🏷️ Ручной ввод</span>
                </div>
              )}
            </div>
            
            {item.takenToday && item.takenAt && (
              <div className="pt-2 border-t border-border/30">
                <p className="text-xs text-green-500">
                  ✅ Принято {item.todayIntakeCount > 1 ? `${item.todayIntakeCount} раз(а)` : ''} в {item.takenAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {item.todayIntakeCount > 1 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Нажмите + чтобы добавить ещё
                  </p>
                )}
              </div>
            )}

            {/* Linked Biomarkers Section */}
            {linkedBiomarkers && linkedBiomarkers.length > 0 && (
              <div className="pt-2 border-t border-border/30 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Связанные биомаркеры:</p>
                <div className="space-y-1.5">
                  {linkedBiomarkers.map((biomarker) => (
                    <Link
                      key={biomarker.id}
                      to={`/biomarkers/${biomarker.id}`}
                      className="flex items-center justify-between gap-2 p-2 rounded bg-neutral-900/50 hover:bg-neutral-800/50 transition-colors group"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate group-hover:text-green-500 transition-colors">
                          {biomarker.display_name}
                        </p>
                        {biomarker.latest_value && (
                          <p className="text-xs text-muted-foreground">
                            {biomarker.latest_value.toFixed(2)} {biomarker.latest_unit}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {getTrendIcon(biomarker.trend)}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

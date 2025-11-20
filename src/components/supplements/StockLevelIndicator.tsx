import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface StockLevelIndicatorProps {
  current: number;
  original: number;
  threshold: number;
  className?: string;
}

export function StockLevelIndicator({ 
  current, 
  original, 
  threshold,
  className 
}: StockLevelIndicatorProps) {
  const percentage = (current / original) * 100;
  const isLow = current <= threshold;
  
  const getColor = () => {
    if (isLow) return "bg-destructive";
    if (percentage < 50) return "bg-warning";
    return "bg-success";
  };

  const getStatusText = () => {
    if (isLow) return "Low";
    if (percentage < 50) return "Medium";
    return "Good";
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          {current} / {original} servings
        </span>
        <span className={cn(
          "font-medium",
          isLow && "text-destructive",
          !isLow && percentage < 50 && "text-warning",
          !isLow && percentage >= 50 && "text-success"
        )}>
          {getStatusText()}
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div 
          className={cn("h-full transition-all", getColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

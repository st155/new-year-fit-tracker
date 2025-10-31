import { Activity, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface BalanceIndicatorProps {
  strain: number;
  recovery: number;
  className?: string;
}

export function BalanceIndicator({ strain, recovery, className }: BalanceIndicatorProps) {
  // Normalize values to 0-1 range
  const normalizedStrain = strain / 21;
  const normalizedRecovery = recovery / 100;
  
  // Calculate balance score (0-100)
  const balanceScore = Math.max(0, 100 - Math.abs(normalizedStrain - normalizedRecovery) * 100);
  
  // Determine color and label
  let colorClass = "";
  let bgClass = "";
  let label = "";
  
  if (balanceScore >= 90) {
    colorClass = "text-green-500";
    bgClass = "bg-green-500/10 border-green-500/20";
    label = "Excellent";
  } else if (balanceScore >= 70) {
    colorClass = "text-yellow-500";
    bgClass = "bg-yellow-500/10 border-yellow-500/20";
    label = "Good";
  } else if (balanceScore >= 50) {
    colorClass = "text-orange-500";
    bgClass = "bg-orange-500/10 border-orange-500/20";
    label = "Fair";
  } else {
    colorClass = "text-red-500";
    bgClass = "bg-red-500/10 border-red-500/20";
    label = "Imbalanced";
  }

  return (
    <div className={cn("flex items-center gap-2 p-2 rounded-lg border", bgClass, className)}>
      <div className="flex items-center gap-1 text-xs">
        <Activity className="h-3 w-3 text-blue-500" />
        <span className="font-medium">{strain.toFixed(1)}</span>
      </div>
      
      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all", colorClass.replace('text-', 'bg-'))}
          style={{ width: `${balanceScore}%` }}
        />
      </div>
      
      <div className="flex items-center gap-1 text-xs">
        <Heart className="h-3 w-3 text-pink-500" />
        <span className="font-medium">{recovery.toFixed(0)}%</span>
      </div>
      
      <span className={cn("text-xs font-medium", colorClass)}>{label}</span>
    </div>
  );
}

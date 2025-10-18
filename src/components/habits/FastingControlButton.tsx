import { Button } from "@/components/ui/button";
import { Play, Utensils, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface FastingControlButtonProps {
  status: {
    isFasting: boolean;
    isEating: boolean;
  };
  onStartFasting: () => void;
  onStartEating: () => void;
  isLoading?: boolean;
  className?: string;
}

export function FastingControlButton({
  status,
  onStartFasting,
  onStartEating,
  isLoading = false,
  className,
}: FastingControlButtonProps) {
  
  // Inactive state - Start Fasting
  if (!status.isFasting && !status.isEating) {
    return (
      <Button
        onClick={onStartFasting}
        disabled={isLoading}
        size="lg"
        className={cn(
          "w-full h-14 text-lg font-semibold",
          "bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500",
          "hover:from-green-600 hover:via-emerald-600 hover:to-teal-600",
          "shadow-lg shadow-green-500/30 hover:shadow-green-500/50",
          "transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
          "relative overflow-hidden group",
          className
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
        <Play className="h-5 w-5 mr-2 relative z-10" />
        <span className="relative z-10">Начать голод!</span>
      </Button>
    );
  }

  // Fasting active - Start Eating
  if (status.isFasting) {
    return (
      <Button
        onClick={onStartEating}
        disabled={isLoading}
        size="lg"
        className={cn(
          "w-full h-14 text-lg font-semibold",
          "bg-gradient-to-r from-orange-500 via-red-500 to-pink-500",
          "hover:from-orange-600 hover:via-red-600 hover:to-pink-600",
          "shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50",
          "transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
          "relative overflow-hidden group",
          className
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
        <Utensils className="h-5 w-5 mr-2 relative z-10" />
        <span className="relative z-10">Начать есть</span>
      </Button>
    );
  }

  // Eating window active - End Eating (Start Fasting)
  return (
    <Button
      onClick={onStartFasting}
      disabled={isLoading}
      size="lg"
      className={cn(
        "w-full h-14 text-lg font-semibold",
        "bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500",
        "hover:from-green-600 hover:via-emerald-600 hover:to-teal-600",
        "shadow-lg shadow-green-500/30 hover:shadow-green-500/50",
        "transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
        "relative overflow-hidden group",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
      <Square className="h-5 w-5 mr-2 relative z-10" />
      <span className="relative z-10">Закончить есть</span>
    </Button>
  );
}

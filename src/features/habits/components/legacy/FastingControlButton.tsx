import { Button } from "@/components/ui/button";
import { Play, Utensils, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface FastingControlButtonProps {
  status: {
    isFasting: boolean;
    isEating: boolean;
  };
  onStartFasting: () => void;
  onStartEating: () => void;
  onEndEating: () => void;
  isLoading?: boolean;
  className?: string;
}

export function FastingControlButton({
  status,
  onStartFasting,
  onStartEating,
  onEndEating,
  isLoading = false,
  className,
}: FastingControlButtonProps) {
  const { t } = useTranslation('habits');
  
  // Inactive state - Start Fasting
  if (!status.isFasting && !status.isEating) {
    return (
      <Button
        onClick={onStartFasting}
        disabled={isLoading}
        size="lg"
        className={cn(
          "w-full py-6 text-base font-semibold",
          "bg-gradient-to-r from-green-500 to-emerald-600",
          "hover:from-green-600 hover:to-emerald-700",
          "text-white shadow-lg shadow-green-500/30",
          "transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
          className
        )}
      >
        <Play className="h-5 w-5 mr-2" />
        {t('fastingControl.startFasting')}
      </Button>
    );
  }

  // Fasting active - Start Eating (Orange "Окно питания")
  if (status.isFasting) {
    return (
      <Button
        onClick={onStartEating}
        disabled={isLoading}
        size="lg"
        className={cn(
          "w-full py-6 text-base font-semibold",
          "bg-gradient-to-r from-orange-500 to-orange-600",
          "hover:from-orange-600 hover:to-red-600",
          "text-white shadow-lg shadow-orange-500/30",
          "transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
          className
        )}
      >
        <Utensils className="h-5 w-5 mr-2" />
        {t('fastingControl.eatingWindow')}
      </Button>
    );
  }

  // Eating window active - End Eating (Green "Закончить есть")
  return (
    <Button
      onClick={onEndEating}
      disabled={isLoading}
      size="lg"
      className={cn(
        "w-full py-6 text-base font-semibold",
        "bg-gradient-to-r from-green-500 to-teal-600",
        "hover:from-green-600 hover:to-teal-700",
        "text-white shadow-lg shadow-green-500/30",
        "transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
        className
      )}
    >
      <Square className="h-5 w-5 mr-2" />
      {t('fastingControl.endEating')}
    </Button>
  );
}

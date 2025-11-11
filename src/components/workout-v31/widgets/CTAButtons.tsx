import { Button } from "@/components/ui/button";
import { Play, SkipForward, Eye } from "lucide-react";

interface CTAButtonsProps {
  onStart: () => void;
  onSkip: () => void;
  onPreview: () => void;
  startLabel?: string;
  startDisabled?: boolean;
}

export function CTAButtons({ onStart, onSkip, onPreview, startLabel = "Начать тренировку", startDisabled = false }: CTAButtonsProps) {
  return (
    <div className="space-y-3">
      <Button 
        onClick={onStart}
        disabled={startDisabled}
        className="w-full bg-gradient-to-r from-green-400 to-cyan-500 hover:from-green-500 hover:to-cyan-600 text-neutral-950 font-semibold shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_25px_rgba(34,197,94,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        size="lg"
      >
        <Play className="w-4 h-4 mr-2" />
        {startLabel}
      </Button>
      
      <div className="grid grid-cols-2 gap-3">
        <Button 
          onClick={onSkip}
          variant="outline"
          className="border-neutral-700 hover:border-neutral-600"
        >
          <SkipForward className="w-4 h-4 mr-2" />
          Пропустить
        </Button>
        
        <Button 
          onClick={onPreview}
          variant="outline"
          className="border-neutral-700 hover:border-neutral-600"
        >
          <Eye className="w-4 h-4 mr-2" />
          Просмотр
        </Button>
      </div>
    </div>
  );
}

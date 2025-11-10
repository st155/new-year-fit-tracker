import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface LiveLoggerHeaderProps {
  exerciseName: string;
  currentSet: number;
  totalSets: number;
  onExit: () => void;
  progressPercent: number;
}

export default function LiveLoggerHeader({
  exerciseName,
  currentSet,
  totalSets,
  onExit,
  progressPercent
}: LiveLoggerHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Exit Button */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onExit}
          className="backdrop-blur-xl bg-white/5 hover:bg-white/10 border border-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Exit
        </Button>
        <div className="text-sm text-muted-foreground">
          Set {currentSet}/{totalSets}
        </div>
      </div>

      {/* Exercise Name */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          {exerciseName}
        </h1>
        <div className="flex items-center justify-center gap-3">
          <div className="w-16 h-16 rounded-full border-4 border-primary/30 flex items-center justify-center backdrop-blur-xl bg-white/5">
            <div className="text-2xl font-bold text-primary">
              {currentSet}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress value={progressPercent} className="h-2" />
        <p className="text-xs text-center text-muted-foreground">
          {Math.round(progressPercent)}% Complete
        </p>
      </div>
    </motion.div>
  );
}

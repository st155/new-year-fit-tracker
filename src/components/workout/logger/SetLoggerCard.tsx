import { motion } from 'framer-motion';
import { CheckCircle, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';

interface SetLoggerCardProps {
  setNumber: number;
  reps: number;
  onRepsChange: (reps: number) => void;
  rpe: number;
  onRPEChange: (rpe: number) => void;
  onComplete: () => void;
  targetReps: number;
}

export default function SetLoggerCard({
  setNumber,
  reps,
  onRepsChange,
  rpe,
  onRPEChange,
  onComplete,
  targetReps
}: SetLoggerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
      className="backdrop-blur-xl bg-gradient-to-br from-primary/10 to-success/10 border border-primary/30 rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3),0_0_30px_rgba(6,182,212,0.2)]"
    >
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Set {setNumber}
        </h3>
      </div>
      
      {/* Reps Input */}
      <div className="mb-6">
        <label className="text-sm text-muted-foreground mb-2 block">
          Reps Completed
        </label>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onRepsChange(Math.max(0, reps - 1))}
            className="backdrop-blur-xl bg-white/5 hover:bg-white/10 border-white/10 h-12 w-12"
          >
            <Minus className="w-5 h-5" />
          </Button>
          <Input
            type="number"
            value={reps}
            onChange={(e) => onRepsChange(parseInt(e.target.value) || 0)}
            className="text-center text-4xl font-bold h-16 backdrop-blur-xl bg-white/5 border-white/10"
            min={0}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => onRepsChange(reps + 1)}
            className="backdrop-blur-xl bg-white/5 hover:bg-white/10 border-white/10 h-12 w-12"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        {reps !== targetReps && (
          <p className="text-xs text-center text-muted-foreground mt-2">
            Target: {targetReps} reps
          </p>
        )}
      </div>
      
      {/* RPE Slider */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm text-muted-foreground">
            Rate of Perceived Exertion
          </label>
          <span className="text-2xl font-bold text-primary">{rpe}</span>
        </div>
        <Slider
          value={[rpe]}
          onValueChange={([value]) => onRPEChange(value)}
          min={1}
          max={10}
          step={1}
          className="mb-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Easy (1)</span>
          <span>Moderate (5)</span>
          <span>Max (10)</span>
        </div>
      </div>
      
      {/* Complete Button */}
      <Button
        onClick={onComplete}
        className="w-full h-14 text-base font-semibold bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 shadow-[0_0_30px_rgba(6,182,212,0.3)]"
      >
        <CheckCircle className="w-5 h-5 mr-2" />
        Complete Set
      </Button>
    </motion.div>
  );
}

import { motion } from 'framer-motion';
import { Target, Zap, Timer } from 'lucide-react';
import type { AdjustedExercise } from '@/hooks/useDailyWorkout';

interface ExerciseDetailsCardProps {
  exercise: AdjustedExercise;
}

export default function ExerciseDetailsCard({ exercise }: ExerciseDetailsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
    >
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Target</h3>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">
            {exercise.sets} × {exercise.reps}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Sets × Reps</div>
        </div>
        
        {exercise.weight && (
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {exercise.weight}kg
            </div>
            <div className="text-xs text-muted-foreground mt-1">Weight</div>
          </div>
        )}
        
        {(exercise.rir !== undefined || exercise.rpe !== undefined) && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Zap className="w-4 h-4 text-success" />
              <div className="text-2xl font-bold text-success">
                {exercise.rir !== undefined ? `${exercise.rir}` : `${exercise.rpe}`}
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {exercise.rir !== undefined ? 'RIR' : 'RPE'}
            </div>
          </div>
        )}
      </div>
      
      {exercise.rest_seconds && (
        <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-white/10">
          <Timer className="w-4 h-4 text-cyan-400" />
          <span className="text-sm text-muted-foreground">Rest:</span>
          <span className="text-sm font-semibold text-foreground">
            {Math.floor(exercise.rest_seconds / 60)}:{String(exercise.rest_seconds % 60).padStart(2, '0')}
          </span>
        </div>
      )}
      
      {exercise.adjustment_reason && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-cyan-400 italic">
            {exercise.adjustment_reason}
          </p>
        </div>
      )}
    </motion.div>
  );
}

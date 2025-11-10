import { motion } from 'framer-motion';
import { CheckCircle, Dumbbell } from 'lucide-react';

interface SetLog {
  set_number: number;
  actual_weight: number;
  actual_reps: number;
  actual_rpe?: number;
  actual_rir?: number;
  logged: boolean;
}

interface SetHistoryListProps {
  sets: SetLog[];
}

export default function SetHistoryList({ sets }: SetHistoryListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
    >
      <div className="flex items-center gap-2 mb-4">
        <Dumbbell className="w-5 h-5 text-success" />
        <h3 className="text-lg font-semibold text-foreground">Completed Sets</h3>
      </div>
      
      <div className="space-y-3">
        {sets.map((set, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex items-center justify-between p-4 rounded-2xl bg-success/5 border border-success/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-success" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">
                  Set {set.set_number}
                </div>
                <div className="text-xs text-muted-foreground">
                  {set.actual_weight}kg × {set.actual_reps} reps
                </div>
              </div>
            </div>
            {set.actual_rpe && (
              <div className="text-right">
                <div className="text-lg font-bold text-success">
                  {set.actual_rpe}
                </div>
                <div className="text-xs text-muted-foreground">RPE</div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

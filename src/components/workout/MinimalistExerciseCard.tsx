import { motion } from "framer-motion";
import { Info, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExerciseIcon from "./ExerciseIcon";
import { AdjustedExercise } from "@/hooks/useDailyWorkout";

interface MinimalistExerciseCardProps {
  exercise: AdjustedExercise;
  index: number;
  onInfoClick: () => void;
  onStartClick: () => void;
}

export default function MinimalistExerciseCard({
  exercise,
  index,
  onInfoClick,
  onStartClick
}: MinimalistExerciseCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onStartClick}
      className="
        backdrop-blur-xl bg-white/5
        border border-white/10
        rounded-2xl p-4
        flex items-center justify-between
        hover:bg-white/10 transition-all
        cursor-pointer
        shadow-lg
      "
    >
      <div className="flex items-center gap-4 flex-1">
        <ExerciseIcon name={exercise.name} />
        <div className="flex-1">
          <h3 className="text-base font-medium text-gray-200">{exercise.name}</h3>
          <p className="text-sm text-gray-400">
            {exercise.sets} × {exercise.reps}
            {exercise.weight && ` @ ${exercise.weight}kg`}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onInfoClick();
          }}
          className="rounded-full hover:bg-white/20 w-9 h-9"
        >
          <Info className="w-4 h-4 text-gray-400" />
        </Button>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>
    </motion.div>
  );
}

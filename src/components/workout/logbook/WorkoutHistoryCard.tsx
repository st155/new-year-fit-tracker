import { motion } from "framer-motion";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronRight, Clock, Flame, Dumbbell, Activity, Sparkles, PenTool, Watch } from "lucide-react";
import { WorkoutHistoryItem } from "@/hooks/useWorkoutHistory";
import { useNavigate } from "react-router-dom";

interface WorkoutHistoryCardProps {
  workout: WorkoutHistoryItem;
  index: number;
}

export default function WorkoutHistoryCard({ workout, index }: WorkoutHistoryCardProps) {
  const navigate = useNavigate();
  
  const getSourceIcon = () => {
    switch (workout.source) {
      case 'manual':
        return <PenTool className="w-4 h-4 text-purple-400" />;
      case 'whoop':
      case 'withings':
      case 'garmin':
      case 'ultrahuman':
        return <Watch className="w-4 h-4 text-pink-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative"
    >
      <div 
        className="
          p-6 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10
          hover:bg-white/10 hover:border-white/20 transition-all duration-300
          cursor-pointer
        "
        onClick={() => navigate(`/workouts/${workout.id}`)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-gray-400 mb-1">
              {format(workout.date, 'EEEE, d MMMM yyyy', { locale: ru })}
            </p>
            <h3 className="text-2xl font-bold text-gray-100">
              {workout.name}
            </h3>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-200 group-hover:translate-x-1 transition-all" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {/* Duration */}
          {workout.duration > 0 && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <div>
                <p className="text-sm text-gray-400">Время</p>
                <p className="text-sm font-semibold text-gray-200">{workout.duration} мин</p>
              </div>
            </div>
          )}

          {/* Calories */}
          {workout.calories > 0 && (
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <div>
                <p className="text-sm text-gray-400">Калории</p>
                <p className="text-sm font-semibold text-gray-200">{workout.calories} ккал</p>
              </div>
            </div>
          )}

          {/* Volume (for manual workouts) */}
          {workout.volume && (
            <div className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-purple-400" />
              <div>
                <p className="text-sm text-gray-400">Объем</p>
                <p className="text-sm font-semibold text-gray-200">{Math.round(workout.volume)} кг</p>
              </div>
            </div>
          )}

          {/* Distance (for tracker workouts) */}
          {workout.distance && (
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-400" />
              <div>
                <p className="text-sm text-gray-400">Дистанция</p>
                <p className="text-sm font-semibold text-gray-200">{workout.distance.toFixed(1)} км</p>
              </div>
            </div>
          )}

          {/* Sets & Exercises (for manual workouts) */}
          {workout.sets && workout.exercises && (
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <div>
                <p className="text-sm text-gray-400">Упражнений</p>
                <p className="text-sm font-semibold text-gray-200">
                  {workout.exercises} • {workout.sets} подходов
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Source Badge */}
        <div className="flex items-center gap-2 pt-3 border-t border-white/10">
          {getSourceIcon()}
          <span className="text-xs text-gray-400">{workout.sourceLabel}</span>
        </div>
      </div>
    </motion.div>
  );
}

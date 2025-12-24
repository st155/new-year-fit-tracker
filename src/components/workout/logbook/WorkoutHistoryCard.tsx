import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronRight, Clock, Flame, Dumbbell, Activity, Sparkles, PenTool, Watch, Share2, Repeat, Trash2, ChevronDown, Trophy } from "lucide-react";
import { WorkoutHistoryItem } from "@/hooks/useWorkoutHistory";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getWorkoutColors } from "@/lib/workout-colors";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useDeleteWorkout } from "@/hooks/useDeleteWorkout";
import DeleteWorkoutDialog from "./DeleteWorkoutDialog";

interface WorkoutHistoryCardProps {
  workout: WorkoutHistoryItem;
  index: number;
}

export default function WorkoutHistoryCard({ workout, index }: WorkoutHistoryCardProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const deleteWorkout = useDeleteWorkout();
  const colors = getWorkoutColors(workout.source);
  
  // Swipe gesture state
  const x = useMotionValue(0);
  const background = useTransform(
    x,
    [-100, 0, 100],
    ['linear-gradient(90deg, hsl(var(--destructive)) 0%, transparent 100%)', 'transparent', 'linear-gradient(90deg, transparent 0%, hsl(var(--success)) 100%)']
  );

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    
    if (info.offset.x > threshold) {
      // Swipe right - Repeat
      if ('vibrate' in navigator) navigator.vibrate(10);
      toast({
        title: "Тренировка повторена",
        description: `Начните тренировку "${workout.name}"`,
      });
      x.set(0);
    } else if (info.offset.x < -threshold) {
      // Swipe left - Delete
      if ('vibrate' in navigator) navigator.vibrate(15);
      setShowDeleteDialog(true);
      x.set(0);
    } else {
      x.set(0);
    }
  };
  
  // Check for achievements (mock data - можно расширить)
  const achievements = [];
  if (index === 0) achievements.push({ icon: '🔥', label: 'Последняя тренировка' });
  if (workout.exercises && Array.isArray(workout.exercises) && workout.exercises.length >= 8) {
    achievements.push({ icon: '🏆', label: 'Интенсивная' });
  }
  
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
    <div className="relative" style={{ touchAction: 'pan-y' }}>
      {/* Swipe Background */}
      <motion.div
        className="absolute inset-0 rounded-xl overflow-hidden"
        style={{ background }}
      />
      
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        whileHover={{ scale: 1.01 }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        className={cn(
          "glass-card p-6 rounded-xl border border-white/10 backdrop-blur-xl cursor-pointer hover:shadow-glow transition-all duration-300 relative",
          `border-l-4 ${colors.accent}`
        )}
      >
      {/* Achievement badges - показывать всегда, но только если achievements не пусты */}
      {achievements.length > 0 && !showActions && (
        <div className="absolute top-4 right-4 flex gap-2">
          {achievements.map((achievement, i) => (
            <Badge key={i} className={colors.badge}>
              {achievement.icon} {achievement.label}
            </Badge>
          ))}
        </div>
      )}

      {/* Quick actions - показывать на hover */}
      {showActions && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-4 right-4 flex gap-2"
        >
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); }}>
            <Share2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); }}>
            <Repeat className="w-4 h-4" />
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 w-8 p-0 text-destructive" 
            onClick={(e) => { 
              e.stopPropagation(); 
              setShowDeleteDialog(true);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </motion.div>
      )}

      <div onClick={() => navigate(`/workouts/${workout.id}`)}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getSourceIcon()}
              <h3 className="text-xl font-bold text-white">{workout.name}</h3>
            </div>
            <p className="text-sm text-gray-400">
              {format(new Date(workout.date), "EEEE, d MMMM yyyy", { locale: ru })}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {workout.duration && workout.duration > 0 && (
            <div className="flex items-center gap-2 text-gray-300">
              <Clock className="w-4 h-4 text-cyan-400" />
              <div>
                <p className="text-xs text-gray-400">Время</p>
                <p className="text-sm font-semibold">{workout.duration} мин</p>
              </div>
            </div>
          )}
          
          {workout.calories && workout.calories > 0 && (
            <div className="flex items-center gap-2 text-gray-300">
              <Flame className="w-4 h-4 text-orange-400" />
              <div>
                <p className="text-xs text-gray-400">Калории</p>
                <p className="text-sm font-semibold">{workout.calories} ккал</p>
              </div>
            </div>
          )}
          
          {workout.volume && (
            <div className="flex items-center gap-2 text-gray-300">
              <Dumbbell className="w-4 h-4 text-purple-400" />
              <div>
                <p className="text-xs text-gray-400">Объем</p>
                <p className="text-sm font-semibold">{Math.round(workout.volume)} кг</p>
              </div>
            </div>
          )}
          
          {workout.distance && (
            <div className="flex items-center gap-2 text-gray-300">
              <Activity className="w-4 h-4 text-green-400" />
              <div>
                <p className="text-xs text-gray-400">Дистанция</p>
                <p className="text-sm font-semibold">{workout.distance.toFixed(1)} км</p>
              </div>
            </div>
          )}
        </div>

        {/* Exercises - expandable */}
        {workout.exercises && typeof workout.exercises === 'number' && workout.exercises > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors w-full"
            >
              <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
              <span>{workout.exercises} упражнений {workout.sets && `• ${workout.sets} подходов`}</span>
            </button>
          </div>
        )}
      </div>
      </motion.div>
      
      <DeleteWorkoutDialog
        workout={workout}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => {
          deleteWorkout.mutate(workout, {
            onSuccess: () => setShowDeleteDialog(false)
          });
        }}
        isDeleting={deleteWorkout.isPending}
      />
    </div>
  );
}

import { 
  Dumbbell, 
  Activity, 
  Zap, 
  CircleDot, 
  MoveVertical, 
  Triangle,
  X,
  Weight
} from "lucide-react";

interface ExerciseIconProps {
  name?: string;
  className?: string;
}

export default function ExerciseIcon({ name = "", className = "" }: ExerciseIconProps) {
  const exerciseName = name.toLowerCase();
  
  let IconComponent = Weight; // Default
  let gradientClass = "from-cyan-400 to-green-400";
  
  if (exerciseName.includes('squat') || exerciseName.includes('leg') || exerciseName.includes('приседания') || exerciseName.includes('lunge')) {
    IconComponent = Dumbbell;
    gradientClass = "from-cyan-400 to-blue-400";
  } else if (exerciseName.includes('bench') || exerciseName.includes('press') || exerciseName.includes('жим')) {
    IconComponent = Activity;
    gradientClass = "from-green-400 to-emerald-400";
  } else if (exerciseName.includes('deadlift') || exerciseName.includes('rdl') || exerciseName.includes('тяга') || exerciseName.includes('romanian')) {
    IconComponent = Zap;
    gradientClass = "from-yellow-400 to-orange-400";
  } else if (exerciseName.includes('curl') || exerciseName.includes('bicep') || exerciseName.includes('бицепс') || exerciseName.includes('tricep')) {
    IconComponent = CircleDot;
    gradientClass = "from-pink-400 to-purple-400";
  } else if (exerciseName.includes('pull') || exerciseName.includes('row') || exerciseName.includes('подтягивания') || exerciseName.includes('lat')) {
    IconComponent = MoveVertical;
    gradientClass = "from-indigo-400 to-cyan-400";
  } else if (exerciseName.includes('shoulder') || exerciseName.includes('lateral') || exerciseName.includes('плечи') || exerciseName.includes('raise')) {
    IconComponent = Triangle;
    gradientClass = "from-red-400 to-pink-400";
  }
  
  return (
    <div className={`w-10 h-10 rounded-full backdrop-blur-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 ${className}`}>
      <IconComponent className={`w-5 h-5 bg-gradient-to-br ${gradientClass} bg-clip-text text-transparent`} style={{ filter: 'brightness(1.2)' }} />
    </div>
  );
}

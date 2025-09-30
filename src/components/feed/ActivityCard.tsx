import { Heart, MessageCircle, Activity, Dumbbell, Footprints, TrendingUp, Trophy, Zap, Timer, Wind, Target, Flame, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface ActivityCardProps {
  activity: {
    id: string;
    user_id: string;
    action_type: string;
    action_text: string;
    created_at: string;
    metadata?: any;
    profiles: {
      username: string;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
    like_count?: number;
    comment_count?: number;
    user_liked?: boolean;
  };
  onActivityUpdate: () => void;
  index: number;
}

// Colorful glowing borders cycling through the list
const borderColors = [
  { color: "#10B981", shadow: "rgba(16, 185, 129, 0.6)" }, // Green
  { color: "#FF6B2C", shadow: "rgba(255, 107, 44, 0.6)" }, // Orange
  { color: "#A855F7", shadow: "rgba(168, 85, 247, 0.6)" }, // Purple
  { color: "#EF4444", shadow: "rgba(239, 68, 68, 0.6)" }, // Red
  { color: "#10B981", shadow: "rgba(16, 185, 129, 0.6)" }, // Green (repeat)
];

export function ActivityCard({ activity, index }: ActivityCardProps) {
  const profiles = activity.profiles;
  const borderStyle = borderColors[index % borderColors.length];
  
  // Get activity icon and color based on action type or text
  const getActivityIconAndColor = () => {
    const actionText = activity.action_text?.toLowerCase() || '';
    const actionType = activity.action_type?.toLowerCase() || '';
    
    // Recovery/Восстановление - Electric Blue
    if (actionText.includes('recover') || actionText.includes('восстан') || actionType.includes('recovery')) {
      return { icon: Zap, color: '#3B82F6' }; // Bright Blue
    }
    
    // Workouts/Тренировки - Lime Green
    if (actionText.includes('тренир') || actionText.includes('workout') || actionText.includes('completed')) {
      return { icon: Dumbbell, color: '#84CC16' }; // Lime
    }
    
    // Sleep/Сон - Indigo
    if (actionText.includes('slept') || actionText.includes('спал')) {
      return { icon: Moon, color: '#6366F1' }; // Indigo
    }
    
    // Strain/Нагрузка - Orange
    if (actionText.includes('strain')) {
      return { icon: Flame, color: '#F97316' }; // Orange
    }
    
    // VO2 Max - Cyan
    if (actionText.includes('vo2') || actionText.includes('кардио') || actionText.includes('выносл')) {
      return { icon: Wind, color: '#06B6D4' }; // Cyan
    }
    
    // Steps/Шаги - Yellow
    if (actionText.includes('шаг') || actionText.includes('steps') || actionType.includes('steps')) {
      return { icon: Footprints, color: '#FBBF24' }; // Yellow
    }
    
    
    // Default - Electric Purple
    return { icon: Activity, color: '#8B5CF6' };
  };
  
  const { icon: ActivityIcon, color: iconColor } = getActivityIconAndColor();

  // Format activity text to be simple and readable
  const getFormattedActivityText = () => {
    const actionText = activity.action_text || '';
    
    // Recovery
    if (actionText.includes('recovered') || actionText.includes('восстановился')) {
      const match = actionText.match(/(\d+)%/);
      if (match) return `Recovery ${match[1]}%`;
    }
    
    // Workouts
    if (actionText.includes('завершил тренировку') || actionText.includes('completed a workout')) {
      const strainMatch = actionText.match(/Strain[:\s]+(\d+\.?\d*)/i);
      const caloriesMatch = actionText.match(/(\d+)\s*ккал|(\d+)\s*kcal/i);
      
      if (strainMatch) {
        return `Workout • Strain ${strainMatch[1]}`;
      } else if (caloriesMatch) {
        const calories = caloriesMatch[1] || caloriesMatch[2];
        return `Workout • ${calories} kcal`;
      }
      return 'Workout';
    }
    
    // Sleep
    if (actionText.includes('slept')) {
      const match = actionText.match(/(\d+:\d+)/);
      if (match) return `Sleep ${match[1]}`;
    }
    
    // Strain (standalone)
    if (actionText.includes('strain') && !actionText.includes('workout')) {
      const match = actionText.match(/(\d+\.?\d*)/);
      if (match) return `Strain ${match[1]}`;
    }
    
    // VO2 Max
    if (actionText.includes('VO2Max') || actionText.includes('vo2max')) {
      const match = actionText.match(/(\d+\.?\d*)/);
      if (match) return `VO2 Max ${match[1]}`;
    }
    
    // Steps
    if (actionText.includes('steps') || actionText.includes('шаг')) {
      const match = actionText.match(/(\d+[\d,]*)/);
      if (match) {
        const steps = match[1].replace(/,/g, '');
        return `Steps ${parseInt(steps).toLocaleString()}`;
      }
    }
    
    // Default - clean up
    return actionText
      .replace(/st_\d+\.\d+\s*/gi, '')
      .replace(/\[Whoop\]/gi, '')
      .trim();
  };

  const displayName = profiles?.full_name?.split(' ')[0] || profiles?.username || 'Пользователь';
  const likeCount = activity.like_count || 15;
  const commentCount = activity.comment_count || 3;
  
  // Format time
  const getRelativeTime = () => {
    try {
      return formatDistanceToNow(new Date(activity.created_at), { 
        addSuffix: true, 
        locale: ru 
      });
    } catch {
      return '';
    }
  };
  
  return (
    <div
      className="relative rounded-full px-4 py-2.5 transition-all duration-300 animate-fade-in border-[3px]"
      style={{
        background: "rgba(0, 0, 0, 0.3)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderColor: borderStyle.color,
        boxShadow: `0 0 20px ${borderStyle.shadow}`,
      }}
    >
      <div className="flex items-center gap-3">
        {/* Avatar with Icon */}
        <div
          className="h-10 w-10 shrink-0 rounded-full border-[3px] flex items-center justify-center"
          style={{
            borderColor: borderStyle.color,
            background: `linear-gradient(135deg, ${iconColor}22, ${iconColor}44)`,
          }}
        >
          <ActivityIcon className="h-5 w-5" style={{ color: iconColor }} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white leading-tight">
            {displayName}
          </h3>
          <p className="text-xs text-white/90 leading-snug">
            {getFormattedActivityText()}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {getRelativeTime()}
          </p>
        </div>

        {/* Likes & Comments */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1">
            <Heart className="h-4 w-4 fill-red-500 text-red-500" />
            <span className="text-xs font-medium text-white">{likeCount}</span>
          </div>
          {commentCount > 0 && (
            <div className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-medium text-white">{commentCount}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
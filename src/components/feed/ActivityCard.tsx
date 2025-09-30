import { Heart, MessageCircle, Activity, Moon, Dumbbell, Utensils, Footprints, TrendingUp, Trophy, Zap } from "lucide-react";
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
  
  // Get activity icon based on action type or text
  const getActivityIcon = () => {
    const actionText = activity.action_text?.toLowerCase() || '';
    const actionType = activity.action_type?.toLowerCase() || '';
    
    if (actionText.includes('сон') || actionText.includes('sleep') || actionType.includes('sleep')) {
      return Moon;
    }
    if (actionText.includes('бег') || actionText.includes('пробежал') || actionType.includes('run')) {
      return Activity;
    }
    if (actionText.includes('тренир') || actionText.includes('workout') || actionType.includes('workout')) {
      return Dumbbell;
    }
    if (actionText.includes('шаг') || actionText.includes('steps') || actionType.includes('steps')) {
      return Footprints;
    }
    if (actionText.includes('вес') || actionText.includes('weight') || actionType.includes('weight')) {
      return TrendingUp;
    }
    if (actionText.includes('цел') || actionText.includes('goal') || actionType.includes('goal')) {
      return Trophy;
    }
    if (actionText.includes('калор') || actionText.includes('nutrition') || actionType.includes('nutrition')) {
      return Utensils;
    }
    return Zap; // Default icon
  };
  
  const ActivityIcon = getActivityIcon();

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

  const displayName = profiles?.full_name?.split(' ')[0] || profiles?.username || 'Пользователь';
  const likeCount = activity.like_count || 15;
  const commentCount = activity.comment_count || 3;
  
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
          className="h-10 w-10 shrink-0 rounded-full border-[3px] flex items-center justify-center bg-[#252b3d]"
          style={{
            borderColor: borderStyle.color,
          }}
        >
          <ActivityIcon className="h-5 w-5 text-white" />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white leading-tight">
            {displayName}
          </h3>
          <p className="text-xs text-white/90 leading-snug">
            {activity.action_text}
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
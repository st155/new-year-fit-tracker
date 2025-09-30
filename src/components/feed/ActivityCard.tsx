import { Heart, MessageCircle } from "lucide-react";
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
  
  // Get user initials
  const getUserInitials = () => {
    if (profiles?.full_name) {
      const parts = profiles.full_name.split(' ');
      if (parts.length >= 2) {
        return parts[0].charAt(0) + parts[1].charAt(0);
      }
      return parts[0].substring(0, 2);
    }
    if (profiles?.username) {
      return profiles.username.substring(0, 2).toUpperCase();
    }
    return 'ST';
  };

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
      className="relative rounded-full px-6 py-4 transition-all duration-300 animate-fade-in border-[3px]"
      style={{
        background: "rgba(0, 0, 0, 0.3)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderColor: borderStyle.color,
        boxShadow: `0 0 20px ${borderStyle.shadow}`,
      }}
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <Avatar
          className="h-14 w-14 shrink-0 border-[3px]"
          style={{
            borderColor: borderStyle.color,
          }}
        >
          <AvatarImage src={profiles?.avatar_url || undefined} />
          <AvatarFallback className="text-base font-bold bg-[#252b3d] text-white">
            {getUserInitials()}
          </AvatarFallback>
        </Avatar>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-white leading-tight mb-1">
            {displayName}
          </h3>
          <p className="text-sm text-white/90 leading-snug mb-1">
            {activity.action_text}
          </p>
          <p className="text-xs text-gray-500">
            {getRelativeTime()}
          </p>
        </div>

        {/* Likes & Comments */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1">
            <Heart className="h-5 w-5 fill-red-500 text-red-500" />
            <span className="text-sm font-medium text-white">{likeCount}</span>
          </div>
          {commentCount > 0 && (
            <div className="flex items-center gap-1">
              <MessageCircle className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-white">{commentCount}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
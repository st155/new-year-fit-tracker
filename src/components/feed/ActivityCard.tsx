import { useState, useEffect } from "react";
import { Heart, MessageCircle, Activity, Dumbbell, Footprints, TrendingUp, Trophy, Zap, Timer, Wind, Target, Flame, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { CommentDialog } from "./CommentDialog";
import { useToast } from "@/hooks/use-toast";

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

export function ActivityCard({ activity, onActivityUpdate, index }: ActivityCardProps) {
  const profiles = activity.profiles;
  const borderStyle = borderColors[index % borderColors.length];
  const { toast } = useToast();
  
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    fetchLikesAndComments();
  }, [activity.id]);

  const fetchLikesAndComments = async () => {
    try {
      // Get like count
      const { count: likes } = await supabase
        .from('activity_likes')
        .select('*', { count: 'exact', head: true })
        .eq('activity_id', activity.id);

      setLikeCount(likes || 0);

      // Get comment count
      const { count: comments } = await supabase
        .from('activity_comments')
        .select('*', { count: 'exact', head: true })
        .eq('activity_id', activity.id);

      setCommentCount(comments || 0);

      // Check if user liked
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: liked } = await supabase
          .from('activity_likes')
          .select('id')
          .eq('activity_id', activity.id)
          .eq('user_id', user.id)
          .maybeSingle();

        setUserLiked(!!liked);
      }
    } catch (error) {
      console.error('Error fetching likes and comments:', error);
    }
  };

  const handleLike = async () => {
    try {
      setLoading(true);
      setIsAnimating(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Требуется авторизация",
          description: "Войдите в систему, чтобы ставить лайки",
          variant: "destructive",
        });
        setIsAnimating(false);
        return;
      }

      if (userLiked) {
        // Unlike
        const { error } = await supabase
          .from('activity_likes')
          .delete()
          .eq('activity_id', activity.id)
          .eq('user_id', user.id);

        if (error) throw error;

        setUserLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
      } else {
        // Like
        const { error } = await supabase
          .from('activity_likes')
          .insert({
            activity_id: activity.id,
            user_id: user.id,
          });

        if (error) throw error;

        setUserLiked(true);
        setLikeCount(prev => prev + 1);
      }

      onActivityUpdate();
      
      // Reset animation after it completes
      setTimeout(() => setIsAnimating(false), 300);
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось изменить статус лайка",
        variant: "destructive",
      });
      setIsAnimating(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentUpdate = () => {
    fetchLikesAndComments();
    onActivityUpdate();
  };
  
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
          <button
            onClick={handleLike}
            disabled={loading}
            className={cn(
              "flex items-center gap-1 transition-all hover:scale-110",
              isAnimating && "animate-scale-in"
            )}
          >
            <Heart 
              className={cn(
                "h-4 w-4 transition-all duration-300",
                userLiked ? "fill-red-500 text-red-500 scale-110" : "text-gray-400 scale-100",
                isAnimating && (userLiked ? "animate-[scale-in_0.3s_ease-out]" : "animate-[scale-out_0.3s_ease-out]")
              )} 
            />
            <span className="text-xs font-medium text-white">{likeCount}</span>
          </button>
          {commentCount > 0 || true && (
            <button
              onClick={() => setCommentDialogOpen(true)}
              className="flex items-center gap-1 transition-all hover:scale-110"
            >
              <MessageCircle className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-medium text-white">{commentCount}</span>
            </button>
          )}
        </div>
      </div>

      <CommentDialog
        activityId={activity.id}
        open={commentDialogOpen}
        onOpenChange={setCommentDialogOpen}
        onUpdate={handleCommentUpdate}
      />
    </div>
  );
}
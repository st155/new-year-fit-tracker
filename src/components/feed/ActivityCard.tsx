import { useState, useEffect } from "react";
import { Heart, MessageCircle, Activity, Dumbbell, Footprints, TrendingUp, Trophy, Zap, Timer, Wind, Target, Flame, Moon, CheckCircle, BookOpen, Cigarette } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { CommentDialog } from "./CommentDialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";
import { getWorkoutTypeName, getWorkoutIcon } from "@/lib/workout-types";
import { ActivityReactions } from "./ActivityReactions";
import { CelebrateButton } from "./CelebrateButton";

interface ActivityCardProps {
  activity: {
    id: string;
    user_id: string;
    action_type: string;
    action_text: string;
    created_at: string;
    metadata?: any;
    activity_subtype?: string;
    aggregated_data?: any;
    is_milestone?: boolean;
    milestone_type?: string;
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
  const { user } = useAuth();
  
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    fetchLikesAndComments();
  }, [activity.id, user?.id]);

  const fetchLikesAndComments = async () => {
    try {
      const { count: likes } = await supabase
        .from('activity_likes')
        .select('*', { count: 'exact', head: true })
        .eq('activity_id', activity.id);

      setLikeCount(likes || 0);

      const { count: comments } = await supabase
        .from('activity_comments')
        .select('*', { count: 'exact', head: true })
        .eq('activity_id', activity.id);

      setCommentCount(comments || 0);

      if (user) {
        const { data: liked } = await supabase
          .from('activity_likes')
          .select('id')
          .eq('activity_id', activity.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!loading) setUserLiked(!!liked);
      } else {
        if (!loading) setUserLiked(false);
      }
    } catch (error) {
      console.error('Error fetching likes and comments:', error);
    }
  };

  const handleLike = async () => {
    if (loading) return;
    
    try {
      if (!user) {
        toast({
          title: "Требуется авторизация",
          description: "Войдите в систему, чтобы ставить лайки",
          variant: "destructive",
        });
        return;
      }

      const previousLiked = userLiked;
      const previousCount = likeCount;
      
      setUserLiked(!previousLiked);
      setLikeCount(previousLiked ? likeCount - 1 : likeCount + 1);
      setIsAnimating(true);
      setLoading(true);

      if (previousLiked) {
        const { error } = await supabase
          .from('activity_likes')
          .delete()
          .eq('activity_id', activity.id)
          .eq('user_id', user.id);

        if (error) {
          setUserLiked(previousLiked);
          setLikeCount(previousCount);
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('activity_likes')
          .insert({
            activity_id: activity.id,
            user_id: user.id,
          });

        if (error) {
          setUserLiked(previousLiked);
          setLikeCount(previousCount);
          if (!error.message?.includes('duplicate key')) {
            throw error;
          }
        }
      }
      
      setTimeout(() => setIsAnimating(false), 250);
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
  
  // Get activity icon and color based on activity subtype or text
  const getActivityIconAndColor = () => {
    const subtype = activity.activity_subtype;
    const actionText = activity.action_text?.toLowerCase() || '';
    
    // Sleep & Recovery - consolidated view (with fallback for old records)
    if (subtype === 'sleep_recovery' || 
        actionText.includes('slept') || 
        actionText.includes('recover')) {
      return { icon: Moon, color: '#6366F1' }; // Indigo
    }
    
    // Steps
    if (subtype === 'daily_steps') {
      return { icon: Footprints, color: '#FBBF24' }; // Yellow
    }
    
    // Workout - with emoji based on type
    if (subtype === 'workout' || actionText.includes('workout') || actionText.includes('тренир')) {
      const workoutType = activity.metadata?.workout_type || activity.aggregated_data?.workout_type;
      const emoji = getWorkoutIcon(workoutType);
      return { icon: Dumbbell, color: '#84CC16', emoji }; // Lime
    }
    
    // Habits
    if (subtype?.includes('habit')) {
      if (actionText.includes('🚭') || actionText.includes('smoking')) {
        return { icon: Cigarette, color: '#EF4444' }; // Red
      }
      if (actionText.includes('📚') || actionText.includes('book')) {
        return { icon: BookOpen, color: '#8B5CF6' }; // Purple
      }
      return { icon: CheckCircle, color: '#10B981' }; // Green
    }
    
    // Recovery (standalone)
    if (actionText.includes('recover') || actionText.includes('восстан')) {
      return { icon: Zap, color: '#3B82F6' }; // Blue
    }
    
    // VO2 Max
    if (actionText.includes('vo2')) {
      return { icon: Wind, color: '#06B6D4' }; // Cyan
    }
    
    // Goal/Target
    if (actionText.includes('goal') || actionText.includes('цел')) {
      return { icon: Target, color: '#F59E0B' }; // Amber
    }
    
    // Default
    return { icon: Activity, color: '#8B5CF6' };
  };
  
  const { icon: ActivityIcon, color: iconColor } = getActivityIconAndColor();

  // Enhanced formatter for new activity types
  const getFormattedActivityText = () => {
    const aggregated = activity.aggregated_data || {};
    const subtype = activity.activity_subtype;
    const actionText = activity.action_text?.toLowerCase() || '';
    
    // Sleep & Recovery - consolidated display (with fallback)
    if (subtype === 'sleep_recovery' || 
        actionText.includes('slept') || 
        actionText.includes('recover')) {
      
      const sleepHours = aggregated.sleep_hours;
      const recovery = aggregated.recovery_percentage;
      
      let text = '';
      if (sleepHours) {
        const hours = Math.floor(sleepHours);
        const minutes = Math.round((sleepHours - hours) * 60);
        text = `Sleep ${hours}h ${minutes}m`;
      }
      
      if (recovery) {
        text += text ? `, ${Math.round(recovery)}% Recovery` : `${Math.round(recovery)}% Recovery`;
      }
      
      return text || activity.action_text;
    }
    
    // Steps - show with progress to 10k goal
    if (subtype === 'daily_steps') {
      const steps = aggregated.steps || 0;
      return `${steps.toLocaleString()} steps`;
    }
    
    // Workout - show type, duration, calories, HR
    if (subtype === 'workout') {
      const metadata = activity.metadata || {};
      const agg = aggregated;
      
      const workoutType = getWorkoutTypeName(metadata.workout_type || agg.workout_type);
      const duration = metadata.duration_minutes || agg.duration;
      const calories = metadata.calories_burned || agg.calories;
      const hrAvg = metadata.heart_rate_avg || agg.hr_avg;
      const distance = metadata.distance_km || agg.distance;
      
      let text = workoutType;
      if (duration) text += ` • ${Math.round(duration)} min`;
      if (calories) text += ` • ${Math.round(calories)} kcal`;
      if (hrAvg) text += ` • ${Math.round(hrAvg)} bpm`;
      if (distance) text += ` • ${distance.toFixed(1)} km`;
      
      return text;
    }
    
    // Habit completion
    if (subtype === 'habit_completion' || subtype === 'habit_measurement' || subtype === 'habit_start') {
      return activity.action_text.replace(/^[^]+completed:|updated:|started:/, '').trim();
    }
    
    // Default - clean up text
    return activity.action_text
      .replace(/st_\d+\.\d+\s*/gi, '')
      .replace(/\[Whoop\]/gi, '')
      .trim();
  };

  const displayName = profiles?.full_name?.split(' ')[0] || profiles?.username || 'Пользователь';
  
  const getFormattedDate = () => {
    try {
      const dateStr = activity.metadata?.measurement_date || activity.created_at;
      const date = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const measurementDate = new Date(date);
      measurementDate.setHours(0, 0, 0, 0);
      
      if (measurementDate.getTime() === today.getTime()) {
        return 'Today';
      }
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (measurementDate.getTime() === yesterday.getTime()) {
        return 'Yesterday';
      }
      
      return format(date, 'd MMM', { locale: ru });
    } catch {
      return '';
    }
  };
  
  // Render enhanced card with stats for certain types
  const renderEnhancedContent = () => {
    const subtype = activity.activity_subtype;
    const aggregated = activity.aggregated_data || {};
    const metadata = activity.metadata || {};
    
    // Steps with progress bar
    if (subtype === 'daily_steps') {
      const steps = aggregated.steps || 0;
      const progress = Math.min((steps / 10000) * 100, 100);
      
      return (
        <div className="mt-2 space-y-1">
          <Progress value={progress} className="h-1" />
          <div className="flex justify-between text-[10px] text-white/60">
            <span>Goal: 10,000</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
        </div>
      );
    }
    
    // Workout stats
    if (subtype === 'workout') {
      const duration = metadata.duration_minutes || aggregated.duration;
      const calories = metadata.calories_burned || aggregated.calories;
      const hrAvg = metadata.heart_rate_avg || aggregated.hr_avg;
      const hrMax = metadata.heart_rate_max || aggregated.hr_max;
      
      return (
        <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-white/80">
          {duration && (
            <div className="flex flex-col items-center p-1 bg-white/5 rounded">
              <Timer className="h-3 w-3 mb-0.5" />
              <span>{Math.round(duration)}m</span>
            </div>
          )}
          {calories && (
            <div className="flex flex-col items-center p-1 bg-white/5 rounded">
              <Flame className="h-3 w-3 mb-0.5" />
              <span>{Math.round(calories)}</span>
            </div>
          )}
          {hrAvg && (
            <div className="flex flex-col items-center p-1 bg-white/5 rounded">
              <Heart className="h-3 w-3 mb-0.5" />
              <span>{Math.round(hrAvg)}</span>
            </div>
          )}
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <div
      className={cn(
        "relative rounded-full px-4 py-2.5 transition-all duration-300 animate-fade-in border-[3px]",
        activity.is_milestone && "ring-2 ring-yellow-400/50"
      )}
      style={{
        background: "rgba(0, 0, 0, 0.3)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderColor: borderStyle.color,
        boxShadow: `0 0 20px ${borderStyle.shadow}`,
      }}
    >
      {activity.is_milestone && (
        <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded-full">
          🏆
        </div>
      )}
      
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 shrink-0 rounded-full border-[3px] flex items-center justify-center relative"
          style={{
            borderColor: borderStyle.color,
            background: `linear-gradient(135deg, ${iconColor}22, ${iconColor}44)`,
          }}
        >
          {/* Show workout emoji if available */}
          {activity.activity_subtype === 'workout' && getActivityIconAndColor().emoji && (
            <span className="absolute text-lg z-10">
              {getActivityIconAndColor().emoji}
            </span>
          )}
          {!getActivityIconAndColor().emoji && (
            <ActivityIcon className="h-5 w-5" style={{ color: iconColor }} />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white leading-tight">
            {displayName}
          </h3>
          <p className="text-xs text-white/90 leading-snug">
            {getFormattedActivityText()}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {getFormattedDate()}
          </p>
          {renderEnhancedContent()}
          
          {/* Activity Reactions */}
          <div className="mt-3 pt-3 border-t border-white/10">
            <ActivityReactions 
              activityId={activity.id} 
              userId={user?.id} 
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start pt-2">
          <button
            onClick={handleLike}
            disabled={loading}
            className={cn(
              "flex items-center gap-1 transition-all duration-300 hover:scale-110",
              isAnimating && "animate-scale-in"
            )}
          >
            <Heart 
              className={cn(
                "h-4 w-4 transition-all duration-300",
                userLiked ? "fill-red-500 text-red-500 scale-110" : "text-white/60 hover:text-white scale-100"
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
          <CelebrateButton 
            activityId={activity.id} 
            userId={user?.id} 
          />
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

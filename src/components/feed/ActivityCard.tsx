import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { MessageCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CommentDialog } from "./CommentDialog";
import { LikeButton } from "./LikeButton";
import { cn } from "@/lib/utils";

interface ActivityCardProps {
  activity: {
    id: string;
    user_id: string;
    action_type: string;
    action_text: string;
    created_at: string;
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
}

const getBorderColor = (actionType: string): string => {
  switch (actionType) {
    case 'workouts':
      return 'border-orange-500';
    case 'measurements':
      return 'border-green-500';
    case 'metric_values':
      return 'border-blue-500';
    default:
      return 'border-purple-500';
  }
};

export function ActivityCard({ activity, onActivityUpdate }: ActivityCardProps) {
  const [showComments, setShowComments] = useState(false);
  
  const displayName = activity.profiles?.full_name || activity.profiles?.username || 'Пользователь';
  const timeAgo = formatDistanceToNow(new Date(activity.created_at), {
    addSuffix: true,
    locale: ru,
  });

  return (
    <>
      <div className={cn(
        "relative rounded-2xl border-2 bg-card/50 backdrop-blur-sm p-4 transition-all duration-300 hover:scale-[1.01]",
        getBorderColor(activity.action_type)
      )}>
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 ring-2 ring-border shrink-0">
            <AvatarImage src={activity.profiles?.avatar_url || undefined} />
            <AvatarFallback className="bg-muted text-muted-foreground">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-2">
              @{activity.profiles?.username || 'user'}
            </p>
            
            <p className="text-sm font-semibold text-white mb-3 leading-relaxed whitespace-pre-line">
              {activity.action_text}
            </p>
            
            <div className="flex items-center justify-between">
              <LikeButton
                activityId={activity.id}
                initialLiked={activity.user_liked || false}
                initialCount={activity.like_count || 0}
                onUpdate={onActivityUpdate}
              />
              
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
            </div>
          </div>
        </div>
      </div>

      <CommentDialog
        activityId={activity.id}
        open={showComments}
        onOpenChange={setShowComments}
        onUpdate={onActivityUpdate}
      />
    </>
  );
}
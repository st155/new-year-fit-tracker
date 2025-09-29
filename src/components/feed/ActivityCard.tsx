import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { MessageCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FitnessCard } from "@/components/ui/fitness-card";
import { CommentDialog } from "./CommentDialog";
import { LikeButton } from "./LikeButton";

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

const getActionTypeVariant = (actionType: string): "default" | "gradient" | "success" => {
  switch (actionType) {
    case 'workouts':
      return 'gradient';
    case 'measurements':
    case 'metric_values':
      return 'success';
    default:
      return 'default';
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
      <FitnessCard variant={getActionTypeVariant(activity.action_type)} className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 ring-2 ring-background/10">
            <AvatarImage src={activity.profiles?.avatar_url || undefined} />
            <AvatarFallback className="bg-background/20">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <p className="font-semibold text-sm leading-tight">{displayName}</p>
                <p className="text-xs opacity-70">@{activity.profiles?.username || 'user'}</p>
              </div>
              <span className="text-xs opacity-70 whitespace-nowrap">{timeAgo}</span>
            </div>
            
            <p className="text-sm mb-3 leading-relaxed">{activity.action_text}</p>
            
            <div className="flex items-center gap-3">
              <LikeButton
                activityId={activity.id}
                initialLiked={activity.user_liked || false}
                initialCount={activity.like_count || 0}
                onUpdate={onActivityUpdate}
              />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(true)}
                className="h-7 px-2 hover:bg-background/20"
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                <span className="text-xs">{activity.comment_count || 0}</span>
              </Button>
            </div>
          </div>
        </div>
      </FitnessCard>

      <CommentDialog
        activityId={activity.id}
        open={showComments}
        onOpenChange={setShowComments}
        onUpdate={onActivityUpdate}
      />
    </>
  );
}
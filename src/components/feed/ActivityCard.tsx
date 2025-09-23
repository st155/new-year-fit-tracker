import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Heart, MessageCircle, User } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

const getActionTypeColor = (actionType: string) => {
  switch (actionType) {
    case 'workouts':
      return 'bg-gradient-primary text-primary-foreground';
    case 'measurements':
      return 'bg-gradient-success text-success-foreground';
    case 'body_composition':
      return 'bg-gradient-accent text-accent-foreground';
    case 'goals':
      return 'bg-gradient-secondary text-secondary-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getActionTypeLabel = (actionType: string) => {
  switch (actionType) {
    case 'workouts':
      return 'Тренировка';
    case 'measurements':
      return 'Измерение';
    case 'body_composition':
      return 'Состав тела';
    case 'goals':
      return 'Цель';
    default:
      return actionType;
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
      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={activity.profiles?.avatar_url || undefined} />
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{displayName}</p>
                <p className="text-sm text-muted-foreground">@{activity.profiles?.username || 'user'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getActionTypeColor(activity.action_type)}>
                {getActionTypeLabel(activity.action_type)}
              </Badge>
              <span className="text-sm text-muted-foreground">{timeAgo}</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <p className="text-lg mb-4">{activity.action_text}</p>
          
          <div className="flex items-center gap-4">
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
              className="text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {activity.comment_count || 0}
            </Button>
          </div>
        </CardContent>
      </Card>

      <CommentDialog
        activityId={activity.id}
        open={showComments}
        onOpenChange={setShowComments}
        onUpdate={onActivityUpdate}
      />
    </>
  );
}
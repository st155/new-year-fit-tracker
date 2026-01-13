import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";

interface ChallengePostProps {
  post: {
    id: string;
    user_id: string;
    content: string;
    photo_url?: string;
    created_at: string;
    profiles?: {
      username: string;
      avatar_url?: string;
    };
  };
  likes: number;
  isLiked: boolean;
  comments: Array<{
    id: string;
    user_id: string;
    comment_text: string;
    created_at: string;
    profiles?: {
      username: string;
      avatar_url?: string;
    };
  }>;
  onUpdate: () => void;
}

export const ChallengePost = ({ post, likes, isLiked, comments, onUpdate }: ChallengePostProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation('challenges');
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLike = async () => {
    if (!user) return;

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('challenge_post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('challenge_post_likes')
          .insert({
            post_id: post.id,
            user_id: user.id
          });

        if (error) throw error;
      }
      onUpdate();
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: t('post.error'),
        description: t('post.likeFailed'),
        variant: "destructive"
      });
    }
  };

  const handleComment = async () => {
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('challenge_post_comments')
        .insert({
          post_id: post.id,
          user_id: user.id,
          comment_text: newComment.trim()
        });

      if (error) throw error;

      setNewComment("");
      toast({
        title: t('post.success'),
        description: t('post.commentAdded')
      });
      onUpdate();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: t('post.error'),
        description: t('post.commentFailed'),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!user || user.id !== post.user_id) return;

    try {
      const { error } = await supabase
        .from('challenge_posts')
        .delete()
        .eq('id', post.id);

      if (error) throw error;

      toast({
        title: t('post.success'),
        description: t('post.postDeleted')
      });
      onUpdate();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: t('post.error'),
        description: t('post.postDeleteFailed'),
        variant: "destructive"
      });
    }
  };

  const handleDeleteComment = async (commentId: string, commentUserId: string) => {
    if (!user || user.id !== commentUserId) return;

    try {
      const { error } = await supabase
        .from('challenge_post_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      toast({
        title: t('post.success'),
        description: t('post.commentDeleted')
      });
      onUpdate();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: t('post.error'),
        description: t('post.commentDeleteFailed'),
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="bg-card border-border/50 hover:border-primary/30 transition-all">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={post.profiles?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {post.profiles?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">{post.profiles?.username}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: enUS })}
              </p>
            </div>
          </div>
          {user?.id === post.user_id && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDeletePost}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
        {post.photo_url && (
          <img
            src={post.photo_url}
            alt="Post"
            className="w-full rounded-lg object-cover max-h-96"
          />
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-4">
        <div className="flex items-center gap-4 w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={isLiked ? "text-red-500 hover:text-red-600" : ""}
          >
            <Heart className={`h-4 w-4 mr-2 ${isLiked ? "fill-current" : ""}`} />
            {likes}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {comments.length}
          </Button>
        </div>

        {showComments && (
          <div className="w-full space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.profiles?.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {comment.profiles?.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{comment.profiles?.username}</p>
                    {user?.id === comment.user_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteComment(comment.id, comment.user_id)}
                        className="h-6 w-6 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-foreground">{comment.comment_text}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: enUS })}
                  </p>
                </div>
              </div>
            ))}

            <div className="flex gap-2">
              <Textarea
                placeholder={t('post.writeComment')}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[60px]"
              />
              <Button
                onClick={handleComment}
                disabled={isSubmitting || !newComment.trim()}
                className="shrink-0"
              >
                {t('post.send')}
              </Button>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};
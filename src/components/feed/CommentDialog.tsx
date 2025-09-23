import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Send, User, MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Comment {
  id: string;
  comment_text: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface CommentDialogProps {
  activityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function CommentDialog({ activityId, open, onOpenChange, onUpdate }: CommentDialogProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activity_comments')
        .select(`
          id,
          comment_text,
          created_at,
          user_id,
          profiles!activity_comments_user_id_fkey (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('activity_id', activityId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить комментарии",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Требуется авторизация",
          description: "Войдите в систему, чтобы оставлять комментарии",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('activity_comments')
        .insert({
          activity_id: activityId,
          user_id: user.id,
          comment_text: newComment.trim(),
        });

      if (error) throw error;

      setNewComment("");
      await fetchComments();
      onUpdate();

      toast({
        title: "Комментарий добавлен",
        description: "Ваш комментарий успешно опубликован",
      });
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить комментарий",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchComments();
    }
  }, [open, activityId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Комментарии ({comments.length})
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-24 bg-muted rounded"></div>
                        <div className="h-4 w-full bg-muted rounded"></div>
                        <div className="h-3 w-16 bg-muted rounded"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Пока нет комментариев</p>
              <p className="text-sm text-muted-foreground">Будьте первым, кто оставит комментарий!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <Card key={comment.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.profiles.avatar_url || undefined} />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">
                            {comment.profiles.full_name || comment.profiles.username}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), {
                              addSuffix: true,
                              locale: ru,
                            })}
                          </span>
                        </div>
                        <p className="text-sm">{comment.comment_text}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t pt-4 mt-4">
          <div className="flex gap-3">
            <Textarea
              placeholder="Напишите комментарий..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSubmitComment();
                }
              }}
            />
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
              size="sm"
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Нажмите Ctrl+Enter для быстрой отправки
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
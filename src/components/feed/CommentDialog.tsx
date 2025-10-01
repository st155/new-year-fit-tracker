import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Send, User, MessageCircle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface Comment {
  id: string;
  comment_text: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
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
  const isMobile = useIsMobile();

  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activity_comments')
        .select(`
          id,
          comment_text,
          created_at,
          user_id
        `)
        .eq('activity_id', activityId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get user profiles separately
      const commentsWithProfiles = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, full_name, avatar_url')
            .eq('user_id', comment.user_id)
            .single();

          return {
            ...comment,
            profiles: profile
          };
        })
      );

      setComments(commentsWithProfiles);
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

  const commentsContent = (
    <>
      <ScrollArea className="flex-1 min-h-0 pr-3 -mr-3">
        {loading ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                <div className="h-6 w-6 rounded-full bg-muted"></div>
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-16 bg-muted rounded"></div>
                  <div className="h-2.5 w-full bg-muted rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-6">
            <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-xs text-muted-foreground">Пока нет комментариев</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Будьте первым!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                  <AvatarFallback>
                    <User className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-medium text-[11px] truncate">
                      {comment.profiles?.full_name || comment.profiles?.username || 'Пользователь'}
                    </span>
                    <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                        locale: ru,
                      })}
                    </span>
                  </div>
                  <p className="text-xs break-words">{comment.comment_text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="sticky bottom-0 z-10 border-t border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-3 mt-2 -mx-4 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <div className="flex gap-2 items-end">
          <Textarea
            placeholder="Напишите комментарий..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[60px] max-h-[120px] resize-none text-sm flex-1 bg-muted/30"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitComment();
              }
            }}
          />
          <Button
            onClick={handleSubmitComment}
            disabled={!newComment.trim() || submitting}
            size="default"
            className="h-[60px] w-[60px] shrink-0 bg-primary hover:bg-primary/90"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 px-1">
          Enter для отправки • Shift+Enter для новой строки
        </p>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[80dvh] px-4 pb-0">
          <DrawerHeader className="pb-3 pt-4 px-0">
            <div className="flex items-center justify-between">
              <DrawerTitle className="flex items-center gap-2 text-base">
                <MessageCircle className="h-4 w-4" />
                Комментарии ({comments.length})
              </DrawerTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DrawerHeader>
          <div className="flex flex-col h-full gap-3 overflow-hidden">
            {commentsContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[min(100vw-2rem,28rem)] h-[min(80dvh,600px)] flex flex-col p-4 overflow-hidden">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-4 w-4" />
            Комментарии ({comments.length})
          </DialogTitle>
        </DialogHeader>
        {commentsContent}
      </DialogContent>
    </Dialog>
  );
}
import { useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LikeButtonProps {
  activityId: string;
  initialLiked: boolean;
  initialCount: number;
  onUpdate: () => void;
}

export function LikeButton({ activityId, initialLiked, initialCount, onUpdate }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLike = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Требуется авторизация",
          description: "Войдите в систему, чтобы ставить лайки",
          variant: "destructive",
        });
        return;
      }

      if (liked) {
        // Unlike
        const { error } = await supabase
          .from('activity_likes')
          .delete()
          .eq('activity_id', activityId)
          .eq('user_id', user.id);

        if (error) throw error;

        setLiked(false);
        setCount(prev => prev - 1);
      } else {
        // Like
        const { error } = await supabase
          .from('activity_likes')
          .insert({
            activity_id: activityId,
            user_id: user.id,
          });

        if (error) throw error;

        setLiked(true);
        setCount(prev => prev + 1);
      }

      onUpdate();
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось изменить статус лайка",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLike}
      disabled={loading}
      className={`h-7 px-2 hover:bg-background/20 ${
        liked ? 'text-red-500 hover:text-red-600' : ''
      }`}
    >
      <Heart 
        className={`h-3.5 w-3.5 mr-1.5 ${liked ? 'fill-current' : ''}`} 
      />
      <span className="text-xs">{count}</span>
    </Button>
  );
}
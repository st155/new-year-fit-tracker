import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  activityId: string;
  initialLiked: boolean;
  initialCount: number;
  onUpdate: () => void;
}

export function LikeButton({ activityId, initialLiked, initialCount, onUpdate }: LikeButtonProps) {
  const { t } = useTranslation('common');
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
          title: t('errors.authRequired'),
          description: t('likes.loginToLike'),
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
        title: t('errors.generic'),
        description: t('likes.toggleError'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={loading}
      className={cn(
        "flex items-center gap-1.5 transition-colors",
        liked ? "text-orange-500" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Heart 
        className={cn("h-4 w-4", liked && "fill-current")}
      />
      <span className="text-xs font-medium">{count}</span>
    </button>
  );
}
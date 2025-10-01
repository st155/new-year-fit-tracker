import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ChallengePost } from "./ChallengePost";
import { CreatePostDialog } from "./CreatePostDialog";
import { Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageCircle } from "lucide-react";

interface ChallengeFeedProps {
  challengeId: string;
}

export const ChallengeFeed = ({ challengeId }: ChallengeFeedProps) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      // Загружаем посты с профилями пользователей
      const { data: postsData, error: postsError } = await supabase
        .from('challenge_posts')
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
        .eq('challenge_id', challengeId)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Загружаем лайки для всех постов
      const postIds = postsData?.map(p => p.id) || [];
      const { data: likesData } = await supabase
        .from('challenge_post_likes')
        .select('post_id, user_id')
        .in('post_id', postIds);

      // Загружаем комментарии для всех постов
      const { data: commentsData } = await supabase
        .from('challenge_post_comments')
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
        .in('post_id', postIds)
        .order('created_at', { ascending: true });

      // Группируем лайки и комментарии по постам
      const postsWithData = postsData?.map(post => {
        const postLikes = likesData?.filter(l => l.post_id === post.id) || [];
        const postComments = commentsData?.filter(c => c.post_id === post.id) || [];
        const isLiked = postLikes.some(l => l.user_id === user?.id);

        return {
          post,
          likes: postLikes.length,
          isLiked,
          comments: postComments
        };
      }) || [];

      setPosts(postsWithData);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [challengeId, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Стена челленджа</h2>
          <p className="text-muted-foreground">Делитесь прогрессом и мотивируйте друг друга</p>
        </div>
        <CreatePostDialog challengeId={challengeId} onPostCreated={fetchPosts} />
      </div>

      {posts.length === 0 ? (
        <EmptyState
          icon={<MessageCircle className="h-16 w-16" />}
          title="Пока нет постов"
          description="Станьте первым, кто поделится своим прогрессом! Создайте пост и мотивируйте других участников."
        />
      ) : (
        <div className="space-y-4">
          {posts.map(({ post, likes, isLiked, comments }) => (
            <ChallengePost
              key={post.id}
              post={post}
              likes={likes}
              isLiked={isLiked}
              comments={comments}
              onUpdate={fetchPosts}
            />
          ))}
        </div>
      )}
    </div>
  );
};
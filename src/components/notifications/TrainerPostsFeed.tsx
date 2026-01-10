import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Target, MessageSquare, AlertTriangle, Award, Calendar, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface TrainerPost {
  id: string;
  title: string;
  content: string;
  post_type: 'weekly_task' | 'daily_tip' | 'announcement' | 'motivation';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  trainer: {
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

export function TrainerPostsFeed() {
  const { t, i18n } = useTranslation('trainerDashboard');
  const { user } = useAuth();
  const [posts, setPosts] = useState<TrainerPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPosts();
      
      // Подписываемся на новые посты в реальном времени
      const channel = supabase
        .channel('trainer-posts')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'trainer_posts',
            filter: 'published=eq.true'
          },
          () => {
            loadPosts(); // Перезагружаем посты при появлении новых
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadPosts = async () => {
    if (!user) return;

    try {
      // Получаем опубликованные посты от тренеров, у которых пользователь является подопечным
      const { data, error } = await supabase
        .from('trainer_posts')
        .select(`
          id,
          title,
          content,
          post_type,
          priority,
          created_at,
          trainer_id,
          profiles!trainer_posts_trainer_id_fkey (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('published', true)
        .eq('target_audience', 'all')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const postsWithTrainer = (data || []).map((post: any) => ({
        id: post.id,
        title: post.title,
        content: post.content,
        post_type: post.post_type,
        priority: post.priority,
        created_at: post.created_at,
        trainer: post.profiles
      }));

      setPosts(postsWithTrainer);
    } catch (error: any) {
      console.error('Error loading trainer posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case 'weekly_task': return <Target className="h-4 w-4" />;
      case 'daily_tip': return <MessageSquare className="h-4 w-4" />;
      case 'announcement': return <AlertTriangle className="h-4 w-4" />;
      case 'motivation': return <Award className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getPostTypeLabel = (type: string) => {
    return t(`posts.types.${type}`, type);
  };

  const getPriorityLabel = (priority: string) => {
    return t(`posts.priorities.${priority}`, priority);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'normal': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('clientPosts.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <div className="h-10 w-10 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (posts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('clientPosts.title')}</CardTitle>
          <CardDescription>{t('clientPosts.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t('clientPosts.noMessages')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('clientPosts.title')}</CardTitle>
        <CardDescription>{t('clientPosts.latestTips')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="border rounded-lg p-4 space-y-3">
              {/* Заголовок поста */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getPostTypeIcon(post.post_type)}
                  <h3 className="font-medium">{post.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getPriorityColor(post.priority) as any}>
                    {getPriorityLabel(post.priority)}
                  </Badge>
                  <Badge variant="outline">
                    {getPostTypeLabel(post.post_type)}
                  </Badge>
                </div>
              </div>

              {/* Содержание */}
              <p className="text-muted-foreground whitespace-pre-wrap">{post.content}</p>

              {/* Информация о тренере и дате */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={post.trainer?.avatar_url} />
                    <AvatarFallback>
                      <User className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">
                    {post.trainer?.full_name || post.trainer?.username}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(post.created_at).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

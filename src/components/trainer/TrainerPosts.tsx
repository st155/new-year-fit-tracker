import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Eye, Send, Calendar, Target, MessageSquare, Award, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface TrainerPost {
  id: string;
  title: string;
  content: string;
  post_type: 'weekly_task' | 'daily_tip' | 'announcement' | 'motivation';
  target_audience: 'all' | 'specific_challenge' | 'specific_clients';
  challenge_id?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  published: boolean;
  scheduled_for?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

interface Challenge {
  id: string;
  title: string;
}

export function TrainerPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<TrainerPost[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<TrainerPost | null>(null);

  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    post_type: "daily_tip" as 'weekly_task' | 'daily_tip' | 'announcement' | 'motivation',
    target_audience: "all" as 'all' | 'specific_challenge' | 'specific_clients',
    challenge_id: "",
    priority: "normal" as 'low' | 'normal' | 'high' | 'urgent',
    published: false,
    scheduled_for: "",
    expires_at: ""
  });

  useEffect(() => {
    if (user) {
      loadPosts();
      loadChallenges();
    }
  }, [user]);

  const loadPosts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('trainer_posts')
        .select('*')
        .eq('trainer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data as TrainerPost[] || []);
    } catch (error: any) {
      console.error('Error loading posts:', error);
      toast.error('Ошибка загрузки постов');
    } finally {
      setLoading(false);
    }
  };

  const loadChallenges = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('id, title')
        .eq('created_by', user.id)
        .eq('is_active', true);

      if (error) throw error;
      setChallenges(data || []);
    } catch (error: any) {
      console.error('Error loading challenges:', error);
    }
  };

  const handleCreatePost = async () => {
    if (!user || !newPost.title.trim() || !newPost.content.trim()) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    try {
      const postData = {
        trainer_id: user.id,
        title: newPost.title,
        content: newPost.content,
        post_type: newPost.post_type,
        target_audience: newPost.target_audience,
        challenge_id: newPost.target_audience === 'specific_challenge' ? newPost.challenge_id || null : null,
        priority: newPost.priority,
        published: newPost.published,
        scheduled_for: newPost.scheduled_for ? new Date(newPost.scheduled_for).toISOString() : null,
        expires_at: newPost.expires_at ? new Date(newPost.expires_at).toISOString() : null
      };

      const { error } = await supabase
        .from('trainer_posts')
        .insert(postData);

      if (error) throw error;

      toast.success('Пост создан');
      setIsCreateDialogOpen(false);
      resetForm();
      loadPosts();
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast.error('Ошибка создания поста');
    }
  };

  const handleUpdatePost = async (post: TrainerPost) => {
    try {
      const { error } = await supabase
        .from('trainer_posts')
        .update({
          title: post.title,
          content: post.content,
          post_type: post.post_type,
          priority: post.priority,
          published: post.published
        })
        .eq('id', post.id);

      if (error) throw error;

      toast.success('Пост обновлён');
      setEditingPost(null);
      loadPosts();
    } catch (error: any) {
      console.error('Error updating post:', error);
      toast.error('Ошибка обновления поста');
    }
  };

  const togglePublished = async (postId: string, published: boolean) => {
    try {
      const { error } = await supabase
        .from('trainer_posts')
        .update({ published })
        .eq('id', postId);

      if (error) throw error;

      toast.success(published ? 'Пост опубликован' : 'Пост снят с публикации');
      loadPosts();
    } catch (error: any) {
      console.error('Error toggling post:', error);
      toast.error('Ошибка изменения статуса поста');
    }
  };

  const resetForm = () => {
    setNewPost({
      title: "",
      content: "",
      post_type: "daily_tip",
      target_audience: "all",
      challenge_id: "",
      priority: "normal",
      published: false,
      scheduled_for: "",
      expires_at: ""
    });
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
    switch (type) {
      case 'weekly_task': return 'Задание на неделю';
      case 'daily_tip': return 'Совет дня';
      case 'announcement': return 'Объявление';
      case 'motivation': return 'Мотивация';
      default: return type;
    }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Посты и объявления</h2>
          <p className="text-muted-foreground">Создавайте задания, советы и объявления для подопечных</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Создать пост
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Создать новый пост</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Заголовок *</Label>
                <Input
                  id="title"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  placeholder="Например: Задание на эту неделю"
                />
              </div>

              <div>
                <Label htmlFor="content">Содержание *</Label>
                <Textarea
                  id="content"
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  placeholder="Введите текст поста..."
                  className="min-h-32"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="post_type">Тип поста</Label>
                  <Select
                    value={newPost.post_type}
                    onValueChange={(value: any) => setNewPost({ ...newPost, post_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly_task">Задание на неделю</SelectItem>
                      <SelectItem value="daily_tip">Совет дня</SelectItem>
                      <SelectItem value="announcement">Объявление</SelectItem>
                      <SelectItem value="motivation">Мотивация</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Приоритет</Label>
                  <Select
                    value={newPost.priority}
                    onValueChange={(value: any) => setNewPost({ ...newPost, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Низкий</SelectItem>
                      <SelectItem value="normal">Обычный</SelectItem>
                      <SelectItem value="high">Высокий</SelectItem>
                      <SelectItem value="urgent">Срочный</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="target_audience">Аудитория</Label>
                <Select
                  value={newPost.target_audience}
                  onValueChange={(value: any) => setNewPost({ ...newPost, target_audience: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все подопечные</SelectItem>
                    <SelectItem value="specific_challenge">Участники челленджа</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newPost.target_audience === 'specific_challenge' && (
                <div>
                  <Label htmlFor="challenge_id">Челлендж</Label>
                  <Select
                    value={newPost.challenge_id}
                    onValueChange={(value) => setNewPost({ ...newPost, challenge_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите челлендж" />
                    </SelectTrigger>
                    <SelectContent>
                      {challenges.map((challenge) => (
                        <SelectItem key={challenge.id} value={challenge.id}>
                          {challenge.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="published"
                  checked={newPost.published}
                  onCheckedChange={(checked) => setNewPost({ ...newPost, published: checked })}
                />
                <Label htmlFor="published">Опубликовать сразу</Label>
              </div>

              <Button onClick={handleCreatePost} className="w-full">
                Создать пост
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Нет постов</h3>
            <p className="text-muted-foreground text-center">
              Создайте первый пост для ваших подопечных
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <Card key={post.id} className={post.published ? 'border-primary/20' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getPostTypeIcon(post.post_type)}
                      <CardTitle className="text-lg">{post.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getPriorityColor(post.priority) as any}>
                        {post.priority === 'urgent' ? 'Срочно' : 
                         post.priority === 'high' ? 'Высокий' :
                         post.priority === 'normal' ? 'Обычный' : 'Низкий'}
                      </Badge>
                      <Badge variant="outline">
                        {getPostTypeLabel(post.post_type)}
                      </Badge>
                      {post.published ? (
                        <Badge variant="default">
                          <Eye className="h-3 w-3 mr-1" />
                          Опубликован
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Черновик</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={post.published}
                      onCheckedChange={(checked) => togglePublished(post.id, checked)}
                    />
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setEditingPost(post)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{post.content}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {post.target_audience === 'all' ? 'Для всех' : 'Для участников челленджа'}
                  </span>
                  <span>
                    <Calendar className="h-3 w-3 inline mr-1" />
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Диалог редактирования */}
      {editingPost && (
        <Dialog open={!!editingPost} onOpenChange={() => setEditingPost(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Редактировать пост</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={editingPost.title}
                onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
              />
              <Textarea
                value={editingPost.content}
                onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                className="min-h-32"
              />
              <div className="flex gap-2">
                <Button onClick={() => handleUpdatePost(editingPost)}>
                  Сохранить
                </Button>
                <Button variant="outline" onClick={() => setEditingPost(null)}>
                  Отмена
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
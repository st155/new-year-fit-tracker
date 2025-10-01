-- Создаем таблицу для постов в челлендже
CREATE TABLE public.challenge_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.challenge_posts ENABLE ROW LEVEL SECURITY;

-- Политики для постов
CREATE POLICY "Участники челленджа могут просматривать посты"
ON public.challenge_posts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.challenge_participants
    WHERE challenge_id = challenge_posts.challenge_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Участники челленджа могут создавать посты"
ON public.challenge_posts
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.challenge_participants
    WHERE challenge_id = challenge_posts.challenge_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Пользователи могут редактировать свои посты"
ON public.challenge_posts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Пользователи могут удалять свои посты"
ON public.challenge_posts
FOR DELETE
USING (auth.uid() = user_id);

-- Создаем таблицу для комментариев к постам
CREATE TABLE public.challenge_post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.challenge_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.challenge_post_comments ENABLE ROW LEVEL SECURITY;

-- Политики для комментариев
CREATE POLICY "Участники челленджа могут просматривать комментарии"
ON public.challenge_post_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.challenge_posts cp
    JOIN public.challenge_participants part ON part.challenge_id = cp.challenge_id
    WHERE cp.id = challenge_post_comments.post_id
    AND part.user_id = auth.uid()
  )
);

CREATE POLICY "Участники могут комментировать посты"
ON public.challenge_post_comments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.challenge_posts cp
    JOIN public.challenge_participants part ON part.challenge_id = cp.challenge_id
    WHERE cp.id = challenge_post_comments.post_id
    AND part.user_id = auth.uid()
  )
);

CREATE POLICY "Пользователи могут редактировать свои комментарии"
ON public.challenge_post_comments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Пользователи могут удалять свои комментарии"
ON public.challenge_post_comments
FOR DELETE
USING (auth.uid() = user_id);

-- Создаем таблицу для лайков постов
CREATE TABLE public.challenge_post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.challenge_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Включаем RLS
ALTER TABLE public.challenge_post_likes ENABLE ROW LEVEL SECURITY;

-- Политики для лайков
CREATE POLICY "Участники могут просматривать лайки"
ON public.challenge_post_likes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.challenge_posts cp
    JOIN public.challenge_participants part ON part.challenge_id = cp.challenge_id
    WHERE cp.id = challenge_post_likes.post_id
    AND part.user_id = auth.uid()
  )
);

CREATE POLICY "Участники могут лайкать посты"
ON public.challenge_post_likes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.challenge_posts cp
    JOIN public.challenge_participants part ON part.challenge_id = cp.challenge_id
    WHERE cp.id = challenge_post_likes.post_id
    AND part.user_id = auth.uid()
  )
);

CREATE POLICY "Пользователи могут удалять свои лайки"
ON public.challenge_post_likes
FOR DELETE
USING (auth.uid() = user_id);

-- Триггеры для обновления updated_at
CREATE TRIGGER update_challenge_posts_updated_at
BEFORE UPDATE ON public.challenge_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_challenge_post_comments_updated_at
BEFORE UPDATE ON public.challenge_post_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Индексы для производительности
CREATE INDEX idx_challenge_posts_challenge_id ON public.challenge_posts(challenge_id);
CREATE INDEX idx_challenge_posts_user_id ON public.challenge_posts(user_id);
CREATE INDEX idx_challenge_posts_created_at ON public.challenge_posts(created_at DESC);
CREATE INDEX idx_challenge_post_comments_post_id ON public.challenge_post_comments(post_id);
CREATE INDEX idx_challenge_post_likes_post_id ON public.challenge_post_likes(post_id);
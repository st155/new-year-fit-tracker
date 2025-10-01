-- Таблица для очков участников челленджа
CREATE TABLE public.challenge_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  posts_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  likes_given INTEGER NOT NULL DEFAULT 0,
  likes_received INTEGER NOT NULL DEFAULT 0,
  measurements_count INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- Включаем RLS
ALTER TABLE public.challenge_points ENABLE ROW LEVEL SECURITY;

-- Политики для очков
CREATE POLICY "Участники могут просматривать очки"
ON public.challenge_points
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.challenge_participants
    WHERE challenge_id = challenge_points.challenge_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Система может обновлять очки"
ON public.challenge_points
FOR ALL
USING (true)
WITH CHECK (true);

-- Таблица для достижений в челлендже
CREATE TABLE public.challenge_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  icon TEXT,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Включаем RLS
ALTER TABLE public.challenge_achievements ENABLE ROW LEVEL SECURITY;

-- Политики для достижений
CREATE POLICY "Участники могут просматривать достижения"
ON public.challenge_achievements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.challenge_participants
    WHERE challenge_id = challenge_achievements.challenge_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Система может создавать достижения"
ON public.challenge_achievements
FOR INSERT
WITH CHECK (true);

-- Функция для обновления очков при создании поста
CREATE OR REPLACE FUNCTION update_challenge_points_on_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Добавляем очки за пост (10 очков)
  INSERT INTO public.challenge_points (challenge_id, user_id, points, posts_count, last_activity_date)
  VALUES (NEW.challenge_id, NEW.user_id, 10, 1, CURRENT_DATE)
  ON CONFLICT (challenge_id, user_id)
  DO UPDATE SET
    points = challenge_points.points + 10,
    posts_count = challenge_points.posts_count + 1,
    last_activity_date = CURRENT_DATE,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Функция для обновления очков при комментировании
CREATE OR REPLACE FUNCTION update_challenge_points_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge_id UUID;
BEGIN
  -- Получаем challenge_id из поста
  SELECT challenge_id INTO v_challenge_id
  FROM public.challenge_posts
  WHERE id = NEW.post_id;
  
  -- Добавляем очки за комментарий (5 очков)
  INSERT INTO public.challenge_points (challenge_id, user_id, points, comments_count, last_activity_date)
  VALUES (v_challenge_id, NEW.user_id, 5, 1, CURRENT_DATE)
  ON CONFLICT (challenge_id, user_id)
  DO UPDATE SET
    points = challenge_points.points + 5,
    comments_count = challenge_points.comments_count + 1,
    last_activity_date = CURRENT_DATE,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Функция для обновления очков при лайке
CREATE OR REPLACE FUNCTION update_challenge_points_on_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge_id UUID;
  v_post_author_id UUID;
BEGIN
  -- Получаем challenge_id и автора поста
  SELECT cp.challenge_id, cp.user_id
  INTO v_challenge_id, v_post_author_id
  FROM public.challenge_posts cp
  WHERE cp.id = NEW.post_id;
  
  -- Добавляем очки лайкнувшему (2 очка)
  INSERT INTO public.challenge_points (challenge_id, user_id, points, likes_given, last_activity_date)
  VALUES (v_challenge_id, NEW.user_id, 2, 1, CURRENT_DATE)
  ON CONFLICT (challenge_id, user_id)
  DO UPDATE SET
    points = challenge_points.points + 2,
    likes_given = challenge_points.likes_given + 1,
    last_activity_date = CURRENT_DATE,
    updated_at = now();
  
  -- Добавляем очки автору поста (3 очка)
  INSERT INTO public.challenge_points (challenge_id, user_id, points, likes_received, last_activity_date)
  VALUES (v_challenge_id, v_post_author_id, 3, 1, CURRENT_DATE)
  ON CONFLICT (challenge_id, user_id)
  DO UPDATE SET
    points = challenge_points.points + 3,
    likes_received = challenge_points.likes_received + 1,
    last_activity_date = CURRENT_DATE,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Триггеры
CREATE TRIGGER trigger_update_points_on_post
AFTER INSERT ON public.challenge_posts
FOR EACH ROW
EXECUTE FUNCTION update_challenge_points_on_post();

CREATE TRIGGER trigger_update_points_on_comment
AFTER INSERT ON public.challenge_post_comments
FOR EACH ROW
EXECUTE FUNCTION update_challenge_points_on_comment();

CREATE TRIGGER trigger_update_points_on_like
AFTER INSERT ON public.challenge_post_likes
FOR EACH ROW
EXECUTE FUNCTION update_challenge_points_on_like();

-- Триггер для updated_at
CREATE TRIGGER update_challenge_points_updated_at
BEFORE UPDATE ON public.challenge_points
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Индексы
CREATE INDEX idx_challenge_points_challenge_id ON public.challenge_points(challenge_id);
CREATE INDEX idx_challenge_points_user_id ON public.challenge_points(user_id);
CREATE INDEX idx_challenge_points_points ON public.challenge_points(points DESC);
CREATE INDEX idx_challenge_achievements_challenge_id ON public.challenge_achievements(challenge_id);
CREATE INDEX idx_challenge_achievements_user_id ON public.challenge_achievements(user_id);
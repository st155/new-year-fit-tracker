-- Создаем таблицу для постов тренера (задания на неделю, советы дня)
CREATE TABLE public.trainer_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  post_type TEXT NOT NULL CHECK (post_type IN ('weekly_task', 'daily_tip', 'announcement', 'motivation')),
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'specific_challenge', 'specific_clients')),
  challenge_id UUID NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  published BOOLEAN NOT NULL DEFAULT false,
  scheduled_for TIMESTAMP WITH TIME ZONE NULL,
  expires_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB NULL
);

-- Включаем RLS
ALTER TABLE public.trainer_posts ENABLE ROW LEVEL SECURITY;

-- Политики для trainer_posts
CREATE POLICY "Trainers can manage their posts" 
ON public.trainer_posts 
FOR ALL 
USING (auth.uid() = trainer_id);

CREATE POLICY "Users can view published posts" 
ON public.trainer_posts 
FOR SELECT 
USING (published = true AND (expires_at IS NULL OR expires_at > now()));

-- Создаем таблицу для email-рассылок
CREATE TABLE public.trainer_broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('all_clients', 'challenge_participants', 'specific_clients')),
  challenge_id UUID NULL,
  specific_clients UUID[] NULL,
  sent_at TIMESTAMP WITH TIME ZONE NULL,
  sent_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed'))
);

-- Включаем RLS
ALTER TABLE public.trainer_broadcasts ENABLE ROW LEVEL SECURITY;

-- Политики для trainer_broadcasts
CREATE POLICY "Trainers can manage their broadcasts" 
ON public.trainer_broadcasts 
FOR ALL 
USING (auth.uid() = trainer_id);

-- Создаем таблицу для уведомлений пользователей
CREATE TABLE public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('post', 'broadcast', 'achievement', 'reminder', 'system')),
  source_id UUID NULL, -- ID поста или рассылки
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Политики для user_notifications
CREATE POLICY "Users can view their notifications" 
ON public.user_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications" 
ON public.user_notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Trainers can create notifications for their clients" 
ON public.user_notifications 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trainer_clients 
    WHERE trainer_id = auth.uid() 
    AND client_id = user_id 
    AND active = true
  ) 
  OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Создаем функцию для обновления updated_at
CREATE OR REPLACE FUNCTION public.update_trainer_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для автоматического обновления updated_at
CREATE TRIGGER update_trainer_posts_updated_at
  BEFORE UPDATE ON public.trainer_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_trainer_posts_updated_at();

-- Создаем функцию для создания уведомлений при публикации поста
CREATE OR REPLACE FUNCTION public.create_post_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Создаем уведомления только при публикации поста
  IF NEW.published = true AND (OLD.published = false OR OLD IS NULL) THEN
    -- Если пост для всех
    IF NEW.target_audience = 'all' THEN
      INSERT INTO public.user_notifications (user_id, title, message, type, source_id)
      SELECT 
        tc.client_id,
        NEW.title,
        CASE 
          WHEN NEW.post_type = 'weekly_task' THEN 'Новое задание на неделю'
          WHEN NEW.post_type = 'daily_tip' THEN 'Совет дня от тренера'
          WHEN NEW.post_type = 'announcement' THEN 'Объявление от тренера'
          ELSE 'Новое сообщение от тренера'
        END,
        'post',
        NEW.id
      FROM public.trainer_clients tc
      WHERE tc.trainer_id = NEW.trainer_id AND tc.active = true;
    
    -- Если пост для конкретного челленджа
    ELSIF NEW.target_audience = 'specific_challenge' AND NEW.challenge_id IS NOT NULL THEN
      INSERT INTO public.user_notifications (user_id, title, message, type, source_id)
      SELECT 
        cp.user_id,
        NEW.title,
        CASE 
          WHEN NEW.post_type = 'weekly_task' THEN 'Новое задание на неделю'
          WHEN NEW.post_type = 'daily_tip' THEN 'Совет дня от тренера'
          WHEN NEW.post_type = 'announcement' THEN 'Объявление от тренера'
          ELSE 'Новое сообщение от тренера'
        END,
        'post',
        NEW.id
      FROM public.challenge_participants cp
      WHERE cp.challenge_id = NEW.challenge_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем триггер для автоматического создания уведомлений
CREATE TRIGGER create_post_notifications_trigger
  AFTER INSERT OR UPDATE ON public.trainer_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_post_notifications();
-- Исправляем функции, добавляя безопасный search_path
CREATE OR REPLACE FUNCTION public.update_trainer_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
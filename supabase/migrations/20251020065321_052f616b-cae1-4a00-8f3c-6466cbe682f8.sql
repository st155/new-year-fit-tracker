-- Phase 2: Enhanced notification system and AI categories (fixed v2)

-- 1. Add category to ai_conversations
ALTER TABLE public.ai_conversations 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general' CHECK (category IN ('planning', 'client_analysis', 'tasks', 'general'));

-- 2. Create function to notify trainer about client measurement
CREATE OR REPLACE FUNCTION public.notify_trainer_on_measurement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trainer_record RECORD;
  goal_name TEXT;
BEGIN
  -- Get goal name
  SELECT g.goal_name INTO goal_name
  FROM public.goals g
  WHERE g.id = NEW.goal_id;
  
  -- Notify all trainers of this client
  FOR trainer_record IN 
    SELECT trainer_id FROM public.trainer_clients 
    WHERE client_id = NEW.user_id AND active = true
  LOOP
    INSERT INTO public.user_notifications (user_id, title, message, type, source_id)
    VALUES (
      trainer_record.trainer_id,
      'New measurement recorded',
      'Client recorded: ' || COALESCE(goal_name, 'measurement') || ' = ' || NEW.value || ' ' || NEW.unit,
      'client_measurement',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- 3. Create trigger for measurements
DROP TRIGGER IF EXISTS trigger_notify_trainer_on_measurement ON public.measurements;
CREATE TRIGGER trigger_notify_trainer_on_measurement
AFTER INSERT ON public.measurements
FOR EACH ROW
EXECUTE FUNCTION public.notify_trainer_on_measurement();

-- 4. Create function to notify trainer when task is completed
CREATE OR REPLACE FUNCTION public.notify_trainer_on_task_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify when status changes to completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO public.user_notifications (user_id, title, message, type, source_id)
    VALUES (
      NEW.trainer_id,
      'Task completed',
      'Client completed task: ' || NEW.title,
      'task_completed',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Create trigger for task completion
DROP TRIGGER IF EXISTS trigger_notify_trainer_on_task_completion ON public.client_tasks;
CREATE TRIGGER trigger_notify_trainer_on_task_completion
AFTER UPDATE ON public.client_tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_trainer_on_task_completion();

-- 6. Add indexes for better notification queries
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read ON public.user_notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON public.user_notifications(type);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_category ON public.ai_conversations(category);

-- 7. Create storage bucket for AI chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-chat-attachments', 'ai-chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 8. RLS policies for ai-chat-attachments bucket
CREATE POLICY "Trainers can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ai-chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Trainers can view their attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ai-chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Trainers can delete their attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ai-chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
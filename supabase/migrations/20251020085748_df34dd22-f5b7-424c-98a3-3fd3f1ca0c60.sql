-- Fix user_notifications type constraint to include 'client_measurement'
ALTER TABLE public.user_notifications DROP CONSTRAINT IF EXISTS user_notifications_type_check;

ALTER TABLE public.user_notifications
ADD CONSTRAINT user_notifications_type_check 
CHECK (type = ANY (ARRAY['post'::text, 'broadcast'::text, 'achievement'::text, 'reminder'::text, 'system'::text, 'client_measurement'::text, 'task_completed'::text]));
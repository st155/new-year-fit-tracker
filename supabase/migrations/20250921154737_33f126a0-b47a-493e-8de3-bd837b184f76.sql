-- Fix function search path security warnings
ALTER FUNCTION public.update_updated_at_column() SET search_path = 'public';
ALTER FUNCTION public.handle_new_user() SET search_path = 'public';
ALTER FUNCTION public.create_or_get_metric(uuid, text, text, text, text) SET search_path = 'public';

-- Enable leaked password protection
UPDATE auth.config 
SET leaked_password_protection = true 
WHERE parameter = 'leaked_password_protection';
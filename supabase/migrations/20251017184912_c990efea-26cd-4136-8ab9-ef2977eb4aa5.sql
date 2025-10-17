-- Create function to sync trainer_role changes to user_roles table
CREATE OR REPLACE FUNCTION public.sync_trainer_role_to_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If trainer_role is set to true, add trainer role
  IF NEW.trainer_role = true THEN
    INSERT INTO public.user_roles (user_id, role, assigned_by)
    VALUES (NEW.user_id, 'trainer', NEW.user_id)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- If trainer_role is set to false, remove trainer role
    DELETE FROM public.user_roles 
    WHERE user_id = NEW.user_id AND role = 'trainer';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically sync trainer_role changes
CREATE TRIGGER trigger_sync_trainer_role
AFTER UPDATE OF trainer_role ON public.profiles
FOR EACH ROW
WHEN (OLD.trainer_role IS DISTINCT FROM NEW.trainer_role)
EXECUTE FUNCTION public.sync_trainer_role_to_user_roles();

-- Sync existing trainer_role values to user_roles
INSERT INTO public.user_roles (user_id, role, assigned_by)
SELECT user_id, 'trainer'::app_role, user_id
FROM public.profiles
WHERE trainer_role = true
ON CONFLICT (user_id, role) DO NOTHING;
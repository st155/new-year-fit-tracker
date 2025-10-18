-- Update trigger to remove trainer role from user_roles when trainer_role is set to false
CREATE OR REPLACE FUNCTION public.sync_trainer_role_to_user_roles()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
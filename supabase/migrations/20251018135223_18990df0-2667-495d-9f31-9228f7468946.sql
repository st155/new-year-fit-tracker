-- Drop and recreate the function with correct search path
DROP TRIGGER IF EXISTS update_fasting_windows_updated_at ON public.fasting_windows;

DROP FUNCTION IF EXISTS public.update_fasting_windows_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_fasting_windows_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_fasting_windows_updated_at
  BEFORE UPDATE ON public.fasting_windows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fasting_windows_updated_at();
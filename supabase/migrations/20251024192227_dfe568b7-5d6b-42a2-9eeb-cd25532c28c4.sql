-- Исправление security warning для функции update_terra_tables_updated_at
CREATE OR REPLACE FUNCTION public.update_terra_tables_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
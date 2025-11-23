-- Fix security warning for update_medical_findings_updated_at function
-- Add search_path to prevent function search path mutable warning

CREATE OR REPLACE FUNCTION update_medical_findings_updated_at()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
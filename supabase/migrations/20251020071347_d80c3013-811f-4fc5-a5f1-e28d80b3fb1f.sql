-- Create secure view wrapper for trainer_client_summary
-- This view applies RLS-like filtering to the materialized view
CREATE OR REPLACE VIEW public.trainer_client_summary_secure AS
SELECT * FROM public.trainer_client_summary
WHERE trainer_id = auth.uid()
  OR client_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );

-- Grant access to the secure view
GRANT SELECT ON public.trainer_client_summary_secure TO authenticated;

-- Revoke direct access to the materialized view for non-service roles
REVOKE ALL ON public.trainer_client_summary FROM authenticated;
GRANT SELECT ON public.trainer_client_summary TO service_role;
-- Phase 1: Fix biomarker_ai_analysis (CRITICAL)
-- Drop the dangerous public policy
DROP POLICY IF EXISTS "System can manage AI analysis cache" ON public.biomarker_ai_analysis;

-- Create secure policies for biomarker_ai_analysis
CREATE POLICY "Users can insert their own AI analysis"
ON public.biomarker_ai_analysis
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI analysis"
ON public.biomarker_ai_analysis
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Trainers can view client AI analysis"
ON public.biomarker_ai_analysis
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trainer_clients
    WHERE trainer_id = auth.uid() 
    AND client_id = biomarker_ai_analysis.user_id 
    AND active = true
  )
);

-- Phase 2: Restrict reference data
-- Drop public access policies
DROP POLICY IF EXISTS "Anyone can view biomarker aliases" ON public.biomarker_aliases;
DROP POLICY IF EXISTS "Anyone can view biomarker master data" ON public.biomarker_master;

-- Create authenticated-only policies
CREATE POLICY "Authenticated users can view biomarker aliases"
ON public.biomarker_aliases
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view biomarker master data"
ON public.biomarker_master
FOR SELECT
TO authenticated
USING (true);

-- Phase 3: Secure system settings
-- Drop public access policy
DROP POLICY IF EXISTS "Everyone can read feature flags" ON public.feature_flags;

-- Create authenticated-only policy
CREATE POLICY "Authenticated users can read feature flags"
ON public.feature_flags
FOR SELECT
TO authenticated
USING (true);

-- Phase 4: Add comment about profiles (no changes yet)
COMMENT ON TABLE public.profiles IS 'Profile access controlled by can_view_profile function - consider restricting visible fields in future';
-- Create SECURITY DEFINER function to check if viewer can see target's profile
CREATE OR REPLACE FUNCTION public.can_view_profile(_viewer uuid, _target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- 1. Can always view own profile
    _viewer = _target
    OR
    -- 2. Can view if participants in same challenge
    EXISTS (
      SELECT 1
      FROM challenge_participants cp1
      INNER JOIN challenge_participants cp2 ON cp1.challenge_id = cp2.challenge_id
      WHERE cp1.user_id = _viewer
        AND cp2.user_id = _target
    )
    OR
    -- 3. Trainers can view their challenge participants
    EXISTS (
      SELECT 1
      FROM challenge_trainers ct
      INNER JOIN challenge_participants cp ON ct.challenge_id = cp.challenge_id
      WHERE ct.trainer_id = _viewer
        AND cp.user_id = _target
    )
    OR
    -- 4. Trainers can view their clients
    EXISTS (
      SELECT 1
      FROM trainer_clients tc
      WHERE tc.trainer_id = _viewer
        AND tc.client_id = _target
        AND tc.active = true
    )
$$;

-- Update profiles RLS policy to use the SECURITY DEFINER function
DROP POLICY IF EXISTS "Challenge participants can view each other" ON public.profiles;
DROP POLICY IF EXISTS "Trainers can view client profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view accessible profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.can_view_profile(auth.uid(), profiles.user_id));
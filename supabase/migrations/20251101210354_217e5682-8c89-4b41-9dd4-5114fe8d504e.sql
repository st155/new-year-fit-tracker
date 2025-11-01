-- Create SECURITY DEFINER function to check challenge participation without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_challenge_participant(
  _user_id uuid,
  _challenge_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.challenge_participants
    WHERE user_id = _user_id
      AND challenge_id = _challenge_id
  )
$$;

-- Ensure is_challenge_trainer is also SECURITY DEFINER to avoid any potential recursion
CREATE OR REPLACE FUNCTION public.is_challenge_trainer(
  _user_id uuid,
  _challenge_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.challenge_trainers
    WHERE trainer_id = _user_id
      AND challenge_id = _challenge_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.challenges
    WHERE id = _challenge_id
      AND created_by = _user_id
  )
$$;

-- Drop the old recursive policy
DROP POLICY IF EXISTS "Users can view participants of their challenges" ON public.challenge_participants;

-- Create new non-recursive policy using SECURITY DEFINER functions
CREATE POLICY "Users can view participants of their challenges"
ON public.challenge_participants
FOR SELECT
TO authenticated
USING (
  -- User is a participant in this challenge
  is_challenge_participant(auth.uid(), challenge_id)
  -- OR user is a trainer of this challenge
  OR is_challenge_trainer(auth.uid(), challenge_id)
  -- OR user created this challenge
  OR EXISTS (
    SELECT 1
    FROM challenges c
    WHERE c.id = challenge_participants.challenge_id
      AND c.created_by = auth.uid()
  )
);
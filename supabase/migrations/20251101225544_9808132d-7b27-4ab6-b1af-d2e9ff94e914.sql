-- Fix infinite recursion in challenge_participants RLS policy
-- Only recreate the problematic SELECT policy

DROP POLICY IF EXISTS "Users can view participants of their challenges" ON public.challenge_participants;
DROP POLICY IF EXISTS "Users can view participants v2" ON public.challenge_participants;

-- Create new SELECT policy without recursion
-- Uses security definer function to avoid circular reference
CREATE POLICY "Users can view participants v2" 
ON public.challenge_participants
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid()
  OR is_challenge_trainer(auth.uid(), challenge_id)
);
-- Fix infinite recursion in team_members RLS policy
-- The "Team members can view members" policy causes recursion

-- Drop the problematic policy if it exists
DROP POLICY IF EXISTS "Team members can view members" ON team_members;

-- Create a simpler policy that uses the existing is_team_member function
-- which is SECURITY DEFINER and avoids recursion
CREATE POLICY "Team members can view their team members" ON team_members
FOR SELECT USING (
  user_id = auth.uid() 
  OR public.is_team_member(auth.uid(), team_id)
);
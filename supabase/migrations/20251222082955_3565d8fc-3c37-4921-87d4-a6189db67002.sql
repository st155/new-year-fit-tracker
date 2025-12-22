-- Fix infinite recursion in team_members RLS policies
-- The function is_team_member queries team_members table, which triggers RLS, which calls is_team_member again

-- Step 1: Drop existing problematic policies
DROP POLICY IF EXISTS "Team members can update their own data" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view their own data" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view their team members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can manage members" ON public.team_members;

-- Step 2: Create new policies that don't use the is_team_member function (which causes recursion)

-- Users can view teams they belong to
CREATE POLICY "Users can view their team memberships" 
ON public.team_members 
FOR SELECT 
USING (user_id = auth.uid());

-- Users can view other members of teams they belong to (using subquery with SECURITY INVOKER)
CREATE POLICY "Users can view fellow team members" 
ON public.team_members 
FOR SELECT 
USING (
  team_id IN (
    SELECT tm.team_id 
    FROM public.team_members tm 
    WHERE tm.user_id = auth.uid()
  )
);

-- Users can update their own membership data
CREATE POLICY "Users can update own membership" 
ON public.team_members 
FOR UPDATE 
USING (user_id = auth.uid());

-- Team owners can manage all members (insert, update, delete)
CREATE POLICY "Team owners can insert members" 
ON public.team_members 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = team_members.team_id 
    AND tm.user_id = auth.uid() 
    AND tm.role = 'owner'
  )
);

CREATE POLICY "Team owners can delete members" 
ON public.team_members 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = team_members.team_id 
    AND tm.user_id = auth.uid() 
    AND tm.role = 'owner'
  )
);
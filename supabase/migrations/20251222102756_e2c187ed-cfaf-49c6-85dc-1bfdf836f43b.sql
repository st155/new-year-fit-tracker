-- Fix infinite recursion in team_members RLS policies
-- The subquery in "Users can view fellow team members" triggers RLS which causes infinite loop

-- Step 1: Drop the problematic policies
DROP POLICY IF EXISTS "Users can view fellow team members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can insert members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can delete members" ON public.team_members;

-- Step 2: Create a SECURITY DEFINER function to get user's team IDs
-- This function runs with owner permissions, bypassing RLS
CREATE OR REPLACE FUNCTION public.get_user_team_ids(user_uuid UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT team_id FROM public.team_members WHERE user_id = user_uuid
$$;

-- Step 3: Create a helper function to check if user is team owner
CREATE OR REPLACE FUNCTION public.is_team_owner(team_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = team_uuid AND user_id = user_uuid AND role = 'owner'
  )
$$;

-- Step 4: Recreate policies using SECURITY DEFINER functions (no recursion)
-- View fellow team members
CREATE POLICY "Users can view fellow team members" 
ON public.team_members 
FOR SELECT 
USING (
  team_id IN (SELECT public.get_user_team_ids(auth.uid()))
);

-- Team owners can insert members
CREATE POLICY "Team owners can insert members" 
ON public.team_members 
FOR INSERT 
WITH CHECK (
  public.is_team_owner(team_id, auth.uid())
);

-- Team owners can delete members
CREATE POLICY "Team owners can delete members" 
ON public.team_members 
FOR DELETE 
USING (
  public.is_team_owner(team_id, auth.uid())
);
-- Remove redundant RLS policy that may cause recursion
-- This policy is redundant because "Users can view their own roles" already handles access
DROP POLICY IF EXISTS "Trainers can view all roles" ON public.user_roles;
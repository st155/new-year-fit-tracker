-- Secure whoop_oauth_states with explicit deny-all policies (service role bypasses RLS)
ALTER TABLE public.whoop_oauth_states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whoop_oauth_states_select_none" ON public.whoop_oauth_states;
DROP POLICY IF EXISTS "whoop_oauth_states_insert_none" ON public.whoop_oauth_states;
DROP POLICY IF EXISTS "whoop_oauth_states_update_none" ON public.whoop_oauth_states;
DROP POLICY IF EXISTS "whoop_oauth_states_delete_none" ON public.whoop_oauth_states;
CREATE POLICY "whoop_oauth_states_select_none" ON public.whoop_oauth_states FOR SELECT USING (false);
CREATE POLICY "whoop_oauth_states_insert_none" ON public.whoop_oauth_states FOR INSERT WITH CHECK (false);
CREATE POLICY "whoop_oauth_states_update_none" ON public.whoop_oauth_states FOR UPDATE USING (false);
CREATE POLICY "whoop_oauth_states_delete_none" ON public.whoop_oauth_states FOR DELETE USING (false);

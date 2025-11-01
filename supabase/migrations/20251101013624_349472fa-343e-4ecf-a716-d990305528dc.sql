-- ========================================
-- PRIORITY 3: Add RLS Policies for terra_webhooks_raw
-- ========================================

-- Users can view their own webhook data
CREATE POLICY "users_view_own_terra_webhooks" ON public.terra_webhooks_raw
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all webhooks
CREATE POLICY "admins_view_all_terra_webhooks" ON public.terra_webhooks_raw
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can manage all (via Edge Functions)
-- No public INSERT/UPDATE policies needed

COMMENT ON TABLE public.terra_webhooks_raw IS 'RLS policies added: users see own data, admins see all';

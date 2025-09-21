-- Create mapping table to link OAuth state to user
CREATE TABLE IF NOT EXISTS public.whoop_oauth_states (
  state UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS (service role bypasses it; no policies needed for function)
ALTER TABLE public.whoop_oauth_states ENABLE ROW LEVEL SECURITY;

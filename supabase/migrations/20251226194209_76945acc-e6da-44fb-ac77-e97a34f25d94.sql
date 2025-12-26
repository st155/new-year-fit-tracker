-- Create separate table for Whoop OAuth states
-- This solves the issue where whoop_tokens requires access_token/whoop_user_id (NOT NULL)
-- but we need to store oauth_state BEFORE token exchange

CREATE TABLE public.whoop_oauth_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL,
  redirect_uri text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz NULL
);

-- Enable RLS (service role will bypass it, frontend doesn't need access)
ALTER TABLE public.whoop_oauth_states ENABLE ROW LEVEL SECURITY;

-- Create index for cleanup of old states
CREATE INDEX idx_whoop_oauth_states_created_at ON public.whoop_oauth_states(created_at);

-- Create index for user lookups
CREATE INDEX idx_whoop_oauth_states_user_id ON public.whoop_oauth_states(user_id);

-- Cleanup function to remove old states (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_whoop_oauth_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM whoop_oauth_states 
  WHERE created_at < now() - interval '1 hour';
END;
$$;
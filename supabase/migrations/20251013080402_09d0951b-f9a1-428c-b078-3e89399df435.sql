-- Create whoop_tokens table to store OAuth tokens securely
CREATE TABLE IF NOT EXISTS public.whoop_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  whoop_user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  scope TEXT,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT whoop_tokens_user_unique UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.whoop_tokens ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their whoop tokens"
ON public.whoop_tokens
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their whoop tokens"
ON public.whoop_tokens
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their whoop tokens"
ON public.whoop_tokens
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger to keep updated_at fresh
CREATE TRIGGER update_whoop_tokens_updated_at
BEFORE UPDATE ON public.whoop_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
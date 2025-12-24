-- Create table to track Terra connection attempts for debugging
CREATE TABLE IF NOT EXISTS public.terra_connection_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'initiated', -- 'initiated', 'widget_opened', 'callback_received', 'success', 'error'
  error_message TEXT,
  url_params JSONB,
  session_id TEXT,
  terra_user_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_terra_connection_attempts_user_provider 
ON public.terra_connection_attempts(user_id, provider, created_at DESC);

-- Enable RLS
ALTER TABLE public.terra_connection_attempts ENABLE ROW LEVEL SECURITY;

-- Users can see their own attempts
CREATE POLICY "Users can view their own connection attempts"
ON public.terra_connection_attempts FOR SELECT
USING (auth.uid() = user_id);

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role full access"
ON public.terra_connection_attempts FOR ALL
USING (true)
WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_terra_connection_attempts_updated_at
BEFORE UPDATE ON public.terra_connection_attempts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
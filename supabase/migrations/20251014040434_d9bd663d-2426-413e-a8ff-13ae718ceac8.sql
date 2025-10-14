-- Add client_id column to whoop_tokens table to store the OAuth client ID used for token creation
ALTER TABLE public.whoop_tokens 
ADD COLUMN IF NOT EXISTS client_id TEXT;

-- Update existing tokens with current client_id from environment (if needed in future)
COMMENT ON COLUMN public.whoop_tokens.client_id IS 'OAuth 2.0 Client ID used for this token - required for token refresh';
-- Add missing columns to whoop_tokens
ALTER TABLE whoop_tokens ADD COLUMN IF NOT EXISTS oauth_state TEXT;
ALTER TABLE whoop_tokens ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

-- Migrate existing data from last_sync_date to last_sync_at
UPDATE whoop_tokens 
SET last_sync_at = last_sync_date::timestamptz 
WHERE last_sync_at IS NULL AND last_sync_date IS NOT NULL;
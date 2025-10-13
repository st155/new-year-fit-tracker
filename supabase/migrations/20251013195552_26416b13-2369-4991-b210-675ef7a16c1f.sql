-- Add last_sync_date to whoop_tokens
ALTER TABLE whoop_tokens ADD COLUMN IF NOT EXISTS last_sync_date timestamp with time zone;
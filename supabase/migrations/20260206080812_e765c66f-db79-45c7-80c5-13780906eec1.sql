-- Add processed_at column to webhook_logs for tracking processing status
ALTER TABLE webhook_logs 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
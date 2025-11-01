-- Add metadata field to user_notifications for storing alert data
ALTER TABLE user_notifications 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
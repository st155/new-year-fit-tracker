-- Add notification_preferences column to profiles table
-- This allows users to customize their notification settings

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB 
DEFAULT '{"friend_completions": true, "reactions": true, "team_invites": true, "achievements": true, "reminders": true, "quiet_mode": false}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN profiles.notification_preferences IS 'User notification preferences for social features, achievements, and reminders';

-- Create index for faster queries on notification preferences
CREATE INDEX IF NOT EXISTS idx_profiles_notification_preferences 
ON profiles USING GIN (notification_preferences);
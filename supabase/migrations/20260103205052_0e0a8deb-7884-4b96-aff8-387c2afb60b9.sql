-- Drop the existing FK that references auth.users
ALTER TABLE habit_feed_events
DROP CONSTRAINT habit_feed_events_user_id_fkey;

-- Add new FK that references profiles.user_id (required for Supabase embedded joins)
ALTER TABLE habit_feed_events
ADD CONSTRAINT habit_feed_events_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
-- Add XP tracking to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_xp INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_level INT DEFAULT 1;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_total_xp ON profiles(total_xp DESC);

-- Function to automatically update user level based on XP
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
BEGIN
  -- Level formula: 1 level per 1000 XP
  NEW.current_level := FLOOR(NEW.total_xp / 1000.0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update level when XP changes
DROP TRIGGER IF EXISTS update_level_on_xp_change ON profiles;
CREATE TRIGGER update_level_on_xp_change
BEFORE UPDATE OF total_xp ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_user_level();
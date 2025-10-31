-- First, update existing profiles to fill in NULL fields
UPDATE profiles p
SET 
  username = COALESCE(
    p.username,
    (u.raw_user_meta_data->>'username')::text,
    (u.raw_user_meta_data->>'name')::text,
    (u.raw_user_meta_data->>'full_name')::text,
    SPLIT_PART(u.email, '@', 1)
  ),
  full_name = COALESCE(
    p.full_name,
    (u.raw_user_meta_data->>'full_name')::text,
    (u.raw_user_meta_data->>'name')::text
  ),
  avatar_url = COALESCE(
    p.avatar_url,
    (u.raw_user_meta_data->>'avatar_url')::text
  ),
  updated_at = NOW()
FROM auth.users u
WHERE p.user_id = u.id
  AND (p.username IS NULL OR p.full_name IS NULL OR p.avatar_url IS NULL);

-- Then, insert new profiles that don't exist
INSERT INTO profiles (id, user_id, username, full_name, avatar_url, updated_at)
SELECT 
  u.id,
  u.id as user_id,
  COALESCE(
    (u.raw_user_meta_data->>'username')::text,
    (u.raw_user_meta_data->>'name')::text,
    (u.raw_user_meta_data->>'full_name')::text,
    SPLIT_PART(u.email, '@', 1)
  ) as username,
  COALESCE(
    (u.raw_user_meta_data->>'full_name')::text,
    (u.raw_user_meta_data->>'name')::text
  ) as full_name,
  (u.raw_user_meta_data->>'avatar_url')::text as avatar_url,
  NOW() as updated_at
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = u.id);

-- Ensure trigger exists for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, username, full_name, avatar_url)
  VALUES (
    new.id,
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      SPLIT_PART(new.email, '@', 1)
    ),
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Create missing profiles for all users who don't have one
INSERT INTO public.profiles (user_id, username, full_name)
SELECT 
  u.id,
  COALESCE(SPLIT_PART(u.email, '@', 1), 'user_' || SUBSTRING(u.id::text, 1, 8)),
  COALESCE(
    u.raw_user_meta_data->>'full_name', 
    u.raw_user_meta_data->>'name',
    SPLIT_PART(u.email, '@', 1),
    'User'
  )
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;
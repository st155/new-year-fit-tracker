-- Delete users ST and Willi from the database
-- User IDs:
-- ST: 6169f2b0-d265-4ef5-a678-80d6e6b95ae1
-- Willi: cee65ee0-5237-433c-a41e-79d0367fad87

-- Delete from challenge_participants
DELETE FROM public.challenge_participants 
WHERE user_id IN (
  '6169f2b0-d265-4ef5-a678-80d6e6b95ae1',
  'cee65ee0-5237-433c-a41e-79d0367fad87'
);

-- Delete from challenge_points
DELETE FROM public.challenge_points 
WHERE user_id IN (
  '6169f2b0-d265-4ef5-a678-80d6e6b95ae1',
  'cee65ee0-5237-433c-a41e-79d0367fad87'
);

-- Delete from activity_feed
DELETE FROM public.activity_feed 
WHERE user_id IN (
  '6169f2b0-d765-4ef5-a678-80d6e6b95ae1',
  'cee65ee0-5237-433c-a41e-79d0367fad87'
);

-- Delete from user_roles
DELETE FROM public.user_roles 
WHERE user_id IN (
  '6169f2b0-d265-4ef5-a678-80d6e6b95ae1',
  'cee65ee0-5237-433c-a41e-79d0367fad87'
);

-- Delete from profiles
DELETE FROM public.profiles 
WHERE user_id IN (
  '6169f2b0-d265-4ef5-a678-80d6e6b95ae1',
  'cee65ee0-5237-433c-a41e-79d0367fad87'
);
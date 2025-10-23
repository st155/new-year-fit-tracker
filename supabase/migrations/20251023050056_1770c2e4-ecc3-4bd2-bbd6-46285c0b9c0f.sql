-- Fix RLS policies for profiles (remove overly permissive policy)
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- Fix RLS for activity_comments (restrict to challenge participants only)
DROP POLICY IF EXISTS "Users can view comments" ON activity_comments;

CREATE POLICY "Challenge participants can view activity comments"
ON activity_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM activity_feed af
    JOIN challenge_participants cp1 ON cp1.user_id = af.user_id
    JOIN challenge_participants cp2 ON cp2.challenge_id = cp1.challenge_id
    WHERE af.id = activity_comments.activity_id
      AND cp2.user_id = auth.uid()
  )
);

-- Fix RLS for activity_likes (restrict to challenge participants only)
DROP POLICY IF EXISTS "Users can view likes" ON activity_likes;

CREATE POLICY "Challenge participants can view activity likes"
ON activity_likes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM activity_feed af
    JOIN challenge_participants cp1 ON cp1.user_id = af.user_id
    JOIN challenge_participants cp2 ON cp2.challenge_id = cp1.challenge_id
    WHERE af.id = activity_likes.activity_id
      AND cp2.user_id = auth.uid()
  )
);

-- Fix RLS for whoop_user_mapping (remove service role policy)
DROP POLICY IF EXISTS "Service role can access whoop mapping" ON whoop_user_mapping;

-- Fix metric_mappings (require authentication)
DROP POLICY IF EXISTS "Everyone can view metric mappings" ON metric_mappings;
CREATE POLICY "Authenticated users can view metric mappings"
ON metric_mappings FOR SELECT
TO authenticated
USING (true);

-- Fix trainer_posts (require authentication)
DROP POLICY IF EXISTS "Users can view published posts" ON trainer_posts;
CREATE POLICY "Authenticated users can view published posts"
ON trainer_posts FOR SELECT
TO authenticated
USING (published = true);
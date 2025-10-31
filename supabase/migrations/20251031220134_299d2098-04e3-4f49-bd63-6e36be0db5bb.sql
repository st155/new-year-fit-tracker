-- Merge Fizkylt account into Kristina Ivanova account (Fixed version)
-- Old account: 27c30301-bb00-412e-b5c9-1593dc8fba52 (Fizkylt)
-- New account: 4e608801-d141-49a4-b254-853bee42069b (Кристина Иванова)

-- 1. Transfer unified_metrics from old to new account (avoiding duplicates)
UPDATE unified_metrics
SET user_id = '4e608801-d141-49a4-b254-853bee42069b'
WHERE user_id = '27c30301-bb00-412e-b5c9-1593dc8fba52'
  AND NOT EXISTS (
    SELECT 1 FROM unified_metrics um2
    WHERE um2.user_id = '4e608801-d141-49a4-b254-853bee42069b'
      AND um2.metric_name = unified_metrics.metric_name
      AND um2.measurement_date = unified_metrics.measurement_date
      AND um2.source = unified_metrics.source
  );

-- 2. Transfer challenge_participants (avoiding duplicates)
UPDATE challenge_participants
SET user_id = '4e608801-d141-49a4-b254-853bee42069b'
WHERE user_id = '27c30301-bb00-412e-b5c9-1593dc8fba52'
  AND NOT EXISTS (
    SELECT 1 FROM challenge_participants cp2
    WHERE cp2.user_id = '4e608801-d141-49a4-b254-853bee42069b'
      AND cp2.challenge_id = challenge_participants.challenge_id
  );

-- 3. Transfer challenge_points (avoiding duplicates)
UPDATE challenge_points
SET user_id = '4e608801-d141-49a4-b254-853bee42069b'
WHERE user_id = '27c30301-bb00-412e-b5c9-1593dc8fba52'
  AND NOT EXISTS (
    SELECT 1 FROM challenge_points cp2
    WHERE cp2.user_id = '4e608801-d141-49a4-b254-853bee42069b'
      AND cp2.challenge_id = challenge_points.challenge_id
  );

-- 4. Transfer user_achievements if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_achievements') THEN
    EXECUTE 'UPDATE user_achievements SET user_id = ''4e608801-d141-49a4-b254-853bee42069b'' WHERE user_id = ''27c30301-bb00-412e-b5c9-1593dc8fba52''';
  END IF;
END $$;

-- 5. Transfer activity_feed entries
UPDATE activity_feed
SET user_id = '4e608801-d141-49a4-b254-853bee42069b'
WHERE user_id = '27c30301-bb00-412e-b5c9-1593dc8fba52';

-- 6. Transfer challenge_posts
UPDATE challenge_posts
SET user_id = '4e608801-d141-49a4-b254-853bee42069b'
WHERE user_id = '27c30301-bb00-412e-b5c9-1593dc8fba52';

-- 7. Transfer body_composition records
UPDATE body_composition
SET user_id = '4e608801-d141-49a4-b254-853bee42069b'
WHERE user_id = '27c30301-bb00-412e-b5c9-1593dc8fba52';

-- 8. Transfer daily_health_summary
UPDATE daily_health_summary
SET user_id = '4e608801-d141-49a4-b254-853bee42069b'
WHERE user_id = '27c30301-bb00-412e-b5c9-1593dc8fba52'
  AND NOT EXISTS (
    SELECT 1 FROM daily_health_summary dhs2
    WHERE dhs2.user_id = '4e608801-d141-49a4-b254-853bee42069b'
      AND dhs2.date = daily_health_summary.date
  );

-- 9. Delete old dashboard_widgets (to avoid conflicts with unique constraint)
DELETE FROM dashboard_widgets
WHERE user_id = '27c30301-bb00-412e-b5c9-1593dc8fba52';

-- 10. Transfer data_freshness_tracking
UPDATE data_freshness_tracking
SET user_id = '4e608801-d141-49a4-b254-853bee42069b'
WHERE user_id = '27c30301-bb00-412e-b5c9-1593dc8fba52'
  AND NOT EXISTS (
    SELECT 1 FROM data_freshness_tracking dft2
    WHERE dft2.user_id = '4e608801-d141-49a4-b254-853bee42069b'
      AND dft2.provider = data_freshness_tracking.provider
      AND dft2.data_type = data_freshness_tracking.data_type
  );

-- 11. Delete old profile from profiles table
DELETE FROM profiles
WHERE user_id = '27c30301-bb00-412e-b5c9-1593dc8fba52';
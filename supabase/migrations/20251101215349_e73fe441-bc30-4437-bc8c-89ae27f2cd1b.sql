-- Step 1: Remove duplicate SELECT policy on profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Step 2: Sync profiles.user_id with auth.users.id for mismatched records
UPDATE public.profiles p
SET user_id = au.id
FROM auth.users au
WHERE au.email = p.username
  AND (p.user_id IS NULL OR p.user_id != au.id);

-- Step 3: Create SECURITY DEFINER function to get leaderboard data
CREATE OR REPLACE FUNCTION public.get_leaderboard_for_viewer(
  viewer uuid,
  time_period text DEFAULT 'overall',
  limit_n int DEFAULT 100
)
RETURNS TABLE (
  user_id uuid,
  challenge_id uuid,
  username text,
  full_name text,
  avatar_url text,
  total_points integer,
  streak_days integer,
  active_days bigint,
  days_with_data bigint,
  last_activity_date date,
  total_steps numeric,
  steps_last_7d numeric,
  total_calories numeric,
  avg_strain numeric,
  avg_strain_last_7d numeric,
  total_workouts bigint,
  workouts_last_7d bigint,
  avg_sleep numeric,
  avg_sleep_efficiency numeric,
  avg_sleep_last_7d numeric,
  avg_recovery numeric,
  avg_recovery_last_7d numeric,
  avg_hrv numeric,
  avg_resting_hr numeric,
  latest_weight numeric,
  latest_body_fat numeric,
  weekly_consistency numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  view_name text;
BEGIN
  -- Determine which view to use based on time_period
  CASE time_period
    WHEN 'week' THEN view_name := 'challenge_leaderboard_week';
    WHEN 'month' THEN view_name := 'challenge_leaderboard_month';
    ELSE view_name := 'challenge_leaderboard_v2';
  END CASE;

  -- Return leaderboard data for challenges accessible to viewer
  RETURN QUERY EXECUTE format('
    SELECT DISTINCT
      lb.user_id,
      lb.challenge_id,
      lb.username,
      lb.full_name,
      lb.avatar_url,
      lb.total_points,
      lb.streak_days,
      lb.active_days,
      lb.days_with_data,
      lb.last_activity_date,
      lb.total_steps,
      lb.steps_last_7d,
      lb.total_calories,
      lb.avg_strain,
      lb.avg_strain_last_7d,
      lb.total_workouts,
      lb.workouts_last_7d,
      lb.avg_sleep,
      lb.avg_sleep_efficiency,
      lb.avg_sleep_last_7d,
      lb.avg_recovery,
      lb.avg_recovery_last_7d,
      lb.avg_hrv,
      lb.avg_resting_hr,
      lb.latest_weight,
      lb.latest_body_fat,
      lb.weekly_consistency
    FROM %I lb
    WHERE lb.challenge_id IN (
      -- Challenges where viewer is a participant
      SELECT challenge_id FROM challenge_participants WHERE user_id = $1
      UNION
      -- Challenges where viewer is a trainer
      SELECT challenge_id FROM challenge_trainers WHERE trainer_id = $1
      UNION
      -- Challenges created by viewer
      SELECT id FROM challenges WHERE created_by = $1
    )
    AND public.can_view_profile($1, lb.user_id)
    ORDER BY lb.total_points DESC NULLS LAST
    LIMIT $2
  ', view_name) USING viewer, limit_n;
END;
$$;
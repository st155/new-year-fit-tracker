-- Step 1: Create discipline_metric_mappings table
CREATE TABLE IF NOT EXISTS discipline_metric_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discipline_name text NOT NULL UNIQUE,
  unified_metric_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Insert initial mappings
INSERT INTO discipline_metric_mappings (discipline_name, unified_metric_name) VALUES
  ('Daily Steps', 'Steps'),
  ('Sleep Duration', 'Sleep Duration'),
  ('Sleep Quality Score', 'Sleep Efficiency'),
  ('Morning Resting Heart Rate', 'Resting Heart Rate'),
  ('Recovery Score', 'Recovery Score'),
  ('Recovery Days per Week', 'Recovery Score'),
  ('Weekly Active Recovery Sessions', 'Recovery Score'),
  ('HRV', 'HRV'),
  ('Stress-Free Hours per Day', 'Stress Level')
ON CONFLICT (discipline_name) DO NOTHING;

-- Step 2: Update join_challenge function to create goals from challenge_disciplines
CREATE OR REPLACE FUNCTION join_challenge(p_challenge_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_goals_created integer := 0;
  v_already_participant boolean;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if already participant
  SELECT EXISTS(
    SELECT 1 FROM challenge_participants 
    WHERE challenge_id = p_challenge_id AND user_id = v_user_id
  ) INTO v_already_participant;

  -- Add participant
  INSERT INTO challenge_participants (challenge_id, user_id, joined_at)
  VALUES (p_challenge_id, v_user_id, now())
  ON CONFLICT (challenge_id, user_id) DO NOTHING;

  -- Create goals from challenge_disciplines if not exist
  IF NOT v_already_participant THEN
    INSERT INTO goals (
      user_id, 
      challenge_id, 
      goal_name, 
      goal_type, 
      target_value, 
      target_unit, 
      is_personal
    )
    SELECT 
      v_user_id,
      cd.challenge_id,
      cd.discipline_name,
      cd.discipline_type,
      cd.benchmark_value,
      cd.unit,
      false
    FROM challenge_disciplines cd
    WHERE cd.challenge_id = p_challenge_id
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_goals_created = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'already_participant', v_already_participant,
    'goals_created', v_goals_created,
    'user_id', v_user_id,
    'challenge_id', p_challenge_id
  );
END;
$$;

-- Step 3: Create goal_current_values view
CREATE OR REPLACE VIEW goal_current_values AS
SELECT 
  g.id as goal_id,
  g.user_id,
  g.goal_name,
  g.target_value,
  g.target_unit,
  COALESCE(
    (SELECT um.value 
     FROM unified_metrics um
     JOIN discipline_metric_mappings dmm ON dmm.unified_metric_name = um.metric_name
     WHERE dmm.discipline_name = g.goal_name
       AND um.user_id = g.user_id
     ORDER BY um.measurement_date DESC, um.priority DESC
     LIMIT 1),
    (SELECT m.value
     FROM measurements m
     WHERE m.goal_id = g.id
     ORDER BY m.measurement_date DESC
     LIMIT 1),
    0
  ) as current_value,
  COALESCE(
    (SELECT um.source
     FROM unified_metrics um
     JOIN discipline_metric_mappings dmm ON dmm.unified_metric_name = um.metric_name
     WHERE dmm.discipline_name = g.goal_name
       AND um.user_id = g.user_id
     ORDER BY um.measurement_date DESC, um.priority DESC
     LIMIT 1),
    'manual'
  ) as source,
  COALESCE(
    (SELECT um.measurement_date
     FROM unified_metrics um
     JOIN discipline_metric_mappings dmm ON dmm.unified_metric_name = um.metric_name
     WHERE dmm.discipline_name = g.goal_name
       AND um.user_id = g.user_id
     ORDER BY um.measurement_date DESC, um.priority DESC
     LIMIT 1),
    (SELECT m.measurement_date
     FROM measurements m
     WHERE m.goal_id = g.id
     ORDER BY m.measurement_date DESC
     LIMIT 1)
  ) as last_updated
FROM goals g;

-- Step 4: Migrate existing goals for Recovery & Sleep Challenge
DO $$
DECLARE
  v_challenge_id UUID := '1c820a7c-06a5-403e-b7c5-c1158edeb864';
BEGIN
  -- Delete old goals for this challenge
  DELETE FROM goals
  WHERE challenge_id = v_challenge_id;

  -- Recreate goals from challenge_disciplines for all participants
  INSERT INTO goals (user_id, challenge_id, goal_name, goal_type, target_value, target_unit, is_personal)
  SELECT 
    cp.user_id,
    cd.challenge_id,
    cd.discipline_name,
    cd.discipline_type,
    cd.benchmark_value,
    cd.unit,
    false
  FROM challenge_participants cp
  CROSS JOIN challenge_disciplines cd
  WHERE cp.challenge_id = v_challenge_id
    AND cd.challenge_id = v_challenge_id
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Migrated goals for Recovery & Sleep Challenge participants';
END $$;
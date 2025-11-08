-- Add difficulty_level column to challenge_participants
ALTER TABLE challenge_participants 
ADD COLUMN difficulty_level integer DEFAULT 0 CHECK (difficulty_level >= 0 AND difficulty_level <= 3);

COMMENT ON COLUMN challenge_participants.difficulty_level IS 
'Challenge difficulty multiplier: 0=base, 1=+30%, 2=+60%, 3=+90%';

-- Add index for filtering by difficulty
CREATE INDEX idx_challenge_participants_difficulty 
ON challenge_participants(difficulty_level);

-- Update Recovery & Sleep Challenge start date to Jan 1, 2026
UPDATE challenges 
SET 
  start_date = '2026-01-01',
  end_date = '2026-03-31',
  updated_at = now()
WHERE id = '1c820a7c-06a5-403e-b7c5-c1158edeb864';

-- Update join_challenge function to accept difficulty level
CREATE OR REPLACE FUNCTION join_challenge(
  p_challenge_id uuid,
  p_difficulty_level integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_goals_created integer := 0;
  v_already_participant boolean;
  v_difficulty_multiplier numeric;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate difficulty level
  IF p_difficulty_level < 0 OR p_difficulty_level > 3 THEN
    RAISE EXCEPTION 'Invalid difficulty level. Must be 0-3';
  END IF;

  -- Calculate difficulty multiplier: 0=1.0, 1=1.3, 2=1.6, 3=1.9
  v_difficulty_multiplier := 1.0 + (p_difficulty_level * 0.3);

  -- Check if already participant
  SELECT EXISTS(
    SELECT 1 FROM challenge_participants 
    WHERE challenge_id = p_challenge_id AND user_id = v_user_id
  ) INTO v_already_participant;

  -- Add participant with difficulty level
  INSERT INTO challenge_participants (
    challenge_id, 
    user_id, 
    joined_at,
    difficulty_level
  )
  VALUES (
    p_challenge_id, 
    v_user_id, 
    now(),
    p_difficulty_level
  )
  ON CONFLICT (challenge_id, user_id) 
  DO UPDATE SET difficulty_level = p_difficulty_level;

  -- Create goals from challenge_disciplines with difficulty multiplier
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
      ROUND(cd.benchmark_value * v_difficulty_multiplier, 2),
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
    'challenge_id', p_challenge_id,
    'difficulty_level', p_difficulty_level,
    'multiplier', v_difficulty_multiplier
  );
END;
$$;
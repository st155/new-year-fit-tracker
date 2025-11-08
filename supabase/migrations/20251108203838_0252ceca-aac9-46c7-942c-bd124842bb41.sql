-- Update Recovery & Sleep Challenge with realistic goals including minimal physical activity
DO $$
DECLARE
  v_challenge_id UUID;
BEGIN
  -- Find the Recovery & Sleep Challenge
  SELECT id INTO v_challenge_id 
  FROM challenges 
  WHERE title = 'Recovery & Sleep Challenge'
  LIMIT 1;

  IF v_challenge_id IS NOT NULL THEN
    -- Delete old disciplines
    DELETE FROM challenge_disciplines 
    WHERE challenge_id = v_challenge_id;

    -- Insert new realistic disciplines
    INSERT INTO challenge_disciplines (
      challenge_id,
      discipline_name,
      discipline_type,
      benchmark_value,
      unit,
      position
    ) VALUES
      -- Minimal physical activity
      (v_challenge_id, 'Daily Steps', 'points', 8000, 'steps/day', 0),
      
      -- Sleep goals
      (v_challenge_id, 'Sleep Duration', 'time', 7.5, 'hours/night', 1),
      (v_challenge_id, 'Sleep Quality Score', 'percentage', 75, '%', 2),
      
      -- Recovery metrics
      (v_challenge_id, 'Recovery Days per Week', 'points', 2, 'days/week', 3),
      (v_challenge_id, 'Morning Resting Heart Rate', 'lower_better', 65, 'bpm', 4),
      (v_challenge_id, 'Weekly Active Recovery Sessions', 'points', 3, 'sessions/week', 5),
      
      -- Stress management
      (v_challenge_id, 'Stress-Free Hours per Day', 'points', 4, 'hours/day', 6);

    -- Update challenge description
    UPDATE challenges
    SET description = 'Фокус на целостное здоровье через качественный сон, активное восстановление и управление стрессом. Челлендж сочетает отдых с легкой активностью (8000 шагов/день) для формирования устойчивых здоровых привычек. Идеально для начинающих и тех, кто приоритизирует восстановление!'
    WHERE id = v_challenge_id;

    RAISE NOTICE 'Successfully updated Recovery & Sleep Challenge with % disciplines', 7;
  ELSE
    RAISE NOTICE 'Recovery & Sleep Challenge not found';
  END IF;
END $$;
-- Backfill: Link existing WHOOP strength/fitness workouts with manual workouts on the same day
WITH manual_workouts AS (
  SELECT id, user_id, DATE(start_time) as workout_date
  FROM workouts
  WHERE source = 'manual_trainer'
),
whoop_workouts AS (
  SELECT id, user_id, DATE(start_time) as workout_date
  FROM workouts
  WHERE source = 'whoop'
    AND workout_type IN ('0', '1', '48', '63', '44', '47', '82', '71')
)
UPDATE workouts w
SET linked_workout_id = mw.id
FROM whoop_workouts ww
JOIN manual_workouts mw ON mw.user_id = ww.user_id AND mw.workout_date = ww.workout_date
WHERE w.id = ww.id
  AND w.linked_workout_id IS NULL;
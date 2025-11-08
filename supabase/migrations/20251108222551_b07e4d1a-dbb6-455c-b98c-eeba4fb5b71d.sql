-- Add RLS policy for trainers to view client workouts
CREATE POLICY "Trainers can view client workouts"
  ON workouts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trainer_clients tc
      WHERE tc.client_id = workouts.user_id
        AND tc.trainer_id = auth.uid()
        AND tc.active = true
    )
  );
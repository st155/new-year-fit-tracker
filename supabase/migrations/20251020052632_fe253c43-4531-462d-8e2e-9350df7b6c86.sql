-- Allow challenge participants to view each other's metric values
CREATE POLICY "Challenge participants can view each others metrics"
ON metric_values
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM challenge_participants cp1
    JOIN challenge_participants cp2 ON cp1.challenge_id = cp2.challenge_id
    WHERE cp1.user_id = auth.uid()
      AND cp2.user_id = metric_values.user_id
  )
);

-- Allow challenge participants to view each other's metrics configuration
CREATE POLICY "Challenge participants can view each others metrics config"
ON user_metrics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM challenge_participants cp1
    JOIN challenge_participants cp2 ON cp1.challenge_id = cp2.challenge_id
    WHERE cp1.user_id = auth.uid()
      AND cp2.user_id = user_metrics.user_id
  )
);
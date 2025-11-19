-- Allow service role to insert workouts for Terra webhooks
CREATE POLICY "Service role can insert workouts"
ON workouts
FOR INSERT
TO service_role
WITH CHECK (true);
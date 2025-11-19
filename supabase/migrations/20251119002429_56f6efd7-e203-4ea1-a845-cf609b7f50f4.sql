-- Allow service role to SELECT workouts (needed for .select() after upsert)
CREATE POLICY "Service role can select workouts"
ON workouts
FOR SELECT
TO service_role
USING (true);
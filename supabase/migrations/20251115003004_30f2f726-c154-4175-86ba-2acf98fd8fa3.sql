-- ============================================================================
-- PHASE 1: CRITICAL FIXES - Restore Missing View and Fix RLS Policies
-- ============================================================================

-- 1. Restore challenge_leaderboard_v2 view
-- This view was dropped but is still referenced by get_leaderboard_for_viewer function
CREATE OR REPLACE VIEW challenge_leaderboard_v2
WITH (security_invoker=on) AS
SELECT * FROM challenge_leaderboard_month;

COMMENT ON VIEW challenge_leaderboard_v2 IS 'Main leaderboard view - restored to fix PostgreSQL errors';

-- 2. Fix RLS Policies for Sensitive Tables
-- Currently unified_metrics, profiles, and other tables are publicly accessible

-- 2.1. Secure unified_metrics table - Drop and recreate all policies
DROP POLICY IF EXISTS "Allow public read access" ON unified_metrics;
DROP POLICY IF EXISTS "Users can view their own metrics" ON unified_metrics;
DROP POLICY IF EXISTS "Challenge participants can view each other's metrics" ON unified_metrics;
DROP POLICY IF EXISTS "Trainers can view client metrics" ON unified_metrics;

-- Allow users to read their own metrics
CREATE POLICY "Users can view their own metrics"
ON unified_metrics FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users in same challenge to view each other's metrics
CREATE POLICY "Challenge participants can view each other's metrics"
ON unified_metrics FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM challenge_participants cp1
    INNER JOIN challenge_participants cp2 ON cp1.challenge_id = cp2.challenge_id
    WHERE cp1.user_id = auth.uid()
      AND cp2.user_id = unified_metrics.user_id
  )
);

-- Allow trainers to view their clients' metrics
CREATE POLICY "Trainers can view client metrics"
ON unified_metrics FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trainer_clients tc
    WHERE tc.trainer_id = auth.uid()
      AND tc.client_id = unified_metrics.user_id
      AND tc.active = true
  )
);

-- 2.2. Secure profiles table
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Profiles viewable based on relationships" ON profiles;

-- Use the existing can_view_profile function for proper access control
CREATE POLICY "Profiles viewable based on relationships"
ON profiles FOR SELECT
TO authenticated
USING (public.can_view_profile(auth.uid(), user_id));

-- 2.3. Secure goals table
DROP POLICY IF EXISTS "Goals are viewable by everyone" ON goals;
DROP POLICY IF EXISTS "Users can view their own goals" ON goals;
DROP POLICY IF EXISTS "Challenge participants can view each other's goals" ON goals;

-- Allow users to view their own goals
CREATE POLICY "Users can view their own goals"
ON goals FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow challenge participants to view each other's goals
CREATE POLICY "Challenge participants can view each other's goals"
ON goals FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM challenge_participants cp1
    INNER JOIN challenge_participants cp2 ON cp1.challenge_id = cp2.challenge_id
    WHERE cp1.user_id = auth.uid()
      AND cp2.user_id = goals.user_id
  )
);

-- 2.4. Secure challenge_points table
DROP POLICY IF EXISTS "Challenge points are viewable by everyone" ON challenge_points;
DROP POLICY IF EXISTS "Users can view their own challenge points" ON challenge_points;
DROP POLICY IF EXISTS "Challenge participants can view each other's points" ON challenge_points;

-- Allow users to view their own points
CREATE POLICY "Users can view their own challenge points"
ON challenge_points FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow challenge participants to view each other's points
CREATE POLICY "Challenge participants can view each other's points"
ON challenge_points FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM challenge_participants cp1
    INNER JOIN challenge_participants cp2 ON cp1.challenge_id = cp2.challenge_id
    WHERE cp1.user_id = auth.uid()
      AND cp2.user_id = challenge_points.user_id
  )
);

-- 2.5. Secure measurements table
DROP POLICY IF EXISTS "Measurements are viewable by everyone" ON measurements;
DROP POLICY IF EXISTS "Users can view their own measurements" ON measurements;
DROP POLICY IF EXISTS "Trainers can view client measurements" ON measurements;

-- Allow users to view their own measurements
CREATE POLICY "Users can view their own measurements"
ON measurements FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow trainers to view their clients' measurements
CREATE POLICY "Trainers can view client measurements"
ON measurements FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trainer_clients tc
    WHERE tc.trainer_id = auth.uid()
      AND tc.client_id = measurements.user_id
      AND tc.active = true
  )
);

-- 2.6. Secure body_composition table - Keep existing policies that work with challenge participants
DROP POLICY IF EXISTS "Body composition viewable by everyone" ON body_composition;
DROP POLICY IF EXISTS "Challenge participants can view each other's body composition" ON body_composition;
DROP POLICY IF EXISTS "Trainers can view client body composition" ON body_composition;

-- Allow trainers to view their clients' body composition
CREATE POLICY "Trainers can view client body composition"
ON body_composition FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trainer_clients tc
    WHERE tc.trainer_id = auth.uid()
      AND tc.client_id = body_composition.user_id
      AND tc.active = true
  )
);

-- Allow challenge participants to view each other's body composition
CREATE POLICY "Challenge participants can view each other's body composition"
ON body_composition FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM challenge_participants cp1
    INNER JOIN challenge_participants cp2 ON cp1.challenge_id = cp2.challenge_id
    WHERE cp1.user_id = auth.uid()
      AND cp2.user_id = body_composition.user_id
  )
);
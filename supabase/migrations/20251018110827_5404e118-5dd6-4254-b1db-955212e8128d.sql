-- Step 1: Fix infinite recursion in RLS policies for challenges
DROP POLICY IF EXISTS "Trainers can view their challenges" ON challenges;
DROP POLICY IF EXISTS "Challenge owners can manage trainers" ON challenge_trainers;

-- Create simplified policies without recursion
CREATE POLICY "Trainers can view their challenges v2" 
ON challenges FOR SELECT 
USING (
  created_by = auth.uid() 
  OR is_active = true
  OR id IN (
    SELECT challenge_id FROM challenge_trainers 
    WHERE trainer_id = auth.uid()
  )
);

CREATE POLICY "Challenge owners can manage trainers v2"
ON challenge_trainers FOR ALL
USING (
  challenge_id IN (
    SELECT id FROM challenges 
    WHERE created_by = auth.uid()
  )
)
WITH CHECK (
  challenge_id IN (
    SELECT id FROM challenges 
    WHERE created_by = auth.uid()
  )
);

-- Step 2: Add webhook_logs table for monitoring
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type TEXT NOT NULL,
  event_type TEXT,
  user_id UUID REFERENCES auth.users(id),
  terra_user_id TEXT,
  whoop_user_id TEXT,
  payload JSONB,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_type_created ON webhook_logs(webhook_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_user ON webhook_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status, created_at DESC);

-- Enable RLS on webhook_logs
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Allow trainers and admins to view webhook logs
CREATE POLICY "Trainers can view webhook logs" 
ON webhook_logs FOR SELECT 
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'trainer'::app_role)
);

-- Allow system to insert webhook logs
CREATE POLICY "System can insert webhook logs" 
ON webhook_logs FOR INSERT 
WITH CHECK (true);
-- Add RLS policy for trainers to view their clients' metrics
CREATE POLICY "Trainers can view their clients metrics"
ON user_metrics FOR SELECT
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM trainer_clients
    WHERE trainer_clients.trainer_id = auth.uid()
      AND trainer_clients.client_id = user_metrics.user_id
      AND trainer_clients.active = true
  )
  OR has_role(auth.uid(), 'admin')
);

-- Add RLS policy for trainers to view their clients' metric values
CREATE POLICY "Trainers can view their clients metric values"
ON metric_values FOR SELECT
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM trainer_clients
    WHERE trainer_clients.trainer_id = auth.uid()
      AND trainer_clients.client_id = metric_values.user_id
      AND trainer_clients.active = true
  )
  OR has_role(auth.uid(), 'admin')
);
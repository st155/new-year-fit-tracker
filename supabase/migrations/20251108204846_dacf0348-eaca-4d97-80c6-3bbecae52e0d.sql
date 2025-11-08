-- Enable RLS on discipline_metric_mappings table
ALTER TABLE discipline_metric_mappings ENABLE ROW LEVEL SECURITY;

-- Create policy for discipline_metric_mappings (read-only for all authenticated users)
CREATE POLICY "Anyone can view discipline metric mappings"
  ON discipline_metric_mappings
  FOR SELECT
  TO authenticated
  USING (true);

-- Drop the SECURITY DEFINER view and recreate without it
DROP VIEW IF EXISTS goal_current_values;

CREATE VIEW goal_current_values AS
SELECT 
  g.id as goal_id,
  g.user_id,
  g.goal_name,
  g.target_value,
  g.target_unit,
  COALESCE(
    (SELECT um.value 
     FROM unified_metrics um
     JOIN discipline_metric_mappings dmm ON dmm.unified_metric_name = um.metric_name
     WHERE dmm.discipline_name = g.goal_name
       AND um.user_id = g.user_id
     ORDER BY um.measurement_date DESC, um.priority DESC
     LIMIT 1),
    (SELECT m.value
     FROM measurements m
     WHERE m.goal_id = g.id
     ORDER BY m.measurement_date DESC
     LIMIT 1),
    0
  ) as current_value,
  COALESCE(
    (SELECT um.source
     FROM unified_metrics um
     JOIN discipline_metric_mappings dmm ON dmm.unified_metric_name = um.metric_name
     WHERE dmm.discipline_name = g.goal_name
       AND um.user_id = g.user_id
     ORDER BY um.measurement_date DESC, um.priority DESC
     LIMIT 1),
    'manual'
  ) as source,
  COALESCE(
    (SELECT um.measurement_date
     FROM unified_metrics um
     JOIN discipline_metric_mappings dmm ON dmm.unified_metric_name = um.metric_name
     WHERE dmm.discipline_name = g.goal_name
       AND um.user_id = g.user_id
     ORDER BY um.measurement_date DESC, um.priority DESC
     LIMIT 1),
    (SELECT m.measurement_date
     FROM measurements m
     WHERE m.goal_id = g.id
     ORDER BY m.measurement_date DESC
     LIMIT 1)
  ) as last_updated
FROM goals g;
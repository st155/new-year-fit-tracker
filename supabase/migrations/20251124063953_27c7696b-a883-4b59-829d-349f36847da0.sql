-- Create protocol_lifecycle_alerts table
CREATE TABLE IF NOT EXISTS protocol_lifecycle_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES user_stack(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('retest_prompt', 'protocol_starting', 'low_adherence')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_protocol_lifecycle_alerts_user_unread 
ON protocol_lifecycle_alerts(user_id, is_read) 
WHERE is_read = false;

-- Enable RLS
ALTER TABLE protocol_lifecycle_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own alerts"
ON protocol_lifecycle_alerts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
ON protocol_lifecycle_alerts FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger function to auto-update protocol status based on dates
CREATE OR REPLACE FUNCTION auto_update_protocol_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-activate if start_date is today or in the past and status is draft
  IF NEW.status = 'draft' AND NEW.start_date IS NOT NULL THEN
    IF NEW.start_date <= CURRENT_DATE THEN
      NEW.status := 'active';
    END IF;
  END IF;

  -- Auto-complete if planned_end_date has passed and status is active
  IF NEW.status = 'active' AND NEW.planned_end_date IS NOT NULL THEN
    IF NEW.planned_end_date < CURRENT_DATE THEN
      NEW.status := 'completed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on user_stack
DROP TRIGGER IF EXISTS trigger_auto_update_protocol_status ON user_stack;
CREATE TRIGGER trigger_auto_update_protocol_status
  BEFORE INSERT OR UPDATE ON user_stack
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_protocol_status();

-- Update existing protocols to correct status based on dates
UPDATE user_stack
SET status = 'active'
WHERE status = 'draft' 
  AND start_date IS NOT NULL 
  AND start_date <= CURRENT_DATE;

UPDATE user_stack
SET status = 'completed'
WHERE status = 'active' 
  AND planned_end_date IS NOT NULL 
  AND planned_end_date < CURRENT_DATE;

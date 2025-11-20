-- Phase 2: BioStack Automation Triggers

-- ============================================================================
-- 1. Add new columns for automation
-- ============================================================================

-- Add tracking columns to user_inventory
ALTER TABLE user_inventory 
ADD COLUMN IF NOT EXISTS estimated_depletion_date DATE,
ADD COLUMN IF NOT EXISTS daily_usage_rate NUMERIC DEFAULT 0;

-- Add adherence tracking columns to protocols
ALTER TABLE protocols
ADD COLUMN IF NOT EXISTS adherence_rate NUMERIC DEFAULT 100 CHECK (adherence_rate BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS total_scheduled INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_taken INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_taken_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- 2. Function: Decrease inventory on intake
-- ============================================================================

CREATE OR REPLACE FUNCTION decrease_inventory_on_intake()
RETURNS TRIGGER AS $$
DECLARE
  inventory_record RECORD;
  usage_rate NUMERIC;
  days_count INTEGER;
BEGIN
  -- Only process when taken_at is set for the first time
  IF NEW.taken_at IS NULL OR OLD.taken_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get the inventory record
  SELECT ui.* INTO inventory_record
  FROM user_inventory ui
  JOIN protocol_items pi ON pi.product_id = ui.product_id AND pi.user_id = ui.user_id
  WHERE pi.id = NEW.protocol_item_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Decrease current servings
  UPDATE user_inventory
  SET current_servings = GREATEST(0, current_servings - NEW.servings_taken)
  WHERE id = inventory_record.id;

  -- Calculate daily usage rate (average over last 30 days)
  SELECT 
    COUNT(DISTINCT DATE(taken_at)),
    COALESCE(SUM(servings_taken), 0)
  INTO days_count, usage_rate
  FROM supplement_logs sl
  JOIN protocol_items pi ON pi.id = sl.protocol_item_id
  WHERE pi.product_id = inventory_record.product_id
    AND pi.user_id = inventory_record.user_id
    AND sl.taken_at >= NOW() - INTERVAL '30 days'
    AND sl.taken_at IS NOT NULL;

  IF days_count > 0 THEN
    usage_rate := usage_rate / days_count;
  ELSE
    usage_rate := 0;
  END IF;

  -- Update daily usage rate and estimated depletion date
  UPDATE user_inventory
  SET 
    daily_usage_rate = usage_rate,
    estimated_depletion_date = CASE 
      WHEN usage_rate > 0 THEN 
        CURRENT_DATE + (current_servings / usage_rate)::INTEGER
      ELSE NULL
    END
  WHERE id = inventory_record.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- ============================================================================
-- 3. Function: Check low stock alert
-- ============================================================================

CREATE OR REPLACE FUNCTION check_low_stock_alert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_servings <= NEW.low_stock_threshold THEN
    NEW.is_low_alert := true;
  ELSE
    NEW.is_low_alert := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- ============================================================================
-- 4. Function: Auto-schedule protocol items
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_schedule_protocol_items()
RETURNS TRIGGER AS $$
DECLARE
  schedule_date DATE;
  intake_time TEXT;
  scheduled_timestamp TIMESTAMP WITH TIME ZONE;
  protocol_user_id UUID;
BEGIN
  -- Get protocol user_id
  SELECT user_id INTO protocol_user_id
  FROM protocols
  WHERE id = NEW.protocol_id;

  -- Loop through next 7 days
  FOR i IN 0..6 LOOP
    schedule_date := CURRENT_DATE + i;
    
    -- Loop through intake_times array
    FOREACH intake_time IN ARRAY NEW.intake_times LOOP
      -- Convert intake_time to timestamp
      scheduled_timestamp := schedule_date + (
        CASE intake_time
          WHEN 'morning' THEN '08:00:00'::TIME
          WHEN 'afternoon' THEN '14:00:00'::TIME
          WHEN 'evening' THEN '20:00:00'::TIME
          ELSE '12:00:00'::TIME
        END
      );
      
      -- Insert if not exists
      INSERT INTO supplement_logs (
        user_id, 
        protocol_item_id, 
        scheduled_time, 
        servings_taken,
        status
      )
      VALUES (
        protocol_user_id,
        NEW.id,
        scheduled_timestamp,
        NEW.servings_per_intake,
        'pending'
      )
      ON CONFLICT (user_id, protocol_item_id, scheduled_time) DO NOTHING;
    END LOOP;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- ============================================================================
-- 5. Function: Update protocol adherence
-- ============================================================================

CREATE OR REPLACE FUNCTION update_protocol_adherence()
RETURNS TRIGGER AS $$
DECLARE
  protocol_id_val UUID;
  scheduled_count INTEGER;
  taken_count INTEGER;
BEGIN
  -- Get protocol_id from protocol_item
  SELECT pi.protocol_id INTO protocol_id_val
  FROM protocol_items pi
  WHERE pi.id = NEW.protocol_item_id;
  
  IF protocol_id_val IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Count scheduled vs taken
  SELECT 
    COUNT(*) FILTER (WHERE status IN ('pending', 'taken')),
    COUNT(*) FILTER (WHERE status = 'taken')
  INTO scheduled_count, taken_count
  FROM supplement_logs sl
  JOIN protocol_items pi ON pi.id = sl.protocol_item_id
  WHERE pi.protocol_id = protocol_id_val;
  
  -- Update protocol stats
  UPDATE protocols SET
    total_scheduled = scheduled_count,
    total_taken = taken_count,
    adherence_rate = CASE 
      WHEN scheduled_count > 0 THEN ROUND((taken_count::NUMERIC / scheduled_count * 100)::NUMERIC, 2)
      ELSE 100
    END,
    last_taken_at = CASE 
      WHEN NEW.taken_at IS NOT NULL THEN NEW.taken_at
      ELSE last_taken_at
    END
  WHERE id = protocol_id_val;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- ============================================================================
-- 6. Function: Cleanup old pending logs
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_pending_logs()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE supplement_logs
  SET status = 'missed'
  WHERE status = 'pending'
    AND scheduled_time < NOW() - INTERVAL '2 days';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- ============================================================================
-- 7. Create triggers
-- ============================================================================

-- Trigger: Decrease inventory when supplement is taken
DROP TRIGGER IF EXISTS on_supplement_taken ON supplement_logs;
CREATE TRIGGER on_supplement_taken
AFTER UPDATE OF taken_at ON supplement_logs
FOR EACH ROW
WHEN (NEW.taken_at IS NOT NULL AND OLD.taken_at IS NULL)
EXECUTE FUNCTION decrease_inventory_on_intake();

-- Trigger: Check low stock alerts when inventory changes
DROP TRIGGER IF EXISTS check_inventory_alerts ON user_inventory;
CREATE TRIGGER check_inventory_alerts
BEFORE UPDATE OF current_servings ON user_inventory
FOR EACH ROW
EXECUTE FUNCTION check_low_stock_alert();

-- Trigger: Auto-schedule supplements when protocol items are added/updated
DROP TRIGGER IF EXISTS schedule_supplements_on_protocol_change ON protocol_items;
CREATE TRIGGER schedule_supplements_on_protocol_change
AFTER INSERT OR UPDATE ON protocol_items
FOR EACH ROW
EXECUTE FUNCTION auto_schedule_protocol_items();

-- Trigger: Update adherence when supplement logs change
DROP TRIGGER IF EXISTS update_adherence_on_log_change ON supplement_logs;
CREATE TRIGGER update_adherence_on_log_change
AFTER UPDATE ON supplement_logs
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status OR NEW.taken_at IS DISTINCT FROM OLD.taken_at)
EXECUTE FUNCTION update_protocol_adherence();

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON FUNCTION decrease_inventory_on_intake() IS 'Automatically decreases inventory and updates usage rates when supplements are taken';
COMMENT ON FUNCTION check_low_stock_alert() IS 'Sets low stock alert flag when inventory drops below threshold';
COMMENT ON FUNCTION auto_schedule_protocol_items() IS 'Creates scheduled supplement logs for next 7 days when protocol items are created';
COMMENT ON FUNCTION update_protocol_adherence() IS 'Recalculates protocol adherence rate based on taken vs scheduled supplements';
COMMENT ON FUNCTION cleanup_old_pending_logs() IS 'Marks old pending supplement logs as missed - call periodically via cron';

COMMENT ON COLUMN user_inventory.estimated_depletion_date IS 'Estimated date when supplement will run out based on daily usage rate';
COMMENT ON COLUMN user_inventory.daily_usage_rate IS 'Average servings consumed per day over last 30 days';
COMMENT ON COLUMN protocols.adherence_rate IS 'Percentage of scheduled supplements that were actually taken';
COMMENT ON COLUMN protocols.total_scheduled IS 'Total number of scheduled supplement intakes';
COMMENT ON COLUMN protocols.total_taken IS 'Total number of supplements actually taken';
COMMENT ON COLUMN protocols.last_taken_at IS 'Timestamp of most recent supplement intake';
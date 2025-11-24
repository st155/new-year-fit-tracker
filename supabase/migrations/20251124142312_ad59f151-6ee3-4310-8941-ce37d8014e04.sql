-- Fix auto_schedule_protocol_items to use correct field
CREATE OR REPLACE FUNCTION public.auto_schedule_protocol_items()
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
      
      -- Insert if not exists (use 1 serving per intake as default)
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
        1,  -- Default to 1 serving per intake (fixed from NEW.servings_per_intake)
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
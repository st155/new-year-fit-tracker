-- Add unique index for supplement_logs to support ON CONFLICT in trigger
-- This prevents duplicate scheduling of the same supplement at the same time
CREATE UNIQUE INDEX IF NOT EXISTS supplement_logs_unique_schedule 
ON public.supplement_logs (user_id, protocol_item_id, scheduled_time);
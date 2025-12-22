
-- Activate Terra tokens for Alexey Gubarev (WHOOP + WITHINGS)
UPDATE terra_tokens 
SET is_active = true, updated_at = now() 
WHERE user_id = 'b9fc3f8b-e7bf-44f9-a591-cec47f9c93ae' 
  AND is_active = false;

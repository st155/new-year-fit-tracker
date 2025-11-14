-- Activate Whoop token for user who just reconnected
UPDATE terra_tokens 
SET 
  is_active = true, 
  updated_at = now() 
WHERE user_id = 'a527db40-3f7f-448f-8782-da632711e818' 
  AND provider = 'WHOOP';
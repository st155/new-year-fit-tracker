-- Деактивировать Whoop токены с несовместимыми Client ID
-- Это позволит пользователям переподключиться заново с актуальными credentials

UPDATE whoop_tokens 
SET is_active = false 
WHERE is_active = true 
  AND (client_id IS NULL OR client_id != '017d191d-e8d9-42d7-98ad-025d7daabeec');
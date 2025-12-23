-- Clean up all WHOOP related data for Alexey Gubarev (b9fc3f8b-e7bf-44f9-a591-cec47f9c93ae)
-- Terra user ID: 62a2b59d-8f19-49b0-b50f-38d45ae981b6

-- Delete any terra_tokens for WHOOP for this user
DELETE FROM terra_tokens 
WHERE user_id = 'b9fc3f8b-e7bf-44f9-a591-cec47f9c93ae' 
  AND provider = 'WHOOP';

-- Delete terra_tokens with this terra_user_id (just in case)
DELETE FROM terra_tokens 
WHERE terra_user_id = '62a2b59d-8f19-49b0-b50f-38d45ae981b6';

-- Delete raw webhooks for this terra_user_id to clean up deauth status
DELETE FROM terra_webhooks_raw 
WHERE user_id = '62a2b59d-8f19-49b0-b50f-38d45ae981b6';

-- Delete webhook logs for this terra_user_id
DELETE FROM webhook_logs 
WHERE terra_user_id = '62a2b59d-8f19-49b0-b50f-38d45ae981b6';
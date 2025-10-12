-- Remove inactive WHOOP terra token to avoid conflicts with direct Whoop integration
DELETE FROM terra_tokens 
WHERE provider = 'WHOOP' AND is_active = false;
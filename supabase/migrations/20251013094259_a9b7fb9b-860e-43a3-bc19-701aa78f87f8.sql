-- Удаляем старую тестовую запись Whoop, чтобы можно было подключиться заново
DELETE FROM terra_tokens 
WHERE provider = 'WHOOP' 
  AND terra_user_id = 'terra_test_a527db40';
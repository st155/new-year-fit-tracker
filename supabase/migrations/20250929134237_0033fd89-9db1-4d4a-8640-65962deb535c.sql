-- Подтверждаем email для пользователя alex@livestudio.com
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  updated_at = NOW()
WHERE email = 'alex@livestudio.com';
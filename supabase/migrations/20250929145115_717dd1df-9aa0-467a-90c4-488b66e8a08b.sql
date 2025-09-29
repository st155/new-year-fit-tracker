-- Устанавливаем новый пароль для пользователя alex@livestudio.com
-- Используем crypt для хеширования пароля
UPDATE auth.users 
SET 
  encrypted_password = crypt('password123', gen_salt('bf')),
  updated_at = NOW()
WHERE email = 'alex@livestudio.com';
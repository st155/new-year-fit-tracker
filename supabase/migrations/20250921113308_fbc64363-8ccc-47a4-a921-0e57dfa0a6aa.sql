-- Включаем защиту от утечки паролей в настройках Supabase Auth
-- Эта настройка активирует проверку паролей на предмет их компрометации
UPDATE auth.config 
SET leaked_password_protection = true
WHERE leaked_password_protection = false;
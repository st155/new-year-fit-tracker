-- Добавляем foreign key для trainer_clients только если не существует
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'trainer_clients_client_id_fkey'
        AND table_name = 'trainer_clients'
    ) THEN
        ALTER TABLE public.trainer_clients 
        ADD CONSTRAINT trainer_clients_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Добавляем foreign key для trainer_posts только если не существует
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'trainer_posts_trainer_id_fkey'
        AND table_name = 'trainer_posts'
    ) THEN
        ALTER TABLE public.trainer_posts 
        ADD CONSTRAINT trainer_posts_trainer_id_fkey 
        FOREIGN KEY (trainer_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
    END IF;
END $$;
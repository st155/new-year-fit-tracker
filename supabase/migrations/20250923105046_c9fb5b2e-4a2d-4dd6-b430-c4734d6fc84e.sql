-- Добавляем foreign key для trainer_clients
ALTER TABLE public.trainer_clients 
ADD CONSTRAINT trainer_clients_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Добавляем foreign key для challenge_participants  
ALTER TABLE public.challenge_participants 
ADD CONSTRAINT challenge_participants_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Добавляем foreign key для trainer_posts
ALTER TABLE public.trainer_posts 
ADD CONSTRAINT trainer_posts_trainer_id_fkey 
FOREIGN KEY (trainer_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
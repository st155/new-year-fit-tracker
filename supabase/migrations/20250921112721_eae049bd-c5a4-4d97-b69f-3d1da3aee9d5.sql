-- Добавляем участников челленджа в базу данных
-- Сначала создаем профили участников

DO $$
DECLARE
    challenge_uuid uuid;
    user_uuid uuid;
BEGIN
    -- Получаем ID первого активного челленджа для добавления участников
    SELECT id INTO challenge_uuid FROM public.challenges WHERE is_active = true LIMIT 1;
    
    -- Sergey Tokarev (онлайн)
    user_uuid := gen_random_uuid();
    INSERT INTO public.profiles (id, user_id, username, full_name, trainer_role, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'sergey_tokarev', 'Sergey Tokarev', false, now());
    
    INSERT INTO public.challenge_participants (user_id, challenge_id)
    VALUES (user_uuid, challenge_uuid);
    
    -- Pavel Radaev
    user_uuid := gen_random_uuid();
    INSERT INTO public.profiles (id, user_id, username, full_name, trainer_role, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'pavel_radaev', 'Pavel Radaev', false, now());
    
    INSERT INTO public.challenge_participants (user_id, challenge_id)
    VALUES (user_uuid, challenge_uuid);
    
    -- Anton Feoktistov
    user_uuid := gen_random_uuid();
    INSERT INTO public.profiles (id, user_id, username, full_name, trainer_role, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'anton_feoktistov', 'Anton Feoktistov', false, now());
    
    INSERT INTO public.challenge_participants (user_id, challenge_id)
    VALUES (user_uuid, challenge_uuid);
    
    -- Artem Sokolov
    user_uuid := gen_random_uuid();
    INSERT INTO public.profiles (id, user_id, username, full_name, trainer_role, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'artem_sokolov', 'Artem Sokolov', false, now());
    
    INSERT INTO public.challenge_participants (user_id, challenge_id)
    VALUES (user_uuid, challenge_uuid);
    
    -- A B
    user_uuid := gen_random_uuid();
    INSERT INTO public.profiles (id, user_id, username, full_name, trainer_role, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'a_b', 'A B', false, now());
    
    INSERT INTO public.challenge_participants (user_id, challenge_id)
    VALUES (user_uuid, challenge_uuid);
    
    -- Gurskiy Yura
    user_uuid := gen_random_uuid();
    INSERT INTO public.profiles (id, user_id, username, full_name, trainer_role, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'gurskiy_yura', 'Gurskiy Yura', false, now());
    
    INSERT INTO public.challenge_participants (user_id, challenge_id)
    VALUES (user_uuid, challenge_uuid);
    
    -- Gena Molchanov
    user_uuid := gen_random_uuid();
    INSERT INTO public.profiles (id, user_id, username, full_name, trainer_role, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'gena_molchanov', 'Gena Molchanov', false, now());
    
    INSERT INTO public.challenge_participants (user_id, challenge_id)
    VALUES (user_uuid, challenge_uuid);
    
    -- Aleksejs Sjarki
    user_uuid := gen_random_uuid();
    INSERT INTO public.profiles (id, user_id, username, full_name, trainer_role, created_at)
    VALUES (gen_random_uuid(), user_uuid, 'aleksejs_sjarki', 'Aleksejs Sjarki', false, now());
    
    INSERT INTO public.challenge_participants (user_id, challenge_id)
    VALUES (user_uuid, challenge_uuid);
    
END $$;
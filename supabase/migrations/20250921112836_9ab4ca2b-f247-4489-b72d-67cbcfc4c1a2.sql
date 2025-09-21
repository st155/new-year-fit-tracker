-- Добавляем тестовые измерения для демонстрации лидерборда
-- Создаем дополнительные моковые данные с именами участников

DO $$
DECLARE
    current_user_id uuid;
    fitness_challenge_id uuid;
    weight_goal_id uuid;
    current_date date := CURRENT_DATE;
    participants text[] := ARRAY['Sergey Tokarev', 'Pavel Radaev', 'Anton Feoktistov', 'Artem Sokolov', 'A B', 'Gurskiy Yura', 'Gena Molchanov', 'Aleksejs Sjarki'];
    i integer;
    weight_loss numeric;
    random_progress numeric;
BEGIN
    -- Получаем существующего пользователя и челлендж
    SELECT user_id INTO current_user_id FROM profiles LIMIT 1;
    SELECT id INTO fitness_challenge_id FROM challenges WHERE title = 'Фитнес к Новому Году 2025' LIMIT 1;
    SELECT id INTO weight_goal_id FROM goals WHERE goal_type = 'weight_loss' AND challenge_id = fitness_challenge_id LIMIT 1;
    
    -- Добавляем разнообразные измерения для текущего пользователя
    INSERT INTO measurements (user_id, goal_id, value, unit, notes, measurement_date)
    VALUES 
        (current_user_id, weight_goal_id, 82.5, 'кг', 'Начальный вес', current_date - INTERVAL '30 days'),
        (current_user_id, weight_goal_id, 81.8, 'кг', 'Неделя 1 - хороший старт!', current_date - INTERVAL '23 days'),
        (current_user_id, weight_goal_id, 81.2, 'кг', 'Неделя 2 - продолжаю диету', current_date - INTERVAL '16 days'),
        (current_user_id, weight_goal_id, 80.7, 'кг', 'Неделя 3 - добавил кардио', current_date - INTERVAL '9 days'),
        (current_user_id, weight_goal_id, 80.1, 'кг', 'Неделя 4 - отличный прогресс!', current_date - INTERVAL '2 days');
    
    -- Обновляем имя текущего пользователя на первого участника из списка
    UPDATE profiles 
    SET full_name = participants[1], username = 'sergey_tokarev'
    WHERE user_id = current_user_id;
    
    -- Добавляем композицию тела для текущего пользователя
    INSERT INTO body_composition (user_id, weight, body_fat_percentage, muscle_mass, measurement_date, measurement_method)
    VALUES 
        (current_user_id, 82.5, 18.5, 65.2, current_date - INTERVAL '30 days', 'Биоимпедансометрия'),
        (current_user_id, 80.1, 16.8, 65.8, current_date - INTERVAL '2 days', 'Биоимпедансометрия');
    
END $$;
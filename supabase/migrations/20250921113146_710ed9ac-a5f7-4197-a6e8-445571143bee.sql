-- Обновляем текущий вес пользователя
DO $$
DECLARE
    current_user_id uuid;
    weight_goal_id uuid;
BEGIN
    -- Получаем ID пользователя
    SELECT user_id INTO current_user_id FROM profiles WHERE username = 'sergey_tokarev' LIMIT 1;
    
    -- Получаем ID цели по снижению веса
    SELECT g.id INTO weight_goal_id 
    FROM goals g 
    JOIN challenges c ON g.challenge_id = c.id 
    WHERE g.goal_type = 'weight_loss' 
    AND c.title = 'Фитнес к Новому Году 2025' 
    LIMIT 1;
    
    -- Добавляем новое измерение с актуальным весом
    INSERT INTO measurements (user_id, goal_id, value, unit, notes, measurement_date)
    VALUES (current_user_id, weight_goal_id, 74.2, 'кг', 'Актуальный вес - отличный прогресс!', CURRENT_DATE);
    
    -- Обновляем композицию тела
    INSERT INTO body_composition (user_id, weight, body_fat_percentage, muscle_mass, measurement_date, measurement_method)
    VALUES (current_user_id, 74.2, 14.5, 62.8, CURRENT_DATE, 'Актуальные измерения');
    
END $$;
-- Добавляем персональные цели пользователя для челленджа "Фитнес к Новому Году 2025"
DO $$
DECLARE
    current_user_id uuid;
    challenge_id_var uuid;
BEGIN
    -- Получаем ID пользователя
    SELECT user_id INTO current_user_id FROM profiles WHERE username = 'sergey_tokarev' LIMIT 1;
    
    -- Получаем ID челленджа
    SELECT id INTO challenge_id_var FROM challenges WHERE title = 'Фитнес к Новому Году 2025' LIMIT 1;
    
    -- Добавляем все цели пользователя
    INSERT INTO goals (user_id, challenge_id, goal_name, goal_type, target_value, target_unit, is_personal) VALUES
    (current_user_id, challenge_id_var, 'Гребля 2 км', 'cardio', 8.5, 'минуты', true),
    (current_user_id, challenge_id_var, 'Бег 1 км', 'cardio', 4.0, 'минуты', true),
    (current_user_id, challenge_id_var, 'Подтягивания', 'strength', 17, 'повторений', true),
    (current_user_id, challenge_id_var, 'Жим лёжа', 'strength', 90, 'кг', true),
    (current_user_id, challenge_id_var, 'Выпады назад со штангой', 'strength', 50, 'кг х8', true),
    (current_user_id, challenge_id_var, 'Планка', 'endurance', 4.0, 'минуты', true),
    (current_user_id, challenge_id_var, 'Отжимания', 'strength', 60, 'повторений', true),
    (current_user_id, challenge_id_var, 'Подъём ног в висе', 'strength', 17, 'повторений', true),
    (current_user_id, challenge_id_var, 'VO₂max', 'cardio', 50, 'мл/кг/мин', true),
    (current_user_id, challenge_id_var, 'Процент жира', 'body_composition', 11, '%', true);
    
END $$;
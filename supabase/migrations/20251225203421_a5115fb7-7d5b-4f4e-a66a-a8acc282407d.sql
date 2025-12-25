
-- Fix Anton's goals and add initial measurements
-- Anton's user_id: f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e
-- Challenge ID: bc06cd3f-4832-4f49-bb0c-d622ca27c9aa

-- 1. Update target values for existing goals
UPDATE goals SET target_value = 3.5 WHERE id = 'ea1c7958-1b18-441f-8a97-d6cc803da37b'; -- Бег 1 км: 4.0 → 3.5
UPDATE goals SET target_value = 25 WHERE id = 'ac67b1e2-3687-417c-bb05-fff79c284f0e'; -- Подтягивания: 17 → 25
UPDATE goals SET target_value = 105 WHERE id = '152b8ccf-4636-4d48-8066-a2fed80b5a56'; -- Жим лёжа: 90 → 105
UPDATE goals SET target_value = 60 WHERE id = 'dba8f40c-ddcd-4047-8fbc-72d979fa2bf8'; -- Выпады назад: 50 → 60
UPDATE goals SET target_value = 7 WHERE id = 'eb73b247-006a-46ed-b14e-a1f8f0979acd'; -- Планка: 4 → 7
UPDATE goals SET target_value = 70 WHERE id = 'b8d95544-202b-47d5-ad23-3ba94ba6a0d1'; -- Отжимания: 60 → 70
UPDATE goals SET target_value = 22 WHERE id = '5d91e56d-d354-4e34-952b-a7070a344b5d'; -- Подъём ног: 17 → 22
UPDATE goals SET target_value = 53 WHERE id = '52b57f17-841b-45cc-bbbe-4df56d642eec'; -- VO₂max: 50 → 53
UPDATE goals SET target_value = 10 WHERE id = '619ad9e3-8fac-43c0-9042-0ec2d6cf3c27'; -- Процент жира: 11 → 10

-- 2. Add new goal: Гребля 2 км (7:30 target = 7.5 min)
INSERT INTO goals (id, user_id, challenge_id, goal_name, goal_type, target_value, target_unit, is_personal)
VALUES (
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e',
  'bc06cd3f-4832-4f49-bb0c-d622ca27c9aa',
  'Гребля 2 км',
  'cardio',
  7.5,
  'мин',
  false
) ON CONFLICT (id) DO NOTHING;

-- 3. Add baselines for all 10 goals
INSERT INTO goal_baselines (user_id, goal_id, baseline_value, source, recorded_at) VALUES
('f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 7.67, 'manual', '2025-10-02'),
('f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', 'ea1c7958-1b18-441f-8a97-d6cc803da37b', 3.92, 'manual', '2025-10-02'),
('f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', 'ac67b1e2-3687-417c-bb05-fff79c284f0e', 20, 'manual', '2025-10-02'),
('f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', '152b8ccf-4636-4d48-8066-a2fed80b5a56', 105, 'manual', '2025-10-02'),
('f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', 'dba8f40c-ddcd-4047-8fbc-72d979fa2bf8', 60, 'manual', '2025-10-02'),
('f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', 'eb73b247-006a-46ed-b14e-a1f8f0979acd', 3, 'manual', '2025-10-02'),
('f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', 'b8d95544-202b-47d5-ad23-3ba94ba6a0d1', 50, 'manual', '2025-10-02'),
('f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', '5d91e56d-d354-4e34-952b-a7070a344b5d', 15, 'manual', '2025-10-02'),
('f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', '52b57f17-841b-45cc-bbbe-4df56d642eec', 51, 'manual', '2025-10-02'),
('f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', '619ad9e3-8fac-43c0-9042-0ec2d6cf3c27', 10.5, 'manual', '2025-10-02')
ON CONFLICT DO NOTHING;

-- 4. Add initial measurements with unit field
INSERT INTO measurements (user_id, goal_id, value, unit, measurement_date, source) VALUES
('f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 7.67, 'мин', '2025-10-02', 'manual'),
('f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', 'ea1c7958-1b18-441f-8a97-d6cc803da37b', 3.92, 'мин', '2025-10-02', 'manual'),
('f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', 'ac67b1e2-3687-417c-bb05-fff79c284f0e', 20, 'раз', '2025-10-02', 'manual'),
('f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', '152b8ccf-4636-4d48-8066-a2fed80b5a56', 105, 'кг', '2025-10-02', 'manual'),
('f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', 'dba8f40c-ddcd-4047-8fbc-72d979fa2bf8', 60, 'кг', '2025-10-02', 'manual'),
('f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', 'eb73b247-006a-46ed-b14e-a1f8f0979acd', 3, 'мин', '2025-10-02', 'manual'),
('f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', 'b8d95544-202b-47d5-ad23-3ba94ba6a0d1', 50, 'раз', '2025-10-02', 'manual'),
('f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', '5d91e56d-d354-4e34-952b-a7070a344b5d', 15, 'раз', '2025-10-02', 'manual'),
('f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', '52b57f17-841b-45cc-bbbe-4df56d642eec', 51, 'мл/кг/мин', '2025-10-02', 'manual'),
('f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', '619ad9e3-8fac-43c0-9042-0ec2d6cf3c27', 10.5, '%', '2025-10-02', 'manual');

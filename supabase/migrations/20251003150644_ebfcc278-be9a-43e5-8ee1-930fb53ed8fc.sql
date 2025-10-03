
-- Привязываем Aleksandar B к тренеру Anton
INSERT INTO trainer_clients (trainer_id, client_id, active)
VALUES ('f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', '4742da16-f8a4-4767-ae17-32a82146997e', true)
ON CONFLICT (trainer_id, client_id) DO UPDATE 
SET active = true, assigned_at = now();

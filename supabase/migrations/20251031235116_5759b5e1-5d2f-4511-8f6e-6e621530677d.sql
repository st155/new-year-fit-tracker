-- Link Anton to Six Pack Challenge
INSERT INTO challenge_trainers (challenge_id, trainer_id, role)
VALUES (
  'bc06cd3f-4832-4f49-bb0c-d622ca27c9aa', -- Six Pack Challenge ID
  'f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', -- Anton's user_id
  'owner'
)
ON CONFLICT (challenge_id, trainer_id) DO NOTHING;
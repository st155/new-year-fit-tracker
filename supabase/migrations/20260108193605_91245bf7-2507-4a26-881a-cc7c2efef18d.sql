-- Add admin role for st@roosh.vc (system architect)
INSERT INTO user_roles (user_id, role, assigned_by)
VALUES (
  'a527db40-3f7f-448f-8782-da632711e818', 
  'admin', 
  'a527db40-3f7f-448f-8782-da632711e818'
)
ON CONFLICT (user_id, role) DO NOTHING;
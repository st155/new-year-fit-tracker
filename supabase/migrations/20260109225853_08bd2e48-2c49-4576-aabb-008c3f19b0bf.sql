INSERT INTO dashboard_widgets (user_id, metric_name, position, is_visible, display_mode)
VALUES ('f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', 'Day Strain', 1, true, 'multi')
ON CONFLICT DO NOTHING;
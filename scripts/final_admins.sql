INSERT INTO admin_users (id, email, name, role, password_hash) 
VALUES (gen_random_uuid(), 'lara@saladasoul.com', 'Lara', 'super_admin', '$2b$12$UOUklwBaT5F5U3N9Z87XPO.qP7MLP9wyLrP7PTDgjxr79q58dpPyy') 
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'super_admin';

INSERT INTO admin_users (id, email, name, role, password_hash) 
VALUES (gen_random_uuid(), 'henrique@saladasoul.com', 'Henrique', 'super_admin', '$2b$12$GLW3iY0MlfeJh7Ol0pjGcuNHyiF45AIITBzU5rPImSjHYMkoByak6') 
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'super_admin';

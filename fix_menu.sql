INSERT INTO menus (name, description, active) VALUES ('Menu Principal', 'Cardápio Completo', true);
UPDATE categories SET menu_id = (SELECT id FROM menus LIMIT 1);

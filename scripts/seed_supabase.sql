-- Seed data for Salada Soul - PostgreSQL/Supabase
-- Run this in Supabase SQL Editor

-- Clear existing data (optional - remove if you want to keep existing)
-- DELETE FROM product_complements;
-- DELETE FROM complements;
-- DELETE FROM products;
-- DELETE FROM categories;
-- DELETE FROM menus;

-- Insert Menusa
INSERT INTO menus (id, name, description, "order", active, created_at) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Cardápio Principal', 'Nosso cardápio completo com saladas, lanches e bebidas', 0, true, NOW()),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Promoções', 'Itens em promoção especial', 1, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert Categories for Cardápio Principal
INSERT INTO categories (id, name, description, icon, menu_id, "order", active, created_at) VALUES
('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Monte sua Salada', 'Escolha seus ingredientes favoritos. Base: R$ 28,50', 'salad', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 0, true, NOW()),
('d4e5f6a7-b8c9-0123-defa-234567890123', 'Saladas Prontas', 'Combinações especiais da casa', 'bowl', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 1, true, NOW()),
('e5f6a7b8-c9d0-1234-efab-345678901234', 'Lanches Frios', 'Sanduíches saudáveis e saborosos', 'sandwich', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2, true, NOW()),
('f6a7b8c9-d0e1-2345-fabc-456789012345', 'Bebidas', 'Sucos naturais e refrigerantes', 'drink', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 3, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert Complements for "Monte sua Salada"
INSERT INTO complements (id, name, price, description, category, active, created_at) VALUES
('11111111-2222-3333-4444-555555555551', 'Mix de folhas', 5.00, 'Base de folhas variadas', 'base_folhas', true, NOW()),
('11111111-2222-3333-4444-555555555552', 'Alface americana', 3.00, 'Alface crocante', 'base_folhas', true, NOW()),
('11111111-2222-3333-4444-555555555553', 'Rúcula', 3.00, 'Folhas de rúcula', 'base_folhas', true, NOW()),
('11111111-2222-3333-4444-555555555554', 'Frango grelhado', 9.00, 'Frango desfiado temperado', 'proteina', true, NOW()),
('11111111-2222-3333-4444-555555555555', 'Atum', 8.50, 'Atum em pedaços', 'proteina', true, NOW()),
('11111111-2222-3333-4444-555555555556', 'Cenoura ralada', 2.50, 'Cenoura fresca ralada', 'legumes', true, NOW()),
('11111111-2222-3333-4444-555555555557', 'Tomate cereja', 3.00, 'Tomates cereja cortados', 'legumes', true, NOW()),
('11111111-2222-3333-4444-555555555558', 'Milho verde', 2.50, 'Milho doce', 'legumes', true, NOW()),
('11111111-2222-3333-4444-555555555559', 'Uva passa', 2.00, 'Uvas passas doces', 'frutas', true, NOW()),
('11111111-2222-3333-4444-55555555555a', 'Maçã verde', 3.00, 'Maçã verde em cubos', 'frutas', true, NOW()),
('11111111-2222-3333-4444-55555555555b', 'Castanha de caju', 4.00, 'Castanhas torradas', 'extras', true, NOW()),
('11111111-2222-3333-4444-55555555555c', 'Granola', 3.50, 'Granola crocante', 'extras', true, NOW()),
('11111111-2222-3333-4444-55555555555d', 'Molho especial', 0.00, 'Nosso molho da casa', 'molhos', true, NOW()),
('11111111-2222-3333-4444-55555555555e', 'Azeite e limão', 0.00, 'Azeite extra virgem com limão', 'molhos', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert Sample Products
INSERT INTO products (id, name, description, price, category_id, image_url, stock, tags, active, "order", created_at) VALUES
('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee1', 'Salada Caesar', 'Alface romana, frango grelhado, croutons e molho caesar', 32.90, 'd4e5f6a7-b8c9-0123-defa-234567890123', '/uploads/caesar.jpg', -1, ARRAY['mais_pedido'], true, 0, NOW()),
('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee2', 'Salada Tropical', 'Mix de folhas, frango, manga, castanhas e molho especial', 35.50, 'd4e5f6a7-b8c9-0123-defa-234567890123', '/uploads/tropical.jpg', -1, ARRAY['recomendado'], true, 1, NOW()),
('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee3', 'Wrap de Frango', 'Frango grelhado, alface, tomate e molho especial no wrap integral', 24.90, 'e5f6a7b8-c9d0-1234-efab-345678901234', '/uploads/wrap.jpg', -1, ARRAY['leve'], true, 0, NOW()),
('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee4', 'Suco de Laranja', 'Suco natural de laranja 300ml', 8.00, 'f6a7b8c9-d0e1-2345-fabc-456789012345', '/uploads/suco-laranja.jpg', -1, ARRAY[]::text[], true, 0, NOW()),
('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee5', 'Água de Coco', 'Água de coco natural 330ml', 6.50, 'f6a7b8c9-d0e1-2345-fabc-456789012345', '/uploads/agua-coco.jpg', -1, ARRAY[]::text[], true, 1, NOW())
ON CONFLICT (id) DO NOTHING;

-- Verify data was inserted
SELECT 'Menus:' as info, COUNT(*) as count FROM menus
UNION ALL
SELECT 'Categories:', COUNT(*) FROM categories
UNION ALL
SELECT 'Complements:', COUNT(*) FROM complements
UNION ALL
SELECT 'Products:', COUNT(*) FROM products;

-- ============================================
-- ADMIN USERS (Email/Password only - No Google)
-- ============================================
-- Passwords are bcrypt hashed
-- Lara: Lara@Salada2026!
-- Henrique: Henrique@Salada2026!

INSERT INTO admin_users (id, email, name, role, password_hash, created_at) VALUES
('admin-lara-001', 'lara@saladasoul.com', 'Lara Admin', 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', NOW()),
('admin-henrique-001', 'henrique@saladasoul.com', 'Henrique Admin', 'admin', '$2b$12$X9v3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6H', NOW())
ON CONFLICT (id) DO UPDATE SET 
    password_hash = EXCLUDED.password_hash,
    email = EXCLUDED.email;

SELECT 'Admin users:' as info, COUNT(*) as count FROM admin_users;

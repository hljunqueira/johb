-- ============================================
-- SALADA SOUL - Seed do Cardápio Real
-- Execute no SQL Editor do Supabase
-- ============================================

-- Limpar dados existentes (ordem de dependência)
TRUNCATE TABLE product_complements CASCADE;
TRUNCATE TABLE complements CASCADE;
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE categories CASCADE;
TRUNCATE TABLE menus CASCADE;
TRUNCATE TABLE complement_categories CASCADE;

-- ============================================
-- 1. MENUS
-- ============================================

INSERT INTO menus (id, name, description, "order", active) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Monte sua Salada', 'Ingredientes frescos, preparados na hora e com muito sabor. Valor base: R$ 28,50', 1, true),
  ('11111111-0000-0000-0000-000000000002', 'Saladas Prontas', 'Combinações especiais que não podem ser alteradas', 2, true),
  ('11111111-0000-0000-0000-000000000003', 'Lanches Frios', 'Sanduíches artesanais frescos', 3, true),
  ('11111111-0000-0000-0000-000000000004', 'Bebidas', 'Bebidas geladas', 4, true);

-- ============================================
-- 2. CATEGORIAS
-- ============================================

-- Categorias do "Monte sua Salada"
INSERT INTO categories (id, name, description, icon, menu_id, "order", active) VALUES
  ('22222222-0000-0000-0000-000000000001', 'Base de Folhas', 'Escolha sua base', '🌿', '11111111-0000-0000-0000-000000000001', 1, true),
  ('22222222-0000-0000-0000-000000000002', 'Proteína', 'Escolha sua proteína', '🍗', '11111111-0000-0000-0000-000000000001', 2, true),
  ('22222222-0000-0000-0000-000000000003', 'Legumes & Verduras', 'Escolha até 3 opções', '🥕', '11111111-0000-0000-0000-000000000001', 3, true),
  ('22222222-0000-0000-0000-000000000004', 'Frutas', 'Escolha sua fruta', '🍓', '11111111-0000-0000-0000-000000000001', 4, true),
  ('22222222-0000-0000-0000-000000000005', 'Extras & Crocância', 'Finalize com crocância', '🌰', '11111111-0000-0000-0000-000000000001', 5, true),
  ('22222222-0000-0000-0000-000000000006', 'Molhos & Cremes', 'Escolha até 3 opções', '🥗', '11111111-0000-0000-0000-000000000001', 6, true),
  ('22222222-0000-0000-0000-000000000007', 'Temperos', 'Escolha até 3 opções', '🧂', '11111111-0000-0000-0000-000000000001', 7, true),
  -- Categorias das Saladas Prontas
  ('22222222-0000-0000-0000-000000000008', 'Saladas Prontas', 'Não podem ser alteradas', '🥗', '11111111-0000-0000-0000-000000000002', 1, true),
  -- Categorias dos Lanches
  ('22222222-0000-0000-0000-000000000009', 'Sanduíches', 'Lanches frios artesanais', '🥪', '11111111-0000-0000-0000-000000000003', 1, true),
  -- Categorias das Bebidas
  ('22222222-0000-0000-0000-000000000010', 'Bebidas', 'Bebidas geladas', '🥤', '11111111-0000-0000-0000-000000000004', 1, true);

-- ============================================
-- 3. COMPLEMENT CATEGORIES (para o Monte sua Salada)
-- ============================================

INSERT INTO complement_categories (id, key, name, icon, "order", required, min_select, max_select, active) VALUES
  ('33333333-0000-0000-0000-000000000001', 'base_folhas', 'Base de Folhas', '🌿', 1, true, 1, 1, true),
  ('33333333-0000-0000-0000-000000000002', 'proteina', 'Proteína', '🍗', 2, true, 1, 1, true),
  ('33333333-0000-0000-0000-000000000003', 'legumes_verduras', 'Legumes & Verduras', '🥕', 3, false, 0, 3, true),
  ('33333333-0000-0000-0000-000000000004', 'frutas', 'Frutas', '🍓', 4, false, 0, 1, true),
  ('33333333-0000-0000-0000-000000000005', 'extras_crocancia', 'Extras & Crocância', '🌰', 5, false, 0, 2, true),
  ('33333333-0000-0000-0000-000000000006', 'molhos_cremes', 'Molhos & Cremes', '🥗', 6, false, 0, 3, true),
  ('33333333-0000-0000-0000-000000000007', 'temperos', 'Temperos', '🧂', 7, false, 0, 3, true),
  ('33333333-0000-0000-0000-000000000008', 'adicionais_extras', 'Adicionais Extras', '➕', 8, false, 0, 5, true);

-- ============================================
-- 4. COMPLEMENTS (adicionais individuais)
-- ============================================

-- Base de Folhas
INSERT INTO complements (id, name, price, category, active) VALUES
  ('44444444-0001-0000-0000-000000000001', 'Mix de folhas', 5.00, 'base_folhas', true),
  ('44444444-0001-0000-0000-000000000002', 'Alface americana', 3.00, 'base_folhas', true),
  ('44444444-0001-0000-0000-000000000003', 'Rúcula', 3.00, 'base_folhas', true),
  ('44444444-0001-0000-0000-000000000004', 'Repolho roxo', 3.00, 'base_folhas', true);

-- Proteína
INSERT INTO complements (id, name, price, category, active) VALUES
  ('44444444-0002-0000-0000-000000000001', 'Frango', 9.00, 'proteina', true),
  ('44444444-0002-0000-0000-000000000002', 'Atum', 8.50, 'proteina', true),
  ('44444444-0002-0000-0000-000000000003', 'Carne moída (patinho)', 9.00, 'proteina', true),
  ('44444444-0002-0000-0000-000000000004', 'Carne em cubos (patinho)', 9.00, 'proteina', true);

-- Legumes & Verduras
INSERT INTO complements (id, name, price, category, active) VALUES
  ('44444444-0003-0000-0000-000000000001', 'Cenoura', 3.00, 'legumes_verduras', true),
  ('44444444-0003-0000-0000-000000000002', 'Tomate', 2.50, 'legumes_verduras', true),
  ('44444444-0003-0000-0000-000000000003', 'Tomate cereja', 3.50, 'legumes_verduras', true),
  ('44444444-0003-0000-0000-000000000004', 'Pepino', 3.00, 'legumes_verduras', true),
  ('44444444-0003-0000-0000-000000000005', 'Beterraba', 3.50, 'legumes_verduras', true),
  ('44444444-0003-0000-0000-000000000006', 'Cebola roxa', 2.50, 'legumes_verduras', true),
  ('44444444-0003-0000-0000-000000000007', 'Salsa', 2.00, 'legumes_verduras', true);

-- Frutas
INSERT INTO complements (id, name, price, category, active) VALUES
  ('44444444-0004-0000-0000-000000000001', 'Manga', 3.50, 'frutas', true),
  ('44444444-0004-0000-0000-000000000002', 'Maçã', 3.00, 'frutas', true),
  ('44444444-0004-0000-0000-000000000003', 'Morango', 4.00, 'frutas', true);

-- Extras & Crocância
INSERT INTO complements (id, name, price, category, active) VALUES
  ('44444444-0005-0000-0000-000000000001', 'Batata palha', 3.50, 'extras_crocancia', true),
  ('44444444-0005-0000-0000-000000000002', 'Croutons', 4.50, 'extras_crocancia', true),
  ('44444444-0005-0000-0000-000000000003', 'Queijo parmesão', 3.00, 'extras_crocancia', true),
  ('44444444-0005-0000-0000-000000000004', 'Castanha do Pará', 8.00, 'extras_crocancia', true),
  ('44444444-0005-0000-0000-000000000005', 'Amêndoas laminadas', 6.00, 'extras_crocancia', true);

-- Molhos & Cremes
INSERT INTO complements (id, name, price, category, active) VALUES
  ('44444444-0006-0000-0000-000000000001', 'Creme de abacate', 5.00, 'molhos_cremes', true),
  ('44444444-0006-0000-0000-000000000002', 'Molho verde', 5.00, 'molhos_cremes', true),
  ('44444444-0006-0000-0000-000000000003', 'Molho especial tipo MC', 5.00, 'molhos_cremes', true),
  ('44444444-0006-0000-0000-000000000004', 'Mostarda e mel', 5.00, 'molhos_cremes', true);

-- Temperos
INSERT INTO complements (id, name, price, category, active) VALUES
  ('44444444-0007-0000-0000-000000000001', 'Azeite', 2.00, 'temperos', true),
  ('44444444-0007-0000-0000-000000000002', 'Sal', 0.00, 'temperos', true),
  ('44444444-0007-0000-0000-000000000003', 'Orégano', 1.00, 'temperos', true);

-- ============================================
-- 5. PRODUCTS
-- ============================================

-- Produto configurável: Monte sua Salada
INSERT INTO products (id, name, description, price, category_id, "order", active, tags) VALUES
  (
    '55555555-0001-0000-0000-000000000001',
    'Monte sua Salada',
    'Monte do seu jeito! Valor base inclui 1 base de folhas + 1 proteína. Adicione legumes, frutas, extras, molhos e temperos à vontade.',
    28.50,
    '22222222-0000-0000-0000-000000000001',
    1,
    true,
    ARRAY['personalizado', 'saudavel', 'destaque']::TEXT[]
  );

-- Saladas Prontas
INSERT INTO products (id, name, description, price, category_id, "order", active, tags) VALUES
  (
    '55555555-0002-0000-0000-000000000001',
    'Salada Harmonia 🌸',
    'Mix de folhas, Frango, Cenoura + Milho + Tomate, Manga, Queijo. Não pode ser alterada.',
    35.50,
    '22222222-0000-0000-0000-000000000008',
    1,
    true,
    ARRAY['pronta', 'saudavel']::TEXT[]
  ),
  (
    '55555555-0002-0000-0000-000000000002',
    'Salada Aura Verde 🌿',
    'Mix de folhas, Frango, Tomate cereja + Pepino + Beterraba, Maçã, Croutons, Molho da casa. Não pode ser alterada.',
    35.50,
    '22222222-0000-0000-0000-000000000008',
    2,
    true,
    ARRAY['pronta', 'saudavel']::TEXT[]
  ),
  (
    '55555555-0002-0000-0000-000000000003',
    'Salada Essência 🍃',
    'Mix de folhas, Atum, Cenoura + Cebola roxa + Milho, Maçã, Croutons, Molho especial. Não pode ser alterada.',
    35.90,
    '22222222-0000-0000-0000-000000000008',
    3,
    true,
    ARRAY['pronta', 'saudavel']::TEXT[]
  ),
  (
    '55555555-0002-0000-0000-000000000004',
    'Salada Zen 🧘',
    'Mix de folhas, Patinho moído, Cenoura + Brócolis + Beterraba, Morango, Batata palha, Mostarda e mel. Não pode ser alterada.',
    37.50,
    '22222222-0000-0000-0000-000000000008',
    4,
    true,
    ARRAY['pronta', 'saudavel', 'destaque']::TEXT[]
  ),
  (
    '55555555-0002-0000-0000-000000000005',
    'Salada Prana 💚',
    'Mix de folhas, Carne em cubos, Tomate cereja + Cenoura + Brócolis, Manga, Castanha de caju, Mostarda e mel. Não pode ser alterada.',
    38.50,
    '22222222-0000-0000-0000-000000000008',
    5,
    true,
    ARRAY['pronta', 'saudavel', 'destaque']::TEXT[]
  );

-- Lanches Frios
INSERT INTO products (id, name, description, price, category_id, "order", active, tags) VALUES
  (
    '55555555-0003-0000-0000-000000000001',
    'Sanduíche Alma Verde 🌿',
    'Pão integral, Patê artesanal de frango 70g, Cenoura, Alface.',
    26.90,
    '22222222-0000-0000-0000-000000000009',
    1,
    true,
    ARRAY['lanche', 'saudavel']::TEXT[]
  ),
  (
    '55555555-0003-0000-0000-000000000002',
    'Sanduíche Brisa do Mar 🌊',
    'Pão integral, Patê artesanal de atum 40g, sem óleo, Cenoura, Alface.',
    25.90,
    '22222222-0000-0000-0000-000000000009',
    2,
    true,
    ARRAY['lanche', 'saudavel']::TEXT[]
  );

-- Bebidas
INSERT INTO products (id, name, description, price, category_id, "order", active, tags) VALUES
  (
    '55555555-0004-0000-0000-000000000001',
    'Guaraná Antarctica Zero 269ml',
    'Guaraná Antarctica Zero gelado',
    5.90,
    '22222222-0000-0000-0000-000000000010',
    1,
    true,
    ARRAY['bebida']::TEXT[]
  ),
  (
    '55555555-0004-0000-0000-000000000002',
    'Coca-Cola Zero 250ml',
    'Coca-Cola Zero gelada',
    5.90,
    '22222222-0000-0000-0000-000000000010',
    2,
    true,
    ARRAY['bebida']::TEXT[]
  ),
  (
    '55555555-0004-0000-0000-000000000003',
    'Suco de laranja 500ml',
    'Suco de laranja natural',
    7.50,
    '22222222-0000-0000-0000-000000000010',
    3,
    true,
    ARRAY['bebida', 'natural']::TEXT[]
  ),
  (
    '55555555-0004-0000-0000-000000000004',
    'Água com gás 500ml',
    'Água mineral com gás',
    5.00,
    '22222222-0000-0000-0000-000000000010',
    4,
    true,
    ARRAY['bebida']::TEXT[]
  ),
  (
    '55555555-0004-0000-0000-000000000005',
    'Água mineral sem gás 500ml',
    'Água mineral sem gás',
    5.00,
    '22222222-0000-0000-0000-000000000010',
    5,
    true,
    ARRAY['bebida']::TEXT[]
  );

-- ============================================
-- 6. ATUALIZAR PRODUTO "MONTE SUA SALADA" COM ADDITIONALS
-- Os complementos ficam no campo additionals (JSONB) do produto
-- Formato: [{name, price, category, required, min_select, max_select}]
-- ============================================

UPDATE products
SET additionals = '[
  {"name": "Mix de folhas",        "price": 5.00, "category": "base_folhas", "required": true,  "min_select": 1, "max_select": 1},
  {"name": "Alface americana",     "price": 3.00, "category": "base_folhas", "required": true,  "min_select": 1, "max_select": 1},
  {"name": "R\u00facula",            "price": 3.00, "category": "base_folhas", "required": true,  "min_select": 1, "max_select": 1},
  {"name": "Repolho roxo",         "price": 3.00, "category": "base_folhas", "required": true,  "min_select": 1, "max_select": 1},

  {"name": "Frango",              "price": 9.00, "category": "proteina", "required": true,  "min_select": 1, "max_select": 1},
  {"name": "Atum",                "price": 8.50, "category": "proteina", "required": true,  "min_select": 1, "max_select": 1},
  {"name": "Carne mo\u00edda (patinho)",  "price": 9.00, "category": "proteina", "required": true,  "min_select": 1, "max_select": 1},
  {"name": "Carne em cubos (patinho)","price": 9.00, "category": "proteina", "required": true,  "min_select": 1, "max_select": 1},

  {"name": "Cenoura",             "price": 3.00, "category": "legumes", "required": false, "min_select": 0, "max_select": 3},
  {"name": "Tomate",              "price": 2.50, "category": "legumes", "required": false, "min_select": 0, "max_select": 3},
  {"name": "Tomate cereja",       "price": 3.50, "category": "legumes", "required": false, "min_select": 0, "max_select": 3},
  {"name": "Pepino",              "price": 3.00, "category": "legumes", "required": false, "min_select": 0, "max_select": 3},
  {"name": "Beterraba",           "price": 3.50, "category": "legumes", "required": false, "min_select": 0, "max_select": 3},
  {"name": "Cebola roxa",         "price": 2.50, "category": "legumes", "required": false, "min_select": 0, "max_select": 3},
  {"name": "Salsa",               "price": 2.00, "category": "legumes", "required": false, "min_select": 0, "max_select": 3},

  {"name": "Manga",              "price": 3.50, "category": "frutas", "required": false, "min_select": 0, "max_select": 1},
  {"name": "Ma\u00e7\u00e3",                "price": 3.00, "category": "frutas", "required": false, "min_select": 0, "max_select": 1},
  {"name": "Morango",             "price": 4.00, "category": "frutas", "required": false, "min_select": 0, "max_select": 1},

  {"name": "Batata palha",        "price": 3.50, "category": "extras", "required": false, "min_select": 0, "max_select": 2},
  {"name": "Croutons",            "price": 4.50, "category": "extras", "required": false, "min_select": 0, "max_select": 2},
  {"name": "Queijo parmesão",    "price": 3.00, "category": "extras", "required": false, "min_select": 0, "max_select": 2},
  {"name": "Castanha do Par\u00e1",   "price": 8.00, "category": "extras", "required": false, "min_select": 0, "max_select": 2},
  {"name": "Am\u00eandoas laminadas",  "price": 6.00, "category": "extras", "required": false, "min_select": 0, "max_select": 2},

  {"name": "Creme de abacate",    "price": 5.00, "category": "molhos", "required": false, "min_select": 0, "max_select": 3},
  {"name": "Molho verde",         "price": 5.00, "category": "molhos", "required": false, "min_select": 0, "max_select": 3},
  {"name": "Molho especial tipo MC","price": 5.00, "category": "molhos", "required": false, "min_select": 0, "max_select": 3},
  {"name": "Mostarda e mel",      "price": 5.00, "category": "molhos", "required": false, "min_select": 0, "max_select": 3},

  {"name": "Azeite",              "price": 2.00, "category": "temperos", "required": false, "min_select": 0, "max_select": 3},
  {"name": "Sal",                 "price": 0.00, "category": "temperos", "required": false, "min_select": 0, "max_select": 3},
  {"name": "Or\u00e9gano",            "price": 1.00, "category": "temperos", "required": false, "min_select": 0, "max_select": 3}
]'::jsonb
WHERE id = '55555555-0001-0000-0000-000000000001';

-- ============================================
-- 7. CONTADOR DE PEDIDOS
-- ============================================

INSERT INTO counters (name, value) VALUES ('order_number', 0)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- VERIFICAÇÃO
-- ============================================

SELECT 'menus' as tabela, COUNT(*) as registros FROM menus
UNION ALL SELECT 'categories', COUNT(*) FROM categories
UNION ALL SELECT 'complements', COUNT(*) FROM complements
UNION ALL SELECT 'complement_categories', COUNT(*) FROM complement_categories
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'product_complements', COUNT(*) FROM product_complements;

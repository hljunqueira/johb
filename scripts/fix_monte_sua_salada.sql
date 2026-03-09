-- ============================================================
-- FIX: Corrige estrutura do menu "Monte sua Salada"
-- Cole no SQL Editor do Supabase e execute
-- ============================================================

-- 1. Remover as categorias erradas do menu "Monte sua Salada"
--    (Base de Folhas, Proteína, Legumes, etc. não são categorias do menu,
--     são grupos de complementos dentro do produto)
DELETE FROM products
WHERE category_id IN (
  SELECT id FROM categories
  WHERE menu_id = '11111111-0000-0000-0000-000000000001'
    AND id != '22222222-0000-0000-0000-000000000099'
);

DELETE FROM categories
WHERE menu_id = '11111111-0000-0000-0000-000000000001';

-- 2. Criar UMA única categoria para o menu "Monte sua Salada"
INSERT INTO categories (id, name, description, icon, menu_id, "order", active)
VALUES (
  '22222222-0000-0000-0000-000000000099',
  'Monte sua Salada',
  'Monte do seu jeito com ingredientes frescos',
  '🥗',
  '11111111-0000-0000-0000-000000000001',
  1,
  true
)
ON CONFLICT (id) DO NOTHING;

-- 3. Recriar o produto "Monte sua Salada" nessa categoria
INSERT INTO products (id, name, description, price, category_id, tags, additionals, stock, active, "order")
VALUES (
  '55555555-0001-0000-0000-000000000001',
  'Monte sua Salada',
  'Monte do seu jeito! Escolha sua base, proteína, legumes, frutas, extras, molho e temperos.',
  0.00,
  '22222222-0000-0000-0000-000000000099',
  ARRAY[]::text[],
  '[]'::jsonb,
  -1,
  true,
  1
)
ON CONFLICT (id) DO UPDATE SET
  category_id = '22222222-0000-0000-0000-000000000099',
  price = 0.00,
  tags = ARRAY[]::text[];

-- 4. Zerar o campo additionals para reescrever logo abaixo
UPDATE products
SET additionals = '[]'::jsonb
WHERE name ILIKE '%monte%salada%';

-- 2. Confirmar qual é o ID do produto (para conferência)
-- SELECT id, name, price FROM products WHERE name ILIKE '%monte%salada%';

-- 5. Popular o campo additionals com todos os complementos
UPDATE products
SET
  price      = 0.00,
  tags       = ARRAY[]::text[],
  additionals = '[
    {"name": "Mix de folhas",            "price": 5.00, "category": "base_folhas", "required": false, "min_select": 1, "max_select": 2},
    {"name": "Alface americana",         "price": 3.00, "category": "base_folhas", "required": false, "min_select": 0, "max_select": 2},
    {"name": "Rúcula",                   "price": 3.00, "category": "base_folhas", "required": false, "min_select": 0, "max_select": 2},
    {"name": "Repolho roxo",             "price": 3.00, "category": "base_folhas", "required": false, "min_select": 0, "max_select": 2},

    {"name": "Frango",                   "price": 9.00, "category": "proteina", "required": true,  "min_select": 1, "max_select": 1},
    {"name": "Atum",                     "price": 8.50, "category": "proteina", "required": true,  "min_select": 1, "max_select": 1},
    {"name": "Carne moída (patinho)",    "price": 9.00, "category": "proteina", "required": true,  "min_select": 1, "max_select": 1},
    {"name": "Carne em cubos (patinho)", "price": 9.00, "category": "proteina", "required": true,  "min_select": 1, "max_select": 1},
    {"name": "Ovo cozido",              "price": 3.50, "category": "proteina", "required": false, "min_select": 0, "max_select": 3},

    {"name": "Cenoura",      "price": 3.00, "category": "legumes", "required": false, "min_select": 0, "max_select": 3},
    {"name": "Tomate",       "price": 2.50, "category": "legumes", "required": false, "min_select": 0, "max_select": 3},
    {"name": "Tomate cereja","price": 3.50, "category": "legumes", "required": false, "min_select": 0, "max_select": 3},
    {"name": "Pepino",       "price": 3.00, "category": "legumes", "required": false, "min_select": 0, "max_select": 3},
    {"name": "Beterraba",    "price": 3.50, "category": "legumes", "required": false, "min_select": 0, "max_select": 3},
    {"name": "Cebola roxa",  "price": 2.50, "category": "legumes", "required": false, "min_select": 0, "max_select": 3},
    {"name": "Salsa",        "price": 2.00, "category": "legumes", "required": false, "min_select": 0, "max_select": 3},
    {"name": "Cebolinha",    "price": 2.00, "category": "legumes", "required": false, "min_select": 0, "max_select": 3},
    {"name": "Brócolis",     "price": 4.00, "category": "legumes", "required": false, "min_select": 0, "max_select": 3},

    {"name": "Manga",   "price": 3.50, "category": "frutas", "required": true,  "min_select": 1, "max_select": 1},
    {"name": "Maçã",    "price": 3.00, "category": "frutas", "required": true,  "min_select": 1, "max_select": 1},
    {"name": "Morango", "price": 4.00, "category": "frutas", "required": true,  "min_select": 1, "max_select": 1},
    {"name": "Abacate", "price": 3.00, "category": "frutas", "required": false, "min_select": 0, "max_select": 3},

    {"name": "Batata palha",       "price": 3.50, "category": "extras", "required": false, "min_select": 0, "max_select": 1},
    {"name": "Castanha de caju",   "price": 8.00, "category": "extras", "required": false, "min_select": 0, "max_select": 1},
    {"name": "Castanha do Pará",   "price": 8.00, "category": "extras", "required": false, "min_select": 0, "max_select": 1},
    {"name": "Amêndoas laminadas", "price": 6.00, "category": "extras", "required": false, "min_select": 0, "max_select": 1},
    {"name": "Queijo parmesão",    "price": 3.00, "category": "extras", "required": false, "min_select": 0, "max_select": 1},
    {"name": "Croutons",           "price": 4.50, "category": "extras", "required": false, "min_select": 0, "max_select": 1},
    {"name": "Gergelim",           "price": 2.00, "category": "extras", "required": false, "min_select": 0, "max_select": 3},

    {"name": "Creme de abacate",       "price": 5.00, "category": "molhos", "required": true, "min_select": 1, "max_select": 1},
    {"name": "Molho verde fit",        "price": 5.00, "category": "molhos", "required": true, "min_select": 1, "max_select": 1},
    {"name": "Molho especial tipo MC", "price": 5.00, "category": "molhos", "required": true, "min_select": 1, "max_select": 1},
    {"name": "Mostarda e mel",         "price": 5.00, "category": "molhos", "required": true, "min_select": 1, "max_select": 1},

    {"name": "Azeite",  "price": 2.00, "category": "temperos", "required": false, "min_select": 0, "max_select": 3},
    {"name": "Sal",     "price": 0.00, "category": "temperos", "required": false, "min_select": 0, "max_select": 3},
    {"name": "Orégano", "price": 1.00, "category": "temperos", "required": false, "min_select": 0, "max_select": 3}
  ]'::jsonb
WHERE name ILIKE '%monte%salada%';

-- 6. Verificar resultado
SELECT id, name, price, tags, jsonb_array_length(additionals) AS total_complementos
FROM products
WHERE name ILIKE '%monte%salada%';

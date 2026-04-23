-- 1. Criar a categoria única para o menu "Monte sua Salada"
INSERT INTO categories (id, name, description, icon, menu_id, "order", active) 
VALUES ('22222222-9999-0000-0000-000000000000', 'Monte sua Salada', 'Crie sua combinação perfeita', '🥗', '11111111-0000-0000-0000-000000000001', 0, true)
ON CONFLICT (id) DO NOTHING;

-- 2. Mover o produto "Monte sua Salada" para esta nova categoria
UPDATE products 
SET category_id = '22222222-9999-0000-0000-000000000000'
WHERE id = '55555555-0001-0000-0000-000000000001';

-- 3. Desativar as categorias "etapa" para que não apareçam no menu superior
-- Mantemos elas no banco para referência dos complementos, mas elas não serão listadas como abas
UPDATE categories 
SET active = false 
WHERE id IN (
  '22222222-0000-0000-0000-000000000001', -- Base de Folhas
  '22222222-0000-0000-0000-000000000002', -- Proteína
  '22222222-0000-0000-0000-000000000003', -- Legumes & Verduras
  '22222222-0000-0000-0000-000000000004', -- Frutas
  '22222222-0000-0000-0000-000000000005', -- Extras & Crocância
  '22222222-0000-0000-0000-000000000006', -- Molhos & Cremes
  '22222222-0000-0000-0000-000000000007'  -- Temperos
);

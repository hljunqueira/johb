-- ============================================
-- MIGRATION: Restruturar Hierarquia Menu → Categorias → Produtos
-- ============================================

-- 1. Adicionar menu_id na tabela categories
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS menu_id UUID REFERENCES menus(id) ON DELETE SET NULL;

-- 2. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_categories_menu_id ON categories(menu_id);

-- 3. Migrar dados existentes: extrair category_ids de menus e popular menu_id em categories
-- Para cada menu, atualizar as categorias referenciadas
DO $$
DECLARE
    menu_record RECORD;
    category_id UUID;
BEGIN
    -- Percorrer todos os menus
    FOR menu_record IN SELECT id, category_ids FROM menus WHERE category_ids IS NOT NULL LOOP
        -- Para cada categoria no array do menu, atualizar o menu_id
        FOREACH category_id IN ARRAY menu_record.category_ids LOOP
            UPDATE categories 
            SET menu_id = menu_record.id 
            WHERE id = category_id AND menu_id IS NULL;
        END LOOP;
    END LOOP;
END $$;

-- 4. Remover category_ids de menus (não mais necessário)
-- ALTER TABLE menus DROP COLUMN IF EXISTS category_ids;
-- Comentado para preservar dados durante transição

-- 5. Criar tabela de relacionamento produto-complemento (opcional, mais flexível)
-- Se quiser normalizar complement_ids em products
CREATE TABLE IF NOT EXISTS product_complements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    complement_id UUID REFERENCES complements(id) ON DELETE CASCADE,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, complement_id)
);

-- 6. Criar índice para product_complements
CREATE INDEX IF NOT EXISTS idx_product_complements_product ON product_complements(product_id);

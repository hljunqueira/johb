-- ============================================
-- MIGRATION: Adicionar ícones em menus e fotos/opcional em complementos
-- ============================================

-- 1. Adicionar campo icon em menus
ALTER TABLE menus 
ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT NULL;

-- 2. Adicionar campos em complements
ALTER TABLE complements 
ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS min_select INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_select INTEGER DEFAULT 1;

-- 3. Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_complements_required ON complements(required);

-- 4. Atualizar complementos existentes com valores padrão
UPDATE complements SET 
    max_select = 1,
    min_select = 0,
    required = FALSE
WHERE max_select IS NULL;

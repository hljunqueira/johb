-- Migration: Adicionar campos de obrigatoriedade às categorias de complemento
-- Permite definir se uma categoria é obrigatória e quantos itens devem ser selecionados

ALTER TABLE complement_categories 
ADD COLUMN IF NOT EXISTS required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS min_select INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_select INTEGER DEFAULT 1;

-- Atualizar categorias existentes para ter valores padrão
UPDATE complement_categories SET required = FALSE WHERE required IS NULL;
UPDATE complement_categories SET min_select = 0 WHERE min_select IS NULL;
UPDATE complement_categories SET max_select = 1 WHERE max_select IS NULL;

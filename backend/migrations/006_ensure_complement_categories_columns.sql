-- Migration: Garantir que todas as colunas necessárias existam em complement_categories
-- Adiciona colunas que podem estar faltando

-- Adicionar colunas se não existirem
ALTER TABLE complement_categories 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS min_select INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_select INTEGER DEFAULT 1;

-- Atualizar registros existentes que podem ter NULL
UPDATE complement_categories SET order_index = 0 WHERE order_index IS NULL;
UPDATE complement_categories SET required = FALSE WHERE required IS NULL;
UPDATE complement_categories SET min_select = 0 WHERE min_select IS NULL;
UPDATE complement_categories SET max_select = 1 WHERE max_select IS NULL;

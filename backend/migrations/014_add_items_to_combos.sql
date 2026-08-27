-- Adicionar coluna items à tabela combos se não existir
ALTER TABLE combos ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

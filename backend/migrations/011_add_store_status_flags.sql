-- Migration: Adicionar flags de status da loja (sempre aberta / fechamento temporário)
ALTER TABLE delivery_settings 
ADD COLUMN IF NOT EXISTS always_open BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS temporarily_closed BOOLEAN DEFAULT FALSE;

-- Atualizar registro existente com valores padrão
UPDATE delivery_settings 
SET always_open = FALSE, 
    temporarily_closed = FALSE 
WHERE id = 1;

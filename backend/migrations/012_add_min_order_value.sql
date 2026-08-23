-- Migration: Adicionar min_order_value na tabela delivery_settings
ALTER TABLE delivery_settings ADD COLUMN IF NOT EXISTS min_order_value NUMERIC(10,2) DEFAULT 0.0;
UPDATE menus SET description = 'Salgados fritos, assados artesanais e folhados.' WHERE id = 'a1b2c3d4-e5f6-7890-abcd-111111111111';

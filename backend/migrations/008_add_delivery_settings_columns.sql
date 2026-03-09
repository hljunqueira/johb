-- Migration: Adicionar colunas à tabela delivery_settings
-- Colunas para áreas de entrega, taxas e configurações

ALTER TABLE delivery_settings 
ADD COLUMN IF NOT EXISTS areas JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS min_free_delivery NUMERIC(10,2) DEFAULT 60.0,
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Inserir registro padrão se não existir
INSERT INTO delivery_settings (id, areas, delivery_fee, min_free_delivery, active, business_hours)
VALUES (
    1, 
    '[]', 
    5.0, 
    60.0, 
    true,
    '{"seg":{"open":true,"start":"11:00","end":"22:00"},"ter":{"open":true,"start":"11:00","end":"22:00"},"qua":{"open":true,"start":"11:00","end":"22:00"},"qui":{"open":true,"start":"11:00","end":"22:00"},"sex":{"open":true,"start":"11:00","end":"22:00"},"sab":{"open":false,"start":"11:00","end":"22:00"},"dom":{"open":false,"start":"11:00","end":"22:00"}}'
)
ON CONFLICT (id) DO UPDATE SET
    areas = EXCLUDED.areas,
    delivery_fee = EXCLUDED.delivery_fee,
    min_free_delivery = EXCLUDED.min_free_delivery,
    active = EXCLUDED.active;

-- ============================================
-- MIGRATION MÍNIMA E NÃO DESTRUTIVA PARA ASAAS
-- Adiciona colunas necessárias na tabela `orders` se não existirem
-- (Sem DEFAULT NOW() em payment_created_at conforme diretiva de auditoria)
-- ============================================

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT,
ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,
ADD COLUMN IF NOT EXISTS payment_url TEXT,
ADD COLUMN IF NOT EXISTS payment_created_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP WITH TIME ZONE;

-- Índice para buscas rápidas pelo ID de pagamento do Asaas
CREATE INDEX IF NOT EXISTS idx_orders_asaas_payment_id ON orders(asaas_payment_id);

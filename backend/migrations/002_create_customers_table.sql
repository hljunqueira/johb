-- ============================================
-- MIGRATION: Criar tabela de clientes (login opcional)
-- ============================================

-- 0. Dropar tabela se existir (para recriação limpa)
DROP TABLE IF EXISTS customers;

-- 1. Criar tabela customers
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    neighborhood VARCHAR(100),
    favorites JSONB DEFAULT '[]',
    order_count INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    last_order_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- 3. Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Migrar dados existentes de orders para customers
-- Cria registros de clientes baseados nos pedidos anteriores
INSERT INTO customers (phone, name, address, neighborhood, order_count, last_order_at)
SELECT 
    customer_phone,
    MAX(customer_name) as name,
    MAX(address) as address,
    MAX(neighborhood) as neighborhood,
    COUNT(*) as order_count,
    MAX(created_at) as last_order_at
FROM orders
WHERE customer_phone IS NOT NULL AND customer_phone != ''
GROUP BY customer_phone
ON CONFLICT (phone) DO UPDATE SET
    name = EXCLUDED.name,
    address = COALESCE(customers.address, EXCLUDED.address),
    neighborhood = COALESCE(customers.neighborhood, EXCLUDED.neighborhood),
    order_count = EXCLUDED.order_count,
    last_order_at = EXCLUDED.last_order_at,
    updated_at = NOW();

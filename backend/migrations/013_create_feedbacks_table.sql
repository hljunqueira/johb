-- Migration: Criar tabela feedbacks e migrar avaliações de orders
CREATE TABLE IF NOT EXISTS feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    rating_comment TEXT NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO feedbacks (customer_name, customer_phone, rating, rating_comment, order_id, created_at)
SELECT 
    COALESCE(customer_name, 'Cliente'),
    customer_phone,
    rating,
    COALESCE(rating_comment, 'Ótimo atendimento e produtos saborosos!'),
    id,
    COALESCE(created_at, NOW())
FROM orders 
WHERE rating IS NOT NULL AND rating > 0
AND id NOT IN (SELECT order_id FROM feedbacks WHERE order_id IS NOT NULL);

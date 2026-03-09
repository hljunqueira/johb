-- Migration: Criar tabela pix_settings com todas as colunas necessárias
-- Tabela para configurações de pagamento Pix

CREATE TABLE IF NOT EXISTS pix_settings (
    id SERIAL PRIMARY KEY,
    pix_key VARCHAR(255) DEFAULT '',
    pix_name VARCHAR(255) DEFAULT 'Salada Soul',
    qr_code_url TEXT DEFAULT '',
    pix_key_type VARCHAR(50) DEFAULT 'cpf',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserir registro padrão se não existir
INSERT INTO pix_settings (id, pix_key, pix_name, qr_code_url, pix_key_type)
VALUES (1, '', 'Salada Soul', '', 'cpf')
ON CONFLICT (id) DO NOTHING;

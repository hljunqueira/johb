-- Migration: Criar tabela para categorias de complemento
-- Permite criar/editar categorias dinamicamente no admin

CREATE TABLE IF NOT EXISTS complement_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(50) UNIQUE NOT NULL, -- identificador único (ex: frutas, extras)
    name VARCHAR(100) NOT NULL,      -- nome exibido (ex: Frutas, Extras & Crocância)
    icon VARCHAR(10) DEFAULT '',     -- emoji ou ícone opcional
    order_index INTEGER DEFAULT 0,   -- ordem de exibição
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir categorias padrão
INSERT INTO complement_categories (key, name, icon, order_index) VALUES
    ('base_folhas', 'Base de Folhas', '🥬', 0),
    ('proteina', 'Proteína', '🍗', 1),
    ('legumes', 'Legumes & Verduras', '🥕', 2),
    ('frutas', 'Frutas', '🍓', 3),
    ('extras', 'Extras & Crocância', '🥜', 4),
    ('molhos', 'Molhos & Cremes', '🥣', 5),
    ('temperos', 'Temperos', '🧂', 6)
ON CONFLICT (key) DO NOTHING;

-- Atualizar tabela complements para usar a categoria
-- A coluna category já existe, agora referencia a tabela complement_categories

-- ============================================
-- SALADA SOUL - Supabase Database Schema
-- Execute este SQL no Editor do Supabase (SQL Editor > New Query)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Menus (tabela base - criar primeiro)
CREATE TABLE IF NOT EXISTS menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    "order" INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories (vinculadas a um Menu)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    menu_id UUID REFERENCES menus(id) ON DELETE SET NULL,
    "order" INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Complements (Adicionais/Opcionais)
CREATE TABLE IF NOT EXISTS complements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    image_url TEXT,
    stock INTEGER DEFAULT -1,
    tags TEXT[],
    additionals JSONB DEFAULT '[]',
    complement_ids UUID[] DEFAULT '{}',
    "order" INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Relacionamento Produto-Complemento
CREATE TABLE IF NOT EXISTS product_complements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    complement_id UUID REFERENCES complements(id) ON DELETE CASCADE,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, complement_id)
);

-- Admin Users
CREATE TABLE IF NOT EXISTS admin_users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    password_hash VARCHAR(255),
    picture TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
    session_token VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES admin_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL UNIQUE,
    address TEXT,
    orders_count INTEGER DEFAULT 0,
    last_order_date TIMESTAMP WITH TIME ZONE,
    internal_note TEXT,
    tags TEXT[] DEFAULT '{novo}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number INTEGER NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    delivery_type VARCHAR(50) NOT NULL,
    address TEXT,
    neighborhood VARCHAR(255),
    items JSONB NOT NULL DEFAULT '[]',
    subtotal DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'aguardando',
    payment_status VARCHAR(50) DEFAULT 'pendente',
    observation TEXT,
    rating INTEGER,
    rating_comment TEXT,
    estimated_time INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Delivery Settings
CREATE TABLE IF NOT EXISTS delivery_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    areas JSONB DEFAULT '[]',
    delivery_fee DECIMAL(10,2) DEFAULT 5.0,
    min_free_delivery DECIMAL(10,2) DEFAULT 50.0,
    active BOOLEAN DEFAULT TRUE
);

-- PIX Settings
CREATE TABLE IF NOT EXISTS pix_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    pix_key VARCHAR(255) DEFAULT '',
    pix_name VARCHAR(255) DEFAULT 'Salada Soul',
    qr_code_url TEXT DEFAULT ''
);

-- Counters
CREATE TABLE IF NOT EXISTS counters (
    name VARCHAR(50) PRIMARY KEY,
    value INTEGER DEFAULT 0
);

-- Banners
CREATE TABLE IF NOT EXISTS banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(500),
    image_url TEXT,
    cta_text VARCHAR(100) DEFAULT 'Ver mais',
    cta_link VARCHAR(255) DEFAULT '#',
    active BOOLEAN DEFAULT TRUE,
    "order" INTEGER DEFAULT 0,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Combos
CREATE TABLE IF NOT EXISTS combos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    discount_percent INTEGER DEFAULT 0,
    items JSONB DEFAULT '[]'::jsonb,
    active BOOLEAN DEFAULT TRUE,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Combo Items
CREATE TABLE IF NOT EXISTS combo_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    combo_id UUID REFERENCES combos(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    quantity INTEGER DEFAULT 1,
    allow_choices BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Complement Categories (para produtos configuráveis)
CREATE TABLE IF NOT EXISTS complement_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(100),
    "order" INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    required BOOLEAN DEFAULT FALSE,
    min_select INTEGER DEFAULT 0,
    max_select INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_categories_menu_id ON categories(menu_id);
CREATE INDEX IF NOT EXISTS idx_product_complements_product ON product_complements(product_id);

-- ============================================
-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_banners_updated_at ON banners;
CREATE TRIGGER update_banners_updated_at
    BEFORE UPDATE ON banners
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_combos_updated_at ON combos;
CREATE TRIGGER update_combos_updated_at
    BEFORE UPDATE ON combos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA
-- ============================================

-- Admin user (password: admin123)
INSERT INTO admin_users (id, email, name, role, password_hash)
VALUES (
    'admin_' || substr(md5(random()::text), 1, 12),
    'admin@saladasoul.com',
    'Admin',
    'admin',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G'
)
ON CONFLICT (email) DO NOTHING;

-- Counter for order numbers
INSERT INTO counters (name, value) VALUES ('order_number', 0)
ON CONFLICT (name) DO NOTHING;

-- Delivery settings
INSERT INTO delivery_settings (areas, delivery_fee, min_free_delivery, active)
VALUES (
    '[
        {"name": "Centro", "fee": 0},
        {"name": "Jardim America", "fee": 5.0},
        {"name": "Vila Nova", "fee": 7.0},
        {"name": "Bela Vista", "fee": 5.0},
        {"name": "Santa Cruz", "fee": 8.0}
    ]'::jsonb,
    5.0,
    60.0,
    TRUE
)
ON CONFLICT (id) DO NOTHING;

-- PIX settings
INSERT INTO pix_settings (pix_key, pix_name, qr_code_url)
VALUES ('', 'Salada Soul', '')
ON CONFLICT (id) DO NOTHING;

-- Menus
INSERT INTO menus (name, description, "order", active) VALUES
    ('Cardapio Principal', 'Nosso cardapio completo', 0, TRUE)
ON CONFLICT DO NOTHING;

-- Categories
INSERT INTO categories (name, description, icon, "order", active) VALUES
    ('Saladas', 'Frescas, crocantes e cheias de sabor', 'salad', 0, TRUE),
    ('Bowls', 'Nutritivos e equilibrados', 'bowl', 1, TRUE),
    ('Sucos', 'Naturais e refrescantes', 'juice', 2, TRUE),
    ('Sobremesas', 'Doces saudaveis para adocar seu dia', 'dessert', 3, TRUE)
ON CONFLICT DO NOTHING;

-- Complements
INSERT INTO complements (name, price, description, active) VALUES
    ('Proteina extra', 8.0, 'Frango, tofu ou ovo', TRUE),
    ('Frango grelhado', 10.0, 'Peito de frango grelhado', TRUE),
    ('Tofu grelhado', 7.0, 'Tofu organico grelhado', TRUE),
    ('Granola extra', 4.0, 'Granola artesanal crocante', TRUE),
    ('Granola', 3.0, 'Granola artesanal', TRUE),
    ('Abacate', 5.0, 'Fatias de abacate fresco', TRUE),
    ('Ovo cozido', 4.0, 'Ovo cozido cortado', TRUE),
    ('Queijo feta', 6.0, 'Queijo feta em cubos', TRUE),
    ('Molho tahini', 3.0, 'Molho tahini caseiro', TRUE),
    ('Castanhas', 5.0, 'Mix de castanhas', TRUE)
ON CONFLICT DO NOTHING;

-- Complement Categories
INSERT INTO complement_categories (key, name, icon, "order", active, required, min_select, max_select) VALUES
    ('base', 'Base de Folhas', 'leaf', 0, TRUE, TRUE, 1, 2),
    ('proteina', 'Proteina', 'meat', 1, TRUE, FALSE, 0, 2),
    ('vegetais', 'Vegetais', 'carrot', 2, TRUE, FALSE, 0, 5),
    ('crocancia', 'Crocancia', 'nut', 3, TRUE, FALSE, 0, 3),
    ('frutas', 'Frutas', 'apple', 4, TRUE, FALSE, 0, 3),
    ('molhos', 'Molhos', 'droplet', 5, TRUE, TRUE, 1, 2),
    ('toppings', 'Toppings Especiais', 'star', 6, TRUE, FALSE, 0, 2)
ON CONFLICT (key) DO NOTHING;

-- Banners
INSERT INTO banners (title, subtitle, image_url, cta_text, cta_link, active, "order") VALUES
    ('Monte sua Salada', 'Escolha seus ingredientes favoritos e crie a salada perfeita', 'https://images.unsplash.com/photo-1547261434-a2ab96e6ae5c?w=800', 'Montar agora', '#', TRUE, 0),
    ('Combos Especiais', 'Economize ate 20% com nossos combos exclusivos', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800', 'Ver combos', '#', TRUE, 1)
ON CONFLICT DO NOTHING;

-- ============================================
-- PRODUTOS E RELACIONAMENTOS (via DO block)
-- ============================================
DO $$
DECLARE
    cat_saladas UUID;
    cat_bowls UUID;
    cat_sucos UUID;
    cat_sobremesas UUID;
    comp_proteina UUID;
    comp_frango UUID;
    comp_tofu UUID;
    comp_granola_extra UUID;
    comp_granola UUID;
    comp_abacate UUID;
    comp_ovo UUID;
    comp_queijo UUID;
    comp_molho UUID;
    comp_castanhas UUID;
BEGIN
    SELECT id INTO cat_saladas FROM categories WHERE name = 'Saladas';
    SELECT id INTO cat_bowls FROM categories WHERE name = 'Bowls';
    SELECT id INTO cat_sucos FROM categories WHERE name = 'Sucos';
    SELECT id INTO cat_sobremesas FROM categories WHERE name = 'Sobremesas';
    
    SELECT id INTO comp_proteina FROM complements WHERE name = 'Proteina extra';
    SELECT id INTO comp_frango FROM complements WHERE name = 'Frango grelhado';
    SELECT id INTO comp_tofu FROM complements WHERE name = 'Tofu grelhado';
    SELECT id INTO comp_granola_extra FROM complements WHERE name = 'Granola extra';
    SELECT id INTO comp_granola FROM complements WHERE name = 'Granola';
    SELECT id INTO comp_abacate FROM complements WHERE name = 'Abacate';
    SELECT id INTO comp_ovo FROM complements WHERE name = 'Ovo cozido';
    SELECT id INTO comp_queijo FROM complements WHERE name = 'Queijo feta';
    SELECT id INTO comp_molho FROM complements WHERE name = 'Molho tahini';
    SELECT id INTO comp_castanhas FROM complements WHERE name = 'Castanhas';

    -- Insert products
    INSERT INTO products (name, description, price, category_id, image_url, stock, tags, additionals, complement_ids, "order", active, created_at, updated_at) VALUES
        ('Deusa Verde', 'Couve, abacate, pepino, sementes de abobora, molho tahini', 42.90, cat_saladas, 'https://images.unsplash.com/photo-1689832832416-e9be9dc30c6b?w=400', -1, ARRAY['vegano', 'mais_pedido'], '[]'::jsonb, ARRAY[comp_proteina, comp_abacate, comp_castanhas], 0, TRUE, NOW(), NOW()),
        ('Caesar Classica', 'Alface romana, croutons, parmesao ralado, molho caesar caseiro', 36.00, cat_saladas, 'https://images.unsplash.com/photo-1547261434-a2ab96e6ae5c?w=400', -1, ARRAY['recomendado'], '[]'::jsonb, ARRAY[comp_frango, comp_ovo, comp_queijo], 1, TRUE, NOW(), NOW()),
        ('Mediterranean Mix', 'Tomate, pepino, azeitona kalamata, queijo feta, cebola roxa', 38.50, cat_saladas, 'https://images.pexels.com/photos/35241090/pexels-photo-35241090.jpeg?auto=compress&w=400', -1, ARRAY['vegano', 'leve'], '[]'::jsonb, ARRAY[comp_abacate, comp_molho], 2, TRUE, NOW(), NOW()),
        ('Buddha Bowl', 'Quinoa, grao de bico assado, abacate, batata doce, tahini', 48.50, cat_bowls, 'https://images.unsplash.com/photo-1642394079524-1d688c19c17a?w=400', -1, ARRAY['vegano', 'mais_pedido'], '[]'::jsonb, ARRAY[comp_tofu, comp_abacate, comp_castanhas], 0, TRUE, NOW(), NOW()),
        ('Acai Power', 'Acai, granola artesanal, banana, mel organico, frutas vermelhas', 32.00, cat_bowls, 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400', -1, ARRAY['recomendado'], '[]'::jsonb, ARRAY[comp_granola_extra, comp_granola], 1, TRUE, NOW(), NOW()),
        ('Detox Sunrise', 'Cenoura, maca verde, gengibre, limao', 18.00, cat_sucos, 'https://images.unsplash.com/photo-1717398804885-a6c22b3e5c2f?w=400', -1, ARRAY['leve', 'mais_pedido'], '[]'::jsonb, ARRAY[]::UUID[], 0, TRUE, NOW(), NOW()),
        ('Green Power', 'Couve, abacaxi, hortela, agua de coco', 16.00, cat_sucos, 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=400', -1, ARRAY['vegano', 'leve'], '[]'::jsonb, ARRAY[]::UUID[], 1, TRUE, NOW(), NOW()),
        ('Chia Pudding', 'Chia, leite de coco, frutas frescas, mel', 22.00, cat_sobremesas, 'https://images.unsplash.com/photo-1767429013015-8ea007ccf002?w=400', -1, ARRAY['vegano', 'leve'], '[]'::jsonb, ARRAY[comp_granola], 0, TRUE, NOW(), NOW()),
        ('Banana Nice Cream', 'Banana congelada, cacau, pasta de amendoim, coco ralado', 24.00, cat_sobremesas, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400', -1, ARRAY['vegano'], '[]'::jsonb, ARRAY[comp_granola, comp_castanhas], 1, TRUE, NOW(), NOW());
END $$;

-- ============================================
-- COMBOS
-- ============================================
DO $$
DECLARE
    combo1_id UUID;
    combo2_id UUID;
    cat_saladas UUID;
    cat_sucos UUID;
    cat_sobremesas UUID;
BEGIN
    SELECT id INTO cat_saladas FROM categories WHERE name = 'Saladas';
    SELECT id INTO cat_sucos FROM categories WHERE name = 'Sucos';
    SELECT id INTO cat_sobremesas FROM categories WHERE name = 'Sobremesas';

    -- Insert Combo 1: Salada + Suco
    INSERT INTO combos (name, description, image_url, base_price, discount_percent, active, "order")
    VALUES ('Combo Leve', '1 Salada + 1 Suco Natural. Perfeito para o almoco saudavel.', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', 55.00, 10, TRUE, 0)
    RETURNING id INTO combo1_id;

    -- Insert Combo 2: Salada + Suco + Sobremesa
    INSERT INTO combos (name, description, image_url, base_price, discount_percent, active, "order")
    VALUES ('Combo Completo', '1 Salada + 1 Suco + 1 Sobremesa. A refeicao completa!', 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400', 75.00, 15, TRUE, 1)
    RETURNING id INTO combo2_id;

    -- Insert combo items
    IF cat_saladas IS NOT NULL THEN
        INSERT INTO combo_items (combo_id, category_id, quantity, allow_choices) VALUES (combo1_id, cat_saladas, 1, TRUE);
        INSERT INTO combo_items (combo_id, category_id, quantity, allow_choices) VALUES (combo2_id, cat_saladas, 1, TRUE);
    END IF;
    
    IF cat_sucos IS NOT NULL THEN
        INSERT INTO combo_items (combo_id, category_id, quantity, allow_choices) VALUES (combo1_id, cat_sucos, 1, TRUE);
        INSERT INTO combo_items (combo_id, category_id, quantity, allow_choices) VALUES (combo2_id, cat_sucos, 1, TRUE);
    END IF;
    
    IF cat_sobremesas IS NOT NULL THEN
        INSERT INTO combo_items (combo_id, category_id, quantity, allow_choices) VALUES (combo2_id, cat_sobremesas, 1, TRUE);
    END IF;
END $$;

-- ============================================
-- FIM DO SCRIPT
-- ============================================

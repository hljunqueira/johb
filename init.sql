-- ============================================
-- SALADA SOUL - Database Initialization
-- PostgreSQL Schema (Fixed Order)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- 1. Admin Users
CREATE TABLE IF NOT EXISTS admin_users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    password_hash VARCHAR(255),
    picture TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Sessions (Depends on admin_users)
CREATE TABLE IF NOT EXISTS sessions (
    session_token VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES admin_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Menus
CREATE TABLE IF NOT EXISTS menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    "order" INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Categories (Depends on menus)
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

CREATE INDEX IF NOT EXISTS idx_categories_menu_id ON categories(menu_id);

-- 5. Complements
CREATE TABLE IF NOT EXISTS complements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Products (Depends on categories)
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

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);

-- 7. Product Complements (Depends on products, complements)
CREATE TABLE IF NOT EXISTS product_complements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    complement_id UUID REFERENCES complements(id) ON DELETE CASCADE,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, complement_id)
);

CREATE INDEX IF NOT EXISTS idx_product_complements_product ON product_complements(product_id);

-- 8. Customers
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

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- 9. Orders
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

CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

-- 10. Delivery Settings
CREATE TABLE IF NOT EXISTS delivery_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    restaurant_address TEXT,
    restaurant_lat DECIMAL(10,8),
    restaurant_lng DECIMAL(11,8),
    max_delivery_distance DECIMAL(10,2) DEFAULT 10.0,
    distance_rates JSONB DEFAULT '[]',
    areas JSONB DEFAULT '[]',
    delivery_fee DECIMAL(10,2) DEFAULT 5.0,
    min_free_delivery DECIMAL(10,2) DEFAULT 50.0,
    active BOOLEAN DEFAULT TRUE
);

-- 11. PIX Settings
CREATE TABLE IF NOT EXISTS pix_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    pix_key VARCHAR(255) DEFAULT '',
    pix_name VARCHAR(255) DEFAULT 'Salada Soul',
    qr_code_url TEXT DEFAULT ''
);

-- 12. Counters
CREATE TABLE IF NOT EXISTS counters (
    name VARCHAR(50) PRIMARY KEY,
    value INTEGER DEFAULT 0
);

-- 13. Banners
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

-- 14. Combos
CREATE TABLE IF NOT EXISTS combos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    discount_percent INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 15. Combo Items (Depends on combos, categories)
CREATE TABLE IF NOT EXISTS combo_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    combo_id UUID REFERENCES combos(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    quantity INTEGER DEFAULT 1,
    allow_choices BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_banners_updated_at
    BEFORE UPDATE ON banners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_combos_updated_at
    BEFORE UPDATE ON combos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA
-- ============================================

-- Admin user (password: admin123)
INSERT INTO admin_users (id, email, name, role, password_hash)
VALUES ('admin_primary', 'admin@saladasoul.com', 'Admin', 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G')
ON CONFLICT (email) DO NOTHING;

INSERT INTO counters (name, value) VALUES ('order_number', 0) ON CONFLICT (name) DO NOTHING;

INSERT INTO delivery_settings (id, delivery_fee, min_free_delivery, active)
VALUES (1, 5.0, 60.0, TRUE) ON CONFLICT (id) DO NOTHING;

INSERT INTO pix_settings (id, pix_key, pix_name)
VALUES (1, '', 'Salada Soul') ON CONFLICT (id) DO NOTHING;

-- Initial Categories & Products
DO $$
DECLARE
    cat_saladas UUID;
    cat_bowls UUID;
    cat_sucos UUID;
    cat_sobremesas UUID;
BEGIN
    INSERT INTO categories (name, description, icon, "order") 
    VALUES ('Saladas', 'Frescas e crocantes', 'salad', 0) RETURNING id INTO cat_saladas;
    
    INSERT INTO categories (name, description, icon, "order") 
    VALUES ('Bowls', 'Nutritivos', 'bowl', 1) RETURNING id INTO cat_bowls;
    
    INSERT INTO categories (name, description, icon, "order") 
    VALUES ('Sucos', 'Naturais', 'juice', 2) RETURNING id INTO cat_sucos;
    
    INSERT INTO categories (name, description, icon, "order") 
    VALUES ('Sobremesas', 'Saudáveis', 'dessert', 3) RETURNING id INTO cat_sobremesas;

    INSERT INTO products (name, description, price, category_id, image_url, tags) VALUES
    ('Deusa Verde', 'Couve, abacate, pepino', 42.90, cat_saladas, 'https://images.unsplash.com/photo-1689832832416-e9be9dc30c6b?w=400', ARRAY['vegano']),
    ('Caesar Clássica', 'Alface romana, croutons', 36.00, cat_saladas, 'https://images.unsplash.com/photo-1547261434-a2ab96e6ae5c?w=400', ARRAY['pop']),
    ('Buddha Bowl', 'Quinoa, grão de bico', 48.50, cat_bowls, 'https://images.unsplash.com/photo-1642394079524-1d688c19c17a?w=400', ARRAY['vegano']),
    ('Açaí Power', 'Açaí, granola, banana', 32.00, cat_bowls, 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400', ARRAY['pop']),
    ('Detox Sunrise', 'Cenoura, maçã, gengibre', 18.00, cat_sucos, 'https://images.unsplash.com/photo-1717398804885-a6c22b3e5c2f?w=400', ARRAY['leve']);
END $$;

INSERT INTO banners (title, subtitle, image_url, cta_text, "order") VALUES
('Monte sua Salada', 'Crie a salada perfeita', 'https://images.unsplash.com/photo-1547261434-a2ab96e6ae5c?w=800', 'Montar agora', 0);

-- ============================================
-- JOHB CAFÉ & SALGADOS — SEED DE DADOS OFICIAL COMPLETO
-- Executar este SQL no Supabase SQL Editor para popular o banco de dados real
-- ============================================

-- 1. Inserir / Atualizar Menu Principal JOHB
INSERT INTO menus (id, name, description, "order", active)
VALUES ('a1b2c3d4-e5f6-7890-abcd-111111111111', 'JOHB Café & Salgados', 'Menu Oficial de Salgados, Assados, Cucas e Bebidas em Balneário Arroio do Silva — SC', 0, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 2. Inserir Categorias Reais
INSERT INTO categories (id, name, description, menu_id, "order", active)
VALUES 
    ('c1111111-1111-1111-1111-111111111111', 'Salgados', 'Salgados fritos e assados artesanais quentinhos com recheios generosos.', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 0, true),
    ('c2222222-2222-2222-2222-222222222222', 'Assados', 'Folhados e assados dourados e crocantes saindo do forno.', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 1, true),
    ('c3333333-3333-3333-3333-333333333333', 'Doces / Cucas', 'Cucas tradicionais, bolos fofinhos e brownies artesanais.', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 2, true),
    ('c4444444-4444-4444-4444-444444444444', 'Combos', 'Combinações perfeitas de salgados + bebida para o seu momento.', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 3, true),
    ('c5555555-5555-5555-5555-555555555555', 'Congelados', 'Pacotes congelados para assar ou fritar em casa.', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 4, true),
    ('c6666666-6666-6666-6666-666666666666', 'Bebidas', 'Refrigerantes, sucos naturais e águas geladas.', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 5, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, menu_id = EXCLUDED.menu_id;

-- 3. Inserir Tabela de Complementos / Opcionais
INSERT INTO complements (id, name, price, description, category, active)
VALUES
    ('f1111111-1111-1111-1111-111111111111', 'Maionese Caseira Temperada', 2.50, 'Maionese verde artesanal da casa', 'molhos', true),
    ('f2222222-2222-2222-2222-222222222222', 'Molho de Pimenta Artesanal', 2.00, 'Picante na medida certa', 'molhos', true),
    ('f3333333-3333-3333-3333-333333333333', 'Catupiry Extra no Recheio', 3.50, 'Recheio ainda mais cremoso', 'adicionais', true),
    ('f4444444-4444-4444-4444-444444444444', 'Cheddar Cremoso Extra', 3.50, 'Cheddar derretido extra', 'adicionais', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;

-- 4. Inserir Produtos Reais JOHB com Opcionais / Complementos em JSONB
INSERT INTO products (id, name, description, price, category_id, image_url, tags, additionals, active, "order")
VALUES 
    -- Salgados
    (
        'p1010101-1111-1111-1111-111111111111', 
        'Coxinha Cremosa de Frango', 
        'Frango desfiado temperado na casa com recheio cremoso e casca crocante.', 
        9.90, 
        'c1111111-1111-1111-1111-111111111111', 
        'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80', 
        ARRAY['mais_pedido', 'personalizavel'], 
        '[
            {"name": "Maionese Caseira Temperada", "price": 2.50, "category": "molhos", "required": false, "min_select": 0, "max_select": 1},
            {"name": "Molho de Pimenta Artesanal", "price": 2.00, "category": "molhos", "required": false, "min_select": 0, "max_select": 1},
            {"name": "Catupiry Extra no Recheio", "price": 3.50, "category": "adicionais", "required": false, "min_select": 0, "max_select": 1}
        ]'::jsonb,
        true, 
        0
    ),
    (
        'p1010102-1111-1111-1111-111111111111', 
        'Empada de Palmito', 
        'Massa podra amanteigada que derrete na boca com recheio de palmito cremoso.', 
        10.90, 
        'c1111111-1111-1111-1111-111111111111', 
        'https://images.unsplash.com/photo-1541529086526-db283c563270?w=500&auto=format&fit=crop&q=80', 
        ARRAY['recomendado'], 
        '[]'::jsonb,
        true, 
        1
    ),
    (
        'p1010103-1111-1111-1111-111111111111', 
        'Esfiha Aberta de Carne', 
        'Massa leve e fofinha com carne bovina temperada com tomate e especiarias.', 
        8.90, 
        'c1111111-1111-1111-1111-111111111111', 
        'https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=500&auto=format&fit=crop&q=80', 
        ARRAY[]::text[], 
        '[]'::jsonb,
        true, 
        2
    ),
    (
        'p1010104-1111-1111-1111-111111111111', 
        'Pão de Queijo Canastra (6 un)', 
        'Porção de pães de queijo Canastra curado, crocantes por fora e macios por dentro.', 
        12.90, 
        'c1111111-1111-1111-1111-111111111111', 
        'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=500&auto=format&fit=crop&q=80', 
        ARRAY['recomendado'], 
        '[]'::jsonb,
        true, 
        3
    ),

    -- Assados
    (
        'p2020201-2222-2222-2222-222222222222', 
        'Folhado de Presunto e Queijo', 
        'Massa folhada amanteigada e dourada recheada com presunto e queijo derretido.', 
        10.50, 
        'c2222222-2222-2222-2222-222222222222', 
        'https://images.unsplash.com/photo-1541529086526-db283c563270?w=500&auto=format&fit=crop&q=80', 
        ARRAY['mais_pedido', 'personalizavel'], 
        '[
            {"name": "Maionese Caseira Temperada", "price": 2.50, "category": "molhos", "required": false, "min_select": 0, "max_select": 1}
        ]'::jsonb,
        true, 
        0
    ),
    (
        'p2020202-2222-2222-2222-222222222222', 
        'Enroladinho Assado de Salsicha', 
        'Massa assada fofinha com salsicha artesanal e toque de orégano.', 
        8.90, 
        'c2222222-2222-2222-2222-222222222222', 
        'https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=500&auto=format&fit=crop&q=80', 
        ARRAY[]::text[], 
        '[]'::jsonb,
        true, 
        1
    ),
    (
        'p2020203-2222-2222-2222-222222222222', 
        'Empadão de Frango com Requeijão', 
        'Fatia generosa de empadão amanteigado recheado com frango e requeijão.', 
        12.90, 
        'c2222222-2222-2222-2222-222222222222', 
        'https://images.unsplash.com/photo-1541529086526-db283c563270?w=500&auto=format&fit=crop&q=80', 
        ARRAY[]::text[], 
        '[]'::jsonb,
        true, 
        2
    ),

    -- Doces / Cucas
    (
        'p3030301-3333-3333-3333-333333333333', 
        'Fatia de Cuca Tradicional de Farofa', 
        'Cuca alemã artesanal com massa fofinha e generosa camada de farofa crocante.', 
        11.90, 
        'c3333333-3333-3333-3333-333333333333', 
        'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80', 
        ARRAY['mais_pedido'], 
        '[]'::jsonb,
        true, 
        0
    ),
    (
        'p3030302-3333-3333-3333-333333333333', 
        'Fatia de Bolo de Cenoura c/ Brigadeiro', 
        'Bolo fofinho de cenoura coberto com generosa camada de brigadeiro gourmet.', 
        12.90, 
        'c3333333-3333-3333-3333-333333333333', 
        'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80', 
        ARRAY[]::text[], 
        '[]'::jsonb,
        true, 
        1
    ),

    -- Combos com Escolha Obrigatória de Salgados e Bebidas
    (
        'p4040401-4444-4444-4444-444444444444', 
        'Combo JOHB Individual', 
        '2 Salgados à sua escolha + 1 Bebida 350ml geladinha.', 
        17.90, 
        'c4444444-4444-4444-4444-444444444444', 
        'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80', 
        ARRAY['mais_pedido', 'personalizavel'], 
        '[
            {"name": "Salgado 1: Coxinha Cremosa", "price": 0.00, "category": "sabor_salgado", "required": true, "min_select": 1, "max_select": 2},
            {"name": "Salgado 2: Empada de Palmito", "price": 0.00, "category": "sabor_salgado", "required": true, "min_select": 1, "max_select": 2},
            {"name": "Salgado 3: Folhado Presunto e Queijo", "price": 0.00, "category": "sabor_salgado", "required": true, "min_select": 1, "max_select": 2},
            {"name": "Bebida: Guaraná Antarctica 350ml", "price": 0.00, "category": "bebida_combo", "required": true, "min_select": 1, "max_select": 1},
            {"name": "Bebida: Coca-Cola Zero 350ml", "price": 0.00, "category": "bebida_combo", "required": true, "min_select": 1, "max_select": 1},
            {"name": "Bebida: Suco de Laranja 400ml", "price": 3.00, "category": "bebida_combo", "required": false, "min_select": 0, "max_select": 1}
        ]'::jsonb,
        true, 
        0
    ),
    (
        'p4040402-4444-4444-4444-444444444444', 
        'Combo Pra Dois', 
        '4 Salgados à sua escolha + 2 Bebidas 350ml.', 
        34.90, 
        'c4444444-4444-4444-4444-444444444444', 
        'https://images.unsplash.com/photo-1541529086526-db283c563270?w=500&auto=format&fit=crop&q=80', 
        ARRAY['recomendado', 'personalizavel'], 
        '[
            {"name": "Salgados Variados (4 unidades)", "price": 0.00, "category": "sabor_salgado", "required": true, "min_select": 1, "max_select": 4},
            {"name": "Bebidas Geladas (2 latas 350ml)", "price": 0.00, "category": "bebida_combo", "required": true, "min_select": 1, "max_select": 2}
        ]'::jsonb,
        true, 
        1
    ),

    -- Congelados
    (
        'p5050501-5555-5555-5555-555555555555', 
        'Pacote Coxinhas Congeladas (10 un)', 
        'Coxinhas artesanais moldadas e empanadas, prontas para fritar em casa.', 
        29.90, 
        'c5555555-5555-5555-5555-555555555555', 
        'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80', 
        ARRAY[]::text[], 
        '[]'::jsonb,
        true, 
        0
    ),

    -- Bebidas
    (
        'p6060601-6666-6666-6666-666666666666', 
        'Guaraná Antarctica 350ml', 
        'Lata 350ml trincando de gelada.', 
        6.50, 
        'c6666666-6666-6666-6666-666666666666', 
        'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80', 
        ARRAY[]::text[], 
        '[]'::jsonb,
        true, 
        0
    ),
    (
        'p6060602-6666-6666-6666-666666666666', 
        'Coca-Cola Zero 350ml', 
        'Lata 350ml gelada.', 
        6.50, 
        'c6666666-6666-6666-6666-666666666666', 
        'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80', 
        ARRAY[]::text[], 
        '[]'::jsonb,
        true, 
        1
    )
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name, 
    description = EXCLUDED.description, 
    price = EXCLUDED.price, 
    category_id = EXCLUDED.category_id, 
    image_url = EXCLUDED.image_url,
    additionals = EXCLUDED.additionals;

-- 5. Configurações de Entrega em Balneário Arroio do Silva — SC
INSERT INTO delivery_settings (id, delivery_fee, min_free_delivery, active, areas)
VALUES (
    1, 
    5.00, 
    50.00, 
    true, 
    '[
        {"name": "Centro", "fee": 5.00},
        {"name": "Praia dos Golfinhos", "fee": 7.00},
        {"name": "Jardim das Avenidas", "fee": 6.00},
        {"name": "Zonassul", "fee": 8.00}
    ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET delivery_fee = EXCLUDED.delivery_fee, areas = EXCLUDED.areas;

-- 6. Configuração do PIX para JOHB
INSERT INTO pix_settings (id, pix_key, pix_name, qr_code_url)
VALUES (1, 'financeiro@johbsalgados.com.br', 'JOHB Salgados Artesanais', '')
ON CONFLICT (id) DO UPDATE SET pix_key = EXCLUDED.pix_key, pix_name = EXCLUDED.pix_name;

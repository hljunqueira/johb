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
    ('c1111111-1111-1111-1111-111111111111', 'Salgados', 'Salgados fritos e empadas artesanais quentinhas com recheios generosos.', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 0, true),
    ('c2222222-2222-2222-2222-222222222222', 'Assados', 'Joelhinhos, folhados e mini pizzas assadas douradas saindo do forno.', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 1, true),
    ('c3333333-3333-3333-3333-333333333333', 'Doces / Cucas', 'Cucas tradicionais de farofa, bolos fofinhos e brownies artesanais.', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 2, true),
    ('c6666666-6666-6666-6666-666666666666', 'Bebidas', 'Refrigerantes, sucos naturais e águas geladas.', 'a1b2c3d4-e5f6-7890-abcd-111111111111', 3, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, menu_id = EXCLUDED.menu_id, "order" = EXCLUDED."order";

-- 3. Inserir Tabela de Complementos / Opcionais
INSERT INTO complements (id, name, price, description, category, active)
VALUES
    ('f1111111-1111-1111-1111-111111111111', 'Maionese Caseira Temperada', 2.50, 'Maionese verde artesanal da casa', 'molhos', true),
    ('f2222222-2222-2222-2222-222222222222', 'Molho de Pimenta Artesanal', 2.00, 'Picante na medida certa', 'molhos', true),
    ('f3333333-3333-3333-3333-333333333333', 'Catupiry Extra no Recheio', 3.50, 'Recheio ainda mais cremoso', 'adicionais', true),
    ('f4444444-4444-4444-4444-444444444444', 'Cheddar Cremoso Extra', 3.50, 'Cheddar derretido extra', 'adicionais', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;

-- 4. Inserir Produtos Reais JOHB com Opcionais / Complementos em JSONB (UUIDs válidos em hex)
INSERT INTO products (id, name, description, price, category_id, image_url, tags, additionals, active, "order")
VALUES 
    -- Salgados
    (
        '10101010-1111-1111-1111-111111111111', 
        'Coxinha Cremosa de Frango', 
        'Frango desfiado temperado na casa com recheio cremoso e casca crocante.', 
        9.90, 
        'c1111111-1111-1111-1111-111111111111', 
        'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80', 
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
        '10101020-1111-1111-1111-111111111111', 
        'Empada de Palmito', 
        'Massa podra amanteigada que derrete na boca com recheio de palmito cremoso.', 
        10.90, 
        'c1111111-1111-1111-1111-111111111111', 
        'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&auto=format&fit=crop&q=80', 
        ARRAY['recomendado'], 
        '[]'::jsonb,
        true, 
        1
    ),
    (
        '10101030-1111-1111-1111-111111111111', 
        'Esfiha Aberta de Carne', 
        'Massa leve e fofinha com carne bovina temperada com tomate e especiarias.', 
        8.90, 
        'c1111111-1111-1111-1111-111111111111', 
        'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80', 
        ARRAY[]::text[], 
        '[]'::jsonb,
        true, 
        2
    ),
    (
        '10101040-1111-1111-1111-111111111111', 
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
        '20202010-2222-2222-2222-222222222222', 
        'Joelhinho de Presunto e Queijo', 
        'Massa assada amanteigada e dourada recheada com presunto suculento e bastante queijo derretido.', 
        11.50, 
        'c2222222-2222-2222-2222-222222222222', 
        'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&auto=format&fit=crop&q=80', 
        ARRAY['mais_pedido', 'personalizavel'], 
        '[
            {"name": "Maionese Caseira Temperada", "price": 2.50, "category": "molhos", "required": false, "min_select": 0, "max_select": 1}
        ]'::jsonb,
        true, 
        0
    ),
    (
        '20202020-2222-2222-2222-222222222222', 
        'Mini Pizza Artesanal de Calabresa', 
        'Massa artesanal assada no ponto, molho de tomate temperado, mussarela e calabresa fatiada.', 
        12.90, 
        'c2222222-2222-2222-2222-222222222222', 
        'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80', 
        ARRAY['mais_pedido'], 
        '[]'::jsonb,
        true, 
        1
    ),
    (
        '20202030-2222-2222-2222-222222222222', 
        'Folhado Assado de Frango com Catupiry', 
        'Massa folhada super leve e crocante com frango cremoso.', 
        11.90, 
        'c2222222-2222-2222-2222-222222222222', 
        'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&auto=format&fit=crop&q=80', 
        ARRAY[]::text[], 
        '[]'::jsonb,
        true, 
        2
    ),

    -- Doces / Cucas
    (
        '30303010-3333-3333-3333-333333333333', 
        'Fatia de Cuca Tradicional de Farofa', 
        'Cuca alemã artesanal com massa fofinha e generosa camada de farofa crocante de canela.', 
        11.90, 
        'c3333333-3333-3333-3333-333333333333', 
        'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80', 
        ARRAY['mais_pedido'], 
        '[]'::jsonb,
        true, 
        0
    ),
    (
        '30303020-3333-3333-3333-333333333333', 
        'Fatia de Cuca de Banana com Doce de Leite', 
        'Cuca de banana fresquinha com farofa e recheio cremoso de doce de leite.', 
        13.90, 
        'c3333333-3333-3333-3333-333333333333', 
        'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80', 
        ARRAY['recomendado'], 
        '[]'::jsonb,
        true, 
        1
    ),

    -- Bebidas
    (
        '60606010-6666-6666-6666-666666666666', 
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
        '60606020-6666-6666-6666-666666666666', 
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

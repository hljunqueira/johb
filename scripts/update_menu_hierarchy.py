"""
Script de reorganização da hierarquia do banco de dados JOHB:
Cria os 3 Menus Principais, atualiza as Categorias e vincula os Produtos correspondentes.
"""
import asyncio
import os
import sys
import uuid
import asyncpg
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("update_menu_hierarchy")

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres.qmwkcdykbvegxkbcqsaj:3LfRB7P8SY7l3Ntl@3.139.14.59:6543/postgres?sslmode=require"
)

async def main():
    logger.info("Conectando ao banco PostgreSQL...")
    dsn = DATABASE_URL
    if 'sslmode' not in dsn:
        connector = "&" if "?" in dsn else "?"
        dsn += f"{connector}sslmode=require"

    conn = await asyncpg.connect(dsn, ssl="require", statement_cache_size=0)
    logger.info("Conectado com sucesso ao PostgreSQL!")

    try:
        async with conn.transaction():
            # 1. Definir Menus Principais
            menus_data = [
                {"id": "a1b2c3d4-e5f6-7890-abcd-111111111111", "name": "🥐 Salgados & Assados", "description": "Salgados fritos, assados artesanais, folhados e mini pizzas.", "order": 0},
                {"id": "a2b2c3d4-e5f6-7890-abcd-222222222222", "name": "🍰 Doces & Cucas", "description": "Cucas tradicionais gaúchas, bolos, tortas e sobremesas da casa.", "order": 1},
                {"id": "a3b2c3d4-e5f6-7890-abcd-333333333333", "name": "🥤 Bebidas & Cafés", "description": "Refrigerantes gelados, sucos naturais e cafés especiais.", "order": 2},
            ]

            menu_ids = {}
            for m in menus_data:
                await conn.execute("""
                    INSERT INTO menus (id, name, description, "order", active)
                    VALUES ($1, $2, $3, $4, TRUE)
                    ON CONFLICT (id) DO UPDATE 
                    SET name = EXCLUDED.name, description = EXCLUDED.description, "order" = EXCLUDED."order", active = TRUE
                """, uuid.UUID(str(m["id"])), str(m["name"]), str(m["description"]), int(str(m["order"])))
                menu_ids[str(m["name"])] = str(m["id"])
                logger.info(f"Menu '{m['name']}' sincronizado.")

            # 2. Definir Categorias por Menu
            categories_data = [
                # Salgados & Assados
                {"id": "c1111111-1111-1111-1111-111111111111", "name": "Salgados Fritos & Empadas", "description": "Coxinhas cremosas, esfihas e empadas amanteigadas que derretem na boca.", "menu_id": menu_ids["🥐 Salgados & Assados"], "order": 0},
                {"id": "c2222222-2222-2222-2222-222222222222", "name": "Assados & Folhados", "description": "Joelhos recheados, folhados amanteigados e assados quentinhos.", "menu_id": menu_ids["🥐 Salgados & Assados"], "order": 1},
                {"id": "c5555555-5555-5555-5555-555555555555", "name": "Mini Pizzas Artesanais", "description": "Massa artesanal assada com bastante queijo derretido e molho da casa.", "menu_id": menu_ids["🥐 Salgados & Assados"], "order": 2},

                # Doces & Cucas
                {"id": "c3333333-3333-3333-3333-333333333333", "name": "Cucas Tradicionais", "description": "Cucas alemãs artesanais com farofa crocante e recheios generosos.", "menu_id": menu_ids["🍰 Doces & Cucas"], "order": 0},
                {"id": "c4444444-4444-4444-4444-444444444444", "name": "Bolos & Sobremesas", "description": "Fatias de bolo, brownies e sobremesas deliciosas.", "menu_id": menu_ids["🍰 Doces & Cucas"], "order": 1},

                # Bebidas & Cafés
                {"id": "c6666666-6666-6666-6666-666666666666", "name": "Refrigerantes & Gelados", "description": "Latas e garrafas trincando de geladas.", "menu_id": menu_ids["🥤 Bebidas & Cafés"], "order": 0},
                {"id": "c7777777-7777-7777-7777-777777777777", "name": "Cafés & Matinais", "description": "Café espresso, cappuccino e achocolatados quentinhos.", "menu_id": menu_ids["🥤 Bebidas & Cafés"], "order": 1},
            ]

            cat_ids = {}
            for c in categories_data:
                await conn.execute("""
                    INSERT INTO categories (id, name, description, menu_id, "order", active)
                    VALUES ($1, $2, $3, $4, $5, TRUE)
                    ON CONFLICT (id) DO UPDATE 
                    SET name = EXCLUDED.name, description = EXCLUDED.description, menu_id = EXCLUDED.menu_id, "order" = EXCLUDED."order", active = TRUE
                """, uuid.UUID(str(c["id"])), str(c["name"]), str(c["description"]), uuid.UUID(str(c["menu_id"])), int(str(c["order"])))
                cat_ids[str(c["name"])] = str(c["id"])
                logger.info(f"Categoria '{c['name']}' sincronizada.")

            # 3. Vincular produtos existentes às novas categorias
            product_category_mappings = [
                # Fritos & Empadas
                ("Coxinha Cremosa de Frango", "c1111111-1111-1111-1111-111111111111"),
                ("Empada de Palmito", "c1111111-1111-1111-1111-111111111111"),
                ("Esfiha Aberta de Carne", "c1111111-1111-1111-1111-111111111111"),
                ("Pão de Queijo Canastra (6 un)", "c1111111-1111-1111-1111-111111111111"),
                
                # Assados & Folhados
                ("Joelho de Presunto e Queijo", "c2222222-2222-2222-2222-222222222222"),
                ("Folhado Assado de Frango com Catupiry", "c2222222-2222-2222-2222-222222222222"),
                
                # Mini Pizzas
                ("Mini Pizza Artesanal de Calabresa", "c5555555-5555-5555-5555-555555555555"),
                
                # Cucas
                ("Fatia de Cuca Tradicional de Farofa", "c3333333-3333-3333-3333-333333333333"),
                ("Fatia de Cuca de Banana com Doce de Leite", "c3333333-3333-3333-3333-333333333333"),
                
                # Bebidas
                ("Coca-Cola Zero 350ml", "c6666666-6666-6666-6666-666666666666"),
            ]

            for prod_name, cat_uuid in product_category_mappings:
                await conn.execute("""
                    UPDATE products 
                    SET category_id = $1
                    WHERE name ILIKE $2
                """, uuid.UUID(cat_uuid), f"%{prod_name}%")
                logger.info(f"Produto '{prod_name}' vinculado à categoria {cat_uuid}.")

            logger.info("Reorganização concluída com sucesso!")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())

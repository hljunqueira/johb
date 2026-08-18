import asyncio
import asyncpg
import uuid

DATABASE_URL = "postgresql://postgres.qmwkcdykbvegxkbcqsaj:3LfRB7P8SY7l3Ntl@3.139.14.59:6543/postgres?sslmode=require"

async def main():
    print("Populating complement_categories and syncing products complement_ids...")
    conn = await asyncpg.connect(DATABASE_URL, ssl="require", statement_cache_size=0)
    
    # 1. Popular Categorias de Complementos
    cats = [
        ("cc111111-1111-1111-1111-111111111111", "Molhos & Cremes", "molhos", "🥣", 0),
        ("cc222222-2222-2222-2222-222222222222", "Adicionais & Recheios Extra", "adicionais", "🧀", 1),
        ("cc333333-3333-3333-3333-333333333333", "Extras & Acompanhamentos", "extras", "🥜", 2)
    ]
    
    for cid, name, key, icon, order in cats:
        await conn.execute("""
            INSERT INTO complement_categories (id, name, key, icon, "order", active)
            VALUES ($1, $2, $3, $4, $5, TRUE)
            ON CONFLICT (id) DO UPDATE 
            SET name = EXCLUDED.name, key = EXCLUDED.key, icon = EXCLUDED.icon, "order" = EXCLUDED."order", active = TRUE
        """, uuid.UUID(cid), name, key, icon, order)
        print(f"Categoria de complemento sincronizada: {name} ({key})")

    # 2. Garantir itens na tabela complements
    complements = [
        ("f1111111-1111-1111-1111-111111111111", "Maionese Caseira Temperada", 2.50, "Maionese verde artesanal da casa", "molhos"),
        ("f2222222-2222-2222-2222-222222222222", "Molho de Pimenta Artesanal", 2.00, "Picante na medida certa", "molhos"),
        ("f3333333-3333-3333-3333-333333333333", "Catupiry Extra no Recheio", 3.50, "Recheio ainda mais cremoso", "adicionais"),
        ("f4444444-4444-4444-4444-444444444444", "Cheddar Cremoso Extra", 3.50, "Cheddar derretido extra", "adicionais")
    ]

    for comp_id, name, price, desc, cat_key in complements:
        await conn.execute("""
            INSERT INTO complements (id, name, price, description, category, active)
            VALUES ($1, $2, $3, $4, $5, TRUE)
            ON CONFLICT (id) DO UPDATE
            SET name = EXCLUDED.name, price = EXCLUDED.price, description = EXCLUDED.description, category = EXCLUDED.category, active = TRUE
        """, uuid.UUID(comp_id), name, price, desc, cat_key)
        print(f"Complemento sincronizado: {name}")

    # 3. Vincular complement_ids dinâmicos aos produtos (Coxinha e Joelho)
    coxinha_comp_ids = [
        uuid.UUID("f3333333-3333-3333-3333-333333333333"),
        uuid.UUID("f1111111-1111-1111-1111-111111111111"),
        uuid.UUID("f2222222-2222-2222-2222-222222222222")
    ]
    await conn.execute("""
        UPDATE products 
        SET complement_ids = $1
        WHERE name ILIKE '%Coxinha%'
    """, coxinha_comp_ids)

    joelho_comp_ids = [
        uuid.UUID("f1111111-1111-1111-1111-111111111111")
    ]
    await conn.execute("""
        UPDATE products 
        SET complement_ids = $1
        WHERE name ILIKE '%Joelho%'
    """, joelho_comp_ids)

    print("Produtos e complementos dinâmicos sincronizados com sucesso no PostgreSQL!")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())

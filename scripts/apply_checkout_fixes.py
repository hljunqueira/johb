import asyncio
import asyncpg
import os

DATABASE_URL = os.environ.get("DATABASE_URL") or "postgresql://postgres.qmwkcdykbvegxkbcqsaj:3LfRB7P8SY7l3Ntl@3.139.14.59:6543/postgres"

async def main():
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    await conn.execute("ALTER TABLE delivery_settings ADD COLUMN IF NOT EXISTS min_order_value NUMERIC(10,2) DEFAULT 0.0;")
    await conn.execute("UPDATE menus SET description = 'Salgados fritos, assados artesanais e folhados.' WHERE id = 'a1b2c3d4-e5f6-7890-abcd-111111111111';")
    row = await conn.fetchrow("SELECT id, min_order_value, min_free_delivery, delivery_fee FROM delivery_settings WHERE id = 1;")
    print("DELIVERY SETTINGS UPDATED:", dict(row))
    menu_row = await conn.fetchrow("SELECT id, name, description FROM menus WHERE id = 'a1b2c3d4-e5f6-7890-abcd-111111111111';")
    print("MENU UPDATED:", menu_row['id'], menu_row['description'])
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())

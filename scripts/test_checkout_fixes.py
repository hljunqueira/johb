import asyncio
import asyncpg
import json
import os

DATABASE_URL = os.environ.get("DATABASE_URL") or "postgresql://postgres.qmwkcdykbvegxkbcqsaj:3LfRB7P8SY7l3Ntl@3.139.14.59:6543/postgres"

async def test_backend_logic():
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    print("=== TEST 1: Database delivery_settings columns ===")
    ds = await conn.fetchrow("SELECT * FROM delivery_settings WHERE id = 1")
    print("delivery_settings keys:", list(dict(ds).keys()))
    assert 'min_order_value' in dict(ds), "min_order_value column missing!"
    print("min_order_value in DB:", ds['min_order_value'])

    print("\n=== TEST 2: Menu description ===")
    menu = await conn.fetchrow("SELECT * FROM menus WHERE id = 'a1b2c3d4-e5f6-7890-abcd-111111111111'")
    print("Menu description:", menu['description'])
    assert "mini pizza" not in menu['description'].lower(), "mini pizza still in menu description!"

    print("\n=== TEST 3: Products check ===")
    prods = await conn.fetch("SELECT name FROM products WHERE LOWER(name) LIKE '%pizza%'")
    print("Pizza products:", len(prods))
    assert len(prods) == 0, "Found pizza products in database!"

    await conn.close()
    print("\nALL BACKEND DATABASE TESTS PASSED!")

if __name__ == "__main__":
    asyncio.run(test_backend_logic())

import asyncio
import asyncpg
import os

async def main():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("DATABASE_URL not set")
        return
    pool = await asyncpg.create_pool(dsn, ssl="require")
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT id, name, active, category_id FROM products")
        print(f"TOTAL PRODUCTS: {len(rows)}")
        for r in rows:
            print(dict(r))
    await pool.close()

if __name__ == "__main__":
    asyncio.run(main())

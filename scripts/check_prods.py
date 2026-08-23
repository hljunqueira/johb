import asyncio
import asyncpg
import os

async def main():
    dsn = os.environ.get("DATABASE_URL") or "postgresql://postgres.qmwkcdykbvegxkbcqsaj:3LfRB7P8SY7l3Ntl@3.139.14.59:6543/postgres"
    pool = await asyncpg.create_pool(dsn, ssl="require", statement_cache_size=0)
    async with pool.acquire() as conn:
        menus = await conn.fetch("SELECT id, name, description FROM menus")
        for m in menus:
            print(f"MENU: {m['id']} - {m['name'].encode('ascii', 'ignore').decode()} - {m['description'].encode('ascii', 'ignore').decode() if m['description'] else ''}")
        cats = await conn.fetch("SELECT id, name, description FROM categories")
        for c in cats:
            print(f"CAT: {c['id']} - {c['name'].encode('ascii', 'ignore').decode()} - {c['description'].encode('ascii', 'ignore').decode() if c['description'] else ''}")
    await pool.close()

if __name__ == "__main__":
    asyncio.run(main())

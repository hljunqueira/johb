import asyncio
import asyncpg

DATABASE_URL = "postgresql://postgres.qmwkcdykbvegxkbcqsaj:3LfRB7P8SY7l3Ntl@3.139.14.59:6543/postgres"

async def main():
    conn = await asyncpg.connect(DATABASE_URL)
    cols = await conn.fetch("""
        SELECT column_name, data_type, udt_name 
        FROM information_schema.columns 
        WHERE table_name = 'delivery_settings';
    """)
    print("COLUMN TYPES OF delivery_settings:")
    for c in cols:
        print(f"  {c['column_name']}: {c['data_type']} ({c['udt_name']})")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())

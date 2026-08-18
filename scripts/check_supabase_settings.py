import asyncio
import asyncpg

DATABASE_URL = "postgresql://postgres.qmwkcdykbvegxkbcqsaj:3LfRB7P8SY7l3Ntl@3.139.14.59:6543/postgres"

async def main():
    conn = await asyncpg.connect(DATABASE_URL)
    row = await conn.fetchrow("SELECT * FROM delivery_settings WHERE id = 1")
    print("CURRENT DELIVERY SETTINGS IN SUPABASE:")
    for k, v in dict(row).items():
        print(f"  {k}: {v}")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())

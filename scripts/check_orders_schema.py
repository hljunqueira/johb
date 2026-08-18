import asyncio
import asyncpg

DATABASE_URL = "postgresql://postgres.qmwkcdykbvegxkbcqsaj:3LfRB7P8SY7l3Ntl@3.139.14.59:6543/postgres"

async def main():
    conn = await asyncpg.connect(DATABASE_URL)
    cols = await conn.fetch("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'orders';
    """)
    print("COLUMNS IN orders TABLE:")
    for c in cols:
        print(f"  {c['column_name']}: {c['data_type']}")
        
    # Check customers table as well
    cust_cols = await conn.fetch("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'customers';
    """)
    print("\nCOLUMNS IN customers TABLE:")
    for c in cust_cols:
        print(f"  {c['column_name']}: {c['data_type']}")

    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())

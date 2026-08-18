import asyncio
import asyncpg

DATABASE_URL = "postgresql://postgres.qmwkcdykbvegxkbcqsaj:3LfRB7P8SY7l3Ntl@3.139.14.59:6543/postgres"

async def main():
    conn = await asyncpg.connect(DATABASE_URL)
    
    print("Ensuring columns in orders table...")
    await conn.execute("""
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'asaas';
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS change_for NUMERIC(10,2) DEFAULT NULL;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50) DEFAULT NULL;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0.0;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_date TEXT DEFAULT NULL;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_time TEXT DEFAULT NULL;
    """)
    print("✅ Columns added successfully to orders table!")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())

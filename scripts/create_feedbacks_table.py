import asyncio
import asyncpg
import os

DATABASE_URL = os.environ.get("DATABASE_URL") or "postgresql://postgres.qmwkcdykbvegxkbcqsaj:3LfRB7P8SY7l3Ntl@3.139.14.59:6543/postgres"

async def run_migration():
    conn = await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
    
    # 1. Criar tabela feedbacks
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS feedbacks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            customer_name TEXT NOT NULL,
            customer_phone TEXT,
            rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
            rating_comment TEXT NOT NULL,
            order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """)
    print("Table feedbacks created/verified.")

    # 2. Migrar ratings existentes de orders para feedbacks se houver
    migrated = await conn.execute("""
        INSERT INTO feedbacks (customer_name, customer_phone, rating, rating_comment, order_id, created_at)
        SELECT 
            COALESCE(customer_name, 'Cliente'),
            customer_phone,
            rating,
            COALESCE(rating_comment, 'Ótimo atendimento e produtos saborosos!'),
            id,
            COALESCE(created_at, NOW())
        FROM orders 
        WHERE rating IS NOT NULL AND rating > 0
        AND id NOT IN (SELECT order_id FROM feedbacks WHERE order_id IS NOT NULL);
    """)
    print(f"Migrated existing order ratings: {migrated}")

    count = await conn.fetchval("SELECT COUNT(*) FROM feedbacks;")
    print(f"Total feedbacks in database: {count}")

    await conn.close()

if __name__ == "__main__":
    asyncio.run(run_migration())

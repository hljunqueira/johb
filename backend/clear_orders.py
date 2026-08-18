import asyncio
import asyncpg
import os

DATABASE_URL = os.environ.get('DATABASE_URL') or "postgresql://postgres.qmwkcdykbvegxkbcqsaj:3LfRB7P8SY7l3Ntl@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"

async def clear_all_orders():
    print("Conectando ao banco de dados...")
    conn = await asyncpg.connect(DATABASE_URL, ssl='require', statement_cache_size=0)
    
    count_before = await conn.fetchval("SELECT COUNT(*) FROM orders")
    print(f"Total de pedidos antes da limpeza: {count_before}")
    
    # Limpar histórico se existir
    has_history = await conn.fetchval("SELECT to_regclass('order_status_history')")
    if has_history:
        await conn.execute("DELETE FROM order_status_history")
    
    # Limpar pedidos
    await conn.execute("DELETE FROM orders")
    
    count_after = await conn.fetchval("SELECT COUNT(*) FROM orders")
    print(f"Total de pedidos após a limpeza: {count_after}")
    
    await conn.close()
    print("Pedidos zerados com sucesso!")

if __name__ == "__main__":
    asyncio.run(clear_all_orders())

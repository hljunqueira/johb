import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    # Use DATABASE_URL if available, otherwise use individual env vars
    DATABASE_URL = os.environ.get('DATABASE_URL')
    
    if DATABASE_URL:
        conn = await asyncpg.connect(DATABASE_URL, ssl='require')
    else:
        conn = await asyncpg.connect(
            host=os.environ.get('DB_HOST', 'localhost'),
            port=os.environ.get('DB_PORT', '5432'),
            user=os.environ.get('DB_USER', 'postgres'),
            password=os.environ.get('DB_PASSWORD', ''),
            database=os.environ.get('DB_NAME', 'saladasoul')
        )
    
    # Ver colunas da tabela admin_users
    cols = await conn.fetch("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='admin_users';
    """)
    print("Colunas da tabela admin_users:")
    for c in cols:
        print(f"  - {c['column_name']}")
    
    # Ver dados do admin
    admin = await conn.fetch("""
        SELECT id, name, email, role, password_hash
        FROM admin_users;
    """)
    print("\nAdmins encontrados:")
    for a in admin:
        print(f"  - {a['name']} ({a['email']}) - Role: {a['role']}")
        print(f"    Hash: {a['password_hash'][:50]}...")
    
    await conn.close()

asyncio.run(check())

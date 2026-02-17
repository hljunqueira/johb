import asyncio
import asyncpg

async def check():
    conn = await asyncpg.connect(
        host="76.13.171.93",
        port=5433,
        user="postgres",
        password="buLyx9JzRuAMt22zEU3jiZVjz99nH9sncPPyYD4uHZA=",
        database="saladasoul"
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

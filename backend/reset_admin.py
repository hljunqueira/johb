import asyncio
import asyncpg
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def reset_admin_password():
    # Conectar ao banco da VPS
    conn = await asyncpg.connect(
        host="76.13.171.93",
        port=5433,
        user="postgres",
        password="buLyx9JzRuAMt22zEU3jiZVjz99nH9sncPPyYD4uHZA=",
        database="saladasoul"
    )
    
    # Gerar hash da nova senha
    new_hash = pwd_context.hash("admin123")
    
    # Atualizar senha do admin
    await conn.execute(
        "UPDATE admin_users SET password_hash = $1 WHERE email = 'admin@saladasoul.com'",
        new_hash
    )
    
    print(f"✅ Senha do admin atualizada com sucesso!")
    print(f"Hash gerado: {new_hash}")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(reset_admin_password())

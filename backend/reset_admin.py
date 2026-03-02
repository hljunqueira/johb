import asyncio
import asyncpg
import os
from dotenv import load_dotenv
from passlib.context import CryptContext

load_dotenv()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def reset_admin_password():
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

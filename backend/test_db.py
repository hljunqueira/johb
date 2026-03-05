"""
Script de teste de conexão com o banco de dados Supabase
"""
import os
import sys
import asyncio
import asyncpg
import socket

DATABASE_URL = os.environ.get('DATABASE_URL')

async def test_connection():
    """Testa a conexão com o banco de dados"""
    print(f"DATABASE_URL configurada: {bool(DATABASE_URL)}")
    
    if not DATABASE_URL:
        print("ERRO: DATABASE_URL não configurada!")
        return False
    
    # Parse URL para mostrar informações (sem senha)
    import urllib.parse
    parsed = urllib.parse.urlparse(DATABASE_URL)
    print(f"Host: {parsed.hostname}")
    print(f"Porta: {parsed.port}")
    print(f"Banco: {parsed.path}")
    print(f"Usuário: {parsed.username}")
    
    # Testar resolução DNS
    print("\nTestando resolução DNS...")
    try:
        ip = socket.gethostbyname(parsed.hostname)
        print(f"DNS OK: {parsed.hostname} -> {ip}")
    except socket.gaierror as e:
        print(f"ERRO DNS: {e}")
        print("O hostname não pode ser resolvido!")
        return False
    
    # Testar conexão com o banco
    print("\nTestando conexão com o banco...")
    try:
        dsn = DATABASE_URL
        if 'sslmode' not in dsn:
            dsn += "?sslmode=require"
        
        conn = await asyncpg.connect(dsn, timeout=30)
        version = await conn.fetchval("SELECT version()")
        print(f"Conexão OK!")
        print(f"Versão do PostgreSQL: {version}")
        await conn.close()
        return True
    except Exception as e:
        print(f"ERRO de conexão: {e}")
        return False

if __name__ == "__main__":
    result = asyncio.run(test_connection())
    sys.exit(0 if result else 1)

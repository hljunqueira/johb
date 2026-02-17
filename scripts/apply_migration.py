#!/usr/bin/env python3
"""
Script para aplicar migration 002_create_customers_table.sql
Execute: python scripts/apply_migration.py
"""

import asyncio
import asyncpg
import os
from pathlib import Path

# Carregar variáveis de ambiente do .env
ROOT_DIR = Path(__file__).parent.parent
env_path = ROOT_DIR / 'backend' / '.env'

if env_path.exists():
    with open(env_path) as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                key, value = line.strip().split('=', 1)
                os.environ[key] = value

DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_NAME = os.environ.get('DB_NAME', 'saladasoul')
DB_USER = os.environ.get('DB_USER', 'postgres')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'postgres')
DB_PORT = os.environ.get('DB_PORT', '5432')

async def apply_migration():
    """Aplicar migration SQL"""
    print(f"Conectando ao banco {DB_NAME} em {DB_HOST}:{DB_PORT}...")
    
    try:
        conn = await asyncpg.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            port=DB_PORT
        )
        
        # Ler arquivo SQL - permitir especificar qual migration
        import sys
        migration_file = sys.argv[1] if len(sys.argv) > 1 else '003_add_icons_and_required_complements.sql'
        
        migration_path = ROOT_DIR / 'backend' / 'migrations' / migration_file
        with open(migration_path, 'r', encoding='utf-8') as f:
            sql = f.read()
        
        print(f"Aplicando migration: {migration_path.name}")
        print("-" * 50)
        
        # Executar SQL
        await conn.execute(sql)
        
        # Verificar se tabela foi criada
        result = await conn.fetchval(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'customers'"
        )
        
        if result > 0:
            # Contar registros migrados
            count = await conn.fetchval("SELECT COUNT(*) FROM customers")
            print(f"✅ Migration aplicada com sucesso!")
            print(f"   Tabela 'customers' criada")
            print(f"   {count} clientes migrados dos pedidos existentes")
        else:
            print("❌ Erro: Tabela não foi criada")
        
        await conn.close()
        
    except asyncpg.exceptions.ConnectionDoesNotExistError:
        print(f"❌ Erro: Não foi possível conectar ao banco de dados")
        print(f"   Verifique se o PostgreSQL está rodando em {DB_HOST}:{DB_PORT}")
        print(f"   Credenciais: {DB_USER} / *****")
    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    asyncio.run(apply_migration())

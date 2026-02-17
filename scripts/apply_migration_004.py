#!/usr/bin/env python3
"""
Script para aplicar a migration 004_create_complement_categories.sql
Usa a conexão direta com o banco (sem Docker)
"""
import asyncpg
import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv

# Carregar variáveis do .env
ROOT_DIR = Path(__file__).parent.parent / 'backend'
load_dotenv(ROOT_DIR / '.env')

# Configuração do banco (do .env)
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_NAME = os.environ.get('DB_NAME', 'saladasoul')
DB_USER = os.environ.get('DB_USER', 'postgres')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'postgres')
DB_PORT = os.environ.get('DB_PORT', '5432')

async def apply_migration():
    # Ler o arquivo SQL
    migration_path = Path(__file__).parent.parent / 'backend' / 'migrations' / '004_create_complement_categories.sql'
    with open(migration_path, 'r', encoding='utf-8') as f:
        sql = f.read()
    
    # Conectar ao banco
    conn = await asyncpg.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        port=DB_PORT
    )
    
    try:
        # Executar a migration
        print("Aplicando migration 004_create_complement_categories.sql...")
        await conn.execute(sql)
        print("✅ Migration aplicada com sucesso!")
        
        # Verificar se as categorias foram inseridas
        rows = await conn.fetch("SELECT * FROM complement_categories ORDER BY order_index")
        print(f"\n📋 {len(rows)} categorias encontradas:")
        for row in rows:
            print(f"  - {row['icon']} {row['name']} (key: {row['key']}, ordem: {row['order_index']})")
            
    except Exception as e:
        print(f"❌ Erro ao aplicar migration: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(apply_migration())

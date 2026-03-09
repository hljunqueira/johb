#!/usr/bin/env python3
"""
Atualiza o produto "Monte Sua Salada" com o campo additionals (JSONB)
O frontend lê product.additionals para exibir os complementos no modal.
Execute: python scripts/update_monte_sua_salada.py
"""

import asyncio
import asyncpg
import os
import json
from pathlib import Path

# Carregar .env do backend
ROOT_DIR = Path(__file__).parent.parent
env_path = ROOT_DIR / 'backend' / '.env'

if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if '=' in line and not line.startswith('#'):
                key, value = line.split('=', 1)
                os.environ[key] = value

# Preferir DATABASE_URL se disponível, senão montar a partir das variáveis individuais
DATABASE_URL = os.environ.get('DATABASE_URL', '')

DB_HOST     = os.environ.get('DB_HOST', 'localhost')
DB_NAME     = os.environ.get('DB_NAME', 'postgres')
DB_USER     = os.environ.get('DB_USER', 'postgres')
DB_PASSWORD = os.environ.get('DB_PASSWORD', '')
DB_PORT     = int(os.environ.get('DB_PORT', '5432'))

# Montar DSN: Supabase Transaction Pooler usa porta 6543
# Formato: postgresql://user:pass@host:6543/postgres
if not DATABASE_URL:
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# ============================================================
# COMPLEMENTOS DO "MONTE SUA SALADA"
# Formato que o frontend (MenuPage.js) espera:
# { name, price, category, required, min_select, max_select, image_url? }
# ============================================================
ADDITIONALS = [
    # --- BASE DE FOLHAS (obrigatório - escolha pelo menos 1, até 2) ---
    {"name": "Mix de folhas",     "price": 5.00, "category": "base_folhas", "required": False, "min_select": 1, "max_select": 2},
    {"name": "Alface americana",  "price": 3.00, "category": "base_folhas", "required": False, "min_select": 0, "max_select": 2},
    {"name": "Rúcula",            "price": 3.00, "category": "base_folhas", "required": False, "min_select": 0, "max_select": 2},
    {"name": "Repolho roxo",      "price": 3.00, "category": "base_folhas", "required": False, "min_select": 0, "max_select": 2},

    # --- PROTEÍNA (obrigatório - escolha 1) ---
    {"name": "Frango",                    "price": 9.00, "category": "proteina", "required": True, "min_select": 1, "max_select": 1},
    {"name": "Atum",                      "price": 8.50, "category": "proteina", "required": True, "min_select": 1, "max_select": 1},
    {"name": "Carne moída (patinho)",     "price": 9.00, "category": "proteina", "required": True, "min_select": 1, "max_select": 1},
    {"name": "Carne em cubos (patinho)",  "price": 9.00, "category": "proteina", "required": True, "min_select": 1, "max_select": 1},
    {"name": "Ovo cozido",               "price": 3.50, "category": "proteina", "required": False, "min_select": 0, "max_select": 3},

    # --- LEGUMES & VERDURAS (opcional - até 3) ---
    {"name": "Cenoura",      "price": 3.00, "category": "legumes", "required": False, "min_select": 0, "max_select": 3},
    {"name": "Tomate",       "price": 2.50, "category": "legumes", "required": False, "min_select": 0, "max_select": 3},
    {"name": "Tomate cereja","price": 3.50, "category": "legumes", "required": False, "min_select": 0, "max_select": 3},
    {"name": "Pepino",       "price": 3.00, "category": "legumes", "required": False, "min_select": 0, "max_select": 3},
    {"name": "Beterraba",    "price": 3.50, "category": "legumes", "required": False, "min_select": 0, "max_select": 3},
    {"name": "Cebola roxa",  "price": 2.50, "category": "legumes", "required": False, "min_select": 0, "max_select": 3},
    {"name": "Salsa",        "price": 2.00, "category": "legumes", "required": False, "min_select": 0, "max_select": 3},
    {"name": "Cebolinha",    "price": 2.00, "category": "legumes", "required": False, "min_select": 0, "max_select": 3},
    {"name": "Brócolis",     "price": 4.00, "category": "legumes", "required": False, "min_select": 0, "max_select": 3},

    # --- FRUTAS (obrigatório - escolha 1) ---
    {"name": "Manga",   "price": 3.50, "category": "frutas", "required": True, "min_select": 1, "max_select": 1},
    {"name": "Maçã",    "price": 3.00, "category": "frutas", "required": True, "min_select": 1, "max_select": 1},
    {"name": "Morango", "price": 4.00, "category": "frutas", "required": True, "min_select": 1, "max_select": 1},
    {"name": "Abacate", "price": 3.00, "category": "frutas", "required": False, "min_select": 0, "max_select": 3},

    # --- EXTRAS & CROCÂNCIA (opcional - escolha até 1) ---
    {"name": "Batata palha",       "price": 3.50, "category": "extras", "required": False, "min_select": 0, "max_select": 1},
    {"name": "Castanha de caju",   "price": 8.00, "category": "extras", "required": False, "min_select": 0, "max_select": 1},
    {"name": "Castanha do Pará",   "price": 8.00, "category": "extras", "required": False, "min_select": 0, "max_select": 1},
    {"name": "Amêndoas laminadas", "price": 6.00, "category": "extras", "required": False, "min_select": 0, "max_select": 1},
    {"name": "Queijo parmesão",    "price": 3.00, "category": "extras", "required": False, "min_select": 0, "max_select": 1},
    {"name": "Croutons",           "price": 4.50, "category": "extras", "required": False, "min_select": 0, "max_select": 1},
    {"name": "Gergelim",           "price": 2.00, "category": "extras", "required": False, "min_select": 0, "max_select": 3},

    # --- MOLHOS & CREMES (obrigatório - escolha 1) ---
    {"name": "Creme de abacate",       "price": 5.00, "category": "molhos", "required": True, "min_select": 1, "max_select": 1},
    {"name": "Molho verde fit",        "price": 5.00, "category": "molhos", "required": True, "min_select": 1, "max_select": 1},
    {"name": "Molho especial tipo MC", "price": 5.00, "category": "molhos", "required": True, "min_select": 1, "max_select": 1},
    {"name": "Mostarda e mel",         "price": 5.00, "category": "molhos", "required": True, "min_select": 1, "max_select": 1},

    # --- TEMPEROS (opcional - até 3) ---
    {"name": "Azeite",  "price": 2.00, "category": "temperos", "required": False, "min_select": 0, "max_select": 3},
    {"name": "Sal",     "price": 0.00, "category": "temperos", "required": False, "min_select": 0, "max_select": 3},
    {"name": "Orégano", "price": 1.00, "category": "temperos", "required": False, "min_select": 0, "max_select": 3},
]

async def main():
    print(f"Conectando ao Supabase ({DB_HOST})...")

    conn = await asyncpg.connect(
        DATABASE_URL,
        ssl='require',
        statement_cache_size=0,
    )

    # Buscar o produto "Monte Sua Salada" (qualquer variação do nome)
    row = await conn.fetchrow(
        "SELECT id, name, price, additionals FROM products WHERE name ILIKE '%monte%salada%' LIMIT 1"
    )

    if not row:
        print("❌ Produto 'Monte Sua Salada' não encontrado no banco.")
        print("   Verifique se o cardápio foi inserido (seed_cardapio_real.sql)")
        await conn.close()
        return

    product_id = row['id']
    print(f"✅ Produto encontrado: '{row['name']}' (ID: {product_id})")
    print(f"   Preço base atual: R$ {row['price']:.2f}")
    
    current = row['additionals']
    if current:
        try:
            parsed = json.loads(current) if isinstance(current, str) else current
            print(f"   Additionals atuais: {len(parsed)} itens")
        except Exception:
            print(f"   Additionals atuais: {current}")

    # Atualizar campo additionals com todos os complementos
    additionals_json = json.dumps(ADDITIONALS, ensure_ascii=False)
    
    await conn.execute(
        "UPDATE products SET additionals = $1::jsonb, price = 28.50, tags = $2 WHERE id = $3",
        additionals_json,
        ['personalizavel', 'mais_pedido'],
        product_id
    )

    print(f"\n🎉 Produto atualizado com sucesso!")
    print(f"   Preço base:  R$ 28,50")
    print(f"   Complementos: {len(ADDITIONALS)} itens em 7 categorias")
    print()
    
    # Mostrar resumo por categoria
    cats = {}
    for a in ADDITIONALS:
        cats.setdefault(a['category'], []).append(a['name'])
    for cat, items in cats.items():
        print(f"   {cat}: {len(items)} opções")

    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())

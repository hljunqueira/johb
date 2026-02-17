#!/usr/bin/env python3
"""
Script para criar o produto "Monte Sua Salada" com todos os complementos
Execute: python scripts/seed_monte_sua_salada.py
"""

import asyncio
import asyncpg
import os
import json
from pathlib import Path
import uuid

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

# Dados do produto e complementos
PRODUTO = {
    "name": "Monte Sua Salada",
    "description": "Ingredientes frescos, preparados na hora e com muito sabor. Escolha seus ingredientes favoritos e monte do seu jeito!",
    "price": 28.50,
    "image_url": "/uploads/monte-sua-salada.jpg",
    "tags": ["personalizavel", "mais_pedido"],
    "active": True
}

COMPLEMENTOS = [
    # BASE DE FOLHAS (obrigatório - escolha pelo menos 1, até 2)
    {"name": "Mix de folhas", "price": 5.00, "category": "base_folhas", "required": False, "min_select": 1, "max_select": 2, "image_url": "/uploads/mix-folhas.jpg"},
    {"name": "Alface americana", "price": 3.00, "category": "base_folhas", "required": False, "min_select": 0, "max_select": 2, "image_url": "/uploads/alface.jpg"},
    {"name": "Rúcula", "price": 3.00, "category": "base_folhas", "required": False, "min_select": 0, "max_select": 2, "image_url": "/uploads/rucula.jpg"},
    {"name": "Repolho roxo", "price": 3.00, "category": "base_folhas", "required": False, "min_select": 0, "max_select": 2, "image_url": "/uploads/repolho.jpg"},
    
    # PROTEÍNA (obrigatório - escolha 1)
    {"name": "Frango", "price": 9.00, "category": "proteina", "required": True, "min_select": 1, "max_select": 1, "image_url": "/uploads/frango.jpg"},
    {"name": "Atum", "price": 8.50, "category": "proteina", "required": True, "min_select": 1, "max_select": 1, "image_url": "/uploads/atum.jpg"},
    {"name": "Carne moída (patinho)", "price": 9.00, "category": "proteina", "required": True, "min_select": 1, "max_select": 1, "image_url": "/uploads/carne-moida.jpg"},
    {"name": "Carne em cubos (patinho)", "price": 9.00, "category": "proteina", "required": True, "min_select": 1, "max_select": 1, "image_url": "/uploads/carne-cubos.jpg"},
    
    # LEGUMES & VERDURAS (opcional - até 3)
    {"name": "Cenoura", "price": 3.00, "category": "legumes", "required": False, "min_select": 0, "max_select": 3, "image_url": "/uploads/cenoura.jpg"},
    {"name": "Tomate", "price": 2.50, "category": "legumes", "required": False, "min_select": 0, "max_select": 3, "image_url": "/uploads/tomate.jpg"},
    {"name": "Tomate cereja", "price": 3.50, "category": "legumes", "required": False, "min_select": 0, "max_select": 3, "image_url": "/uploads/tomate-cereja.jpg"},
    {"name": "Pepino", "price": 3.00, "category": "legumes", "required": False, "min_select": 0, "max_select": 3, "image_url": "/uploads/pepino.jpg"},
    {"name": "Beterraba", "price": 3.50, "category": "legumes", "required": False, "min_select": 0, "max_select": 3, "image_url": "/uploads/beterraba.jpg"},
    {"name": "Cebola roxa", "price": 2.50, "category": "legumes", "required": False, "min_select": 0, "max_select": 3, "image_url": "/uploads/cebola.jpg"},
    {"name": "Salsa", "price": 2.00, "category": "legumes", "required": False, "min_select": 0, "max_select": 3, "image_url": "/uploads/salsa.jpg"},
    {"name": "Cebolinha", "price": 2.00, "category": "legumes", "required": False, "min_select": 0, "max_select": 3, "image_url": "/uploads/cebolinha.jpg"},
    {"name": "Brócolis", "price": 4.00, "category": "legumes", "required": False, "min_select": 0, "max_select": 3, "image_url": "/uploads/brocolis.jpg"},
    
    # FRUTAS (obrigatório - escolha 1)
    {"name": "Manga", "price": 3.50, "category": "frutas", "required": True, "min_select": 1, "max_select": 1, "image_url": "/uploads/manga.jpg"},
    {"name": "Maçã", "price": 3.00, "category": "frutas", "required": True, "min_select": 1, "max_select": 1, "image_url": "/uploads/maca.jpg"},
    {"name": "Morango", "price": 4.00, "category": "frutas", "required": True, "min_select": 1, "max_select": 1, "image_url": "/uploads/morango.jpg"},
    
    # EXTRAS & CROCÂNCIA (opcional - escolha 1)
    {"name": "Batata palha", "price": 3.50, "category": "extras", "required": False, "min_select": 0, "max_select": 1, "image_url": "/uploads/batata-palha.jpg"},
    {"name": "Castanha de caju", "price": 8.00, "category": "extras", "required": False, "min_select": 0, "max_select": 1, "image_url": "/uploads/castanha-caju.jpg"},
    {"name": "Castanha do Pará", "price": 8.00, "category": "extras", "required": False, "min_select": 0, "max_select": 1, "image_url": "/uploads/castanha-para.jpg"},
    {"name": "Amêndoas laminadas", "price": 6.00, "category": "extras", "required": False, "min_select": 0, "max_select": 1, "image_url": "/uploads/amendoas.jpg"},
    {"name": "Queijo parmesão", "price": 3.00, "category": "extras", "required": False, "min_select": 0, "max_select": 1, "image_url": "/uploads/parmesao.jpg"},
    {"name": "Croutons", "price": 4.50, "category": "extras", "required": False, "min_select": 0, "max_select": 1, "image_url": "/uploads/croutons.jpg"},
    
    # MOLHOS & CREMES (obrigatório - escolha 1)
    {"name": "Creme de abacate", "price": 5.00, "category": "molhos", "required": True, "min_select": 1, "max_select": 1, "image_url": "/uploads/creme-abacate.jpg"},
    {"name": "Molho verde fit", "price": 5.00, "category": "molhos", "required": True, "min_select": 1, "max_select": 1, "image_url": "/uploads/molho-verde.jpg"},
    {"name": "Molho especial", "price": 5.00, "category": "molhos", "required": True, "min_select": 1, "max_select": 1, "image_url": "/uploads/molho-especial.jpg"},
    {"name": "Mostarda e mel", "price": 5.00, "category": "molhos", "required": True, "min_select": 1, "max_select": 1, "image_url": "/uploads/mostarda-mel.jpg"},
    
    # TEMPEROS (opcional - até 3)
    {"name": "Azeite", "price": 2.00, "category": "temperos", "required": False, "min_select": 0, "max_select": 3, "image_url": "/uploads/azeite.jpg"},
    {"name": "Sal", "price": 0.00, "category": "temperos", "required": False, "min_select": 0, "max_select": 3, "image_url": "/uploads/sal.jpg"},
    {"name": "Orégano", "price": 1.00, "category": "temperos", "required": False, "min_select": 0, "max_select": 3, "image_url": "/uploads/oregano.jpg"},
    
    # ADICIONAIS EXTRAS - PROTEÍNAS
    {"name": "Ovo cozido", "price": 3.50, "category": "proteina", "required": False, "min_select": 0, "max_select": 3, "image_url": "/uploads/ovo.jpg"},
    
    # ADICIONAIS EXTRAS - FRUTAS
    {"name": "Abacate", "price": 3.00, "category": "frutas", "required": False, "min_select": 0, "max_select": 3, "image_url": "/uploads/abacate.jpg"},
    
    # ADICIONAIS EXTRAS - EXTRAS
    {"name": "Gergelim", "price": 2.00, "category": "extras", "required": False, "min_select": 0, "max_select": 3, "image_url": "/uploads/gergelim.jpg"},
]

async def seed_monte_sua_salada():
    """Criar produto e complementos"""
    print(f"Conectando ao banco {DB_NAME} em {DB_HOST}:{DB_PORT}...")
    
    try:
        conn = await asyncpg.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            port=DB_PORT
        )
        
        # 1. Buscar ou criar categoria "Monte Sua Salada"
        category = await conn.fetchrow(
            "SELECT * FROM categories WHERE name = $1",
            "Monte Sua Salada"
        )
        
        if not category:
            # Buscar o primeiro menu ativo
            menu = await conn.fetchrow("SELECT * FROM menus WHERE active = true LIMIT 1")
            if not menu:
                print("❌ Nenhum menu ativo encontrado. Crie um menu primeiro.")
                await conn.close()
                return
            
            category_id = uuid.uuid4()
            await conn.execute(
                """INSERT INTO categories (id, name, description, menu_id, active, "order")
                   VALUES ($1, $2, $3, $4, $5, $6)""",
                category_id, "Monte Sua Salada", 
                "Monte sua salada do seu jeito com ingredientes frescos",
                menu["id"], True, 0
            )
            print(f"✅ Categoria 'Monte Sua Salada' criada")
        else:
            category_id = category["id"]
            print(f"✅ Categoria 'Monte Sua Salada' já existe")
        
        # 2. Verificar se produto já existe
        existing = await conn.fetchrow(
            "SELECT * FROM products WHERE name = $1",
            PRODUTO["name"]
        )
        
        if existing:
            product_id = existing["id"]
            print(f"✅ Produto '{PRODUTO['name']}' já existe")
            # Atualizar preço base se necessário
            await conn.execute(
                "UPDATE products SET price = $1, description = $2 WHERE id = $3",
                PRODUTO["price"], PRODUTO["description"], product_id
            )
        else:
            # 3. Criar produto
            product_id = uuid.uuid4()
            await conn.execute(
                """INSERT INTO products (id, name, description, price, category_id, image_url, tags, active, stock)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)""",
                product_id, PRODUTO["name"], PRODUTO["description"], 
                PRODUTO["price"], category_id, PRODUTO["image_url"],
                PRODUTO["tags"], PRODUTO["active"], -1
            )
            print(f"✅ Produto '{PRODUTO['name']}' criado (ID: {product_id})")
        
        # 4. Criar complementos
        complement_ids = []
        for comp in COMPLEMENTOS:
            # Verificar se já existe
            existing_comp = await conn.fetchrow(
                "SELECT * FROM complements WHERE name = $1 AND category = $2",
                comp["name"], comp["category"]
            )
            
            if existing_comp:
                comp_id = existing_comp["id"]
                # Atualizar todos os campos
                await conn.execute(
                    """UPDATE complements SET 
                        price = $1, required = $2, min_select = $3, 
                        max_select = $4, image_url = $5 
                       WHERE id = $6""",
                    comp["price"], comp.get("required", False),
                    comp.get("min_select", 0), comp.get("max_select", 1),
                    comp.get("image_url", ""), comp_id
                )
            else:
                comp_id = uuid.uuid4()
                await conn.execute(
                    """INSERT INTO complements (id, name, price, category, 
                        required, min_select, max_select, image_url, active)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)""",
                    comp_id, comp["name"], comp["price"], 
                    comp["category"], comp.get("required", False),
                    comp.get("min_select", 0), comp.get("max_select", 1),
                    comp.get("image_url", ""), True
                )
            
            complement_ids.append(str(comp_id))
        
        print(f"✅ {len(COMPLEMENTOS)} complementos criados/atualizados")
        
        # 5. Vincular complementos ao produto
        # Limpar vínculos existentes
        await conn.execute(
            "DELETE FROM product_complements WHERE product_id = $1",
            product_id
        )
        
        # Inserir novos vínculos
        for i, comp_id in enumerate(complement_ids):
            await conn.execute(
                """INSERT INTO product_complements (id, product_id, complement_id, "order")
                   VALUES ($1, $2, $3, $4)""",
                uuid.uuid4(), product_id, uuid.UUID(comp_id), i
            )
        
        print(f"✅ {len(complement_ids)} complementos vinculados ao produto")
        
        # 6. Atualizar produto com complement_ids (para compatibilidade)
        await conn.execute(
            "UPDATE products SET complement_ids = $1 WHERE id = $2",
            [uuid.UUID(cid) for cid in complement_ids], product_id
        )
        
        print(f"\n🎉 'Monte Sua Salada' configurado com sucesso!")
        print(f"   - Preço base: R$ {PRODUTO['price']:.2f}")
        print(f"   - {len(COMPLEMENTOS)} complementos disponíveis")
        print(f"   - 7 categorias de complementos")
        
        await conn.close()
        
    except asyncpg.exceptions.ConnectionDoesNotExistError:
        print(f"❌ Erro: Não foi possível conectar ao banco de dados")
        print(f"   Verifique se o PostgreSQL está rodando")
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(seed_monte_sua_salada())

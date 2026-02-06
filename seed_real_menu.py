"""Script to seed real menu data for Salada Soul"""
import asyncio
import os
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / 'backend' / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_real_data():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Clear existing data
    await db.categories.delete_many({})
    await db.products.delete_many({})
    await db.complements.delete_many({})
    await db.menus.delete_many({})
    
    now = datetime.now(timezone.utc).isoformat()
    
    # ==================== CATEGORIES ====================
    cats = [
        {"id": str(uuid.uuid4()), "name": "Monte sua Salada", "description": "Ingredientes frescos, preparados na hora e com muito sabor. Valor base: R$ 28,50", "icon": "salad", "order": 0, "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Saladas Prontas", "description": "Combinações especiais da casa - não podem ser alteradas", "icon": "bowl", "order": 1, "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Lanches Frios", "description": "Sanduíches saudáveis e saborosos", "icon": "sandwich", "order": 2, "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Bebidas", "description": "Para acompanhar sua refeição", "icon": "drink", "order": 3, "active": True, "created_at": now},
    ]
    await db.categories.insert_many(cats)
    
    # ==================== COMPLEMENTS (Add-ons for Monte sua Salada) ====================
    # These will be grouped by type in the frontend
    complements = [
        # Base de Folhas
        {"id": str(uuid.uuid4()), "name": "Mix de folhas", "price": 5.00, "description": "Base de folhas variadas", "category": "base_folhas", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Alface americana", "price": 3.00, "description": "Alface crocante", "category": "base_folhas", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Rúcula", "price": 3.00, "description": "Folhas de rúcula", "category": "base_folhas", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Repolho roxo", "price": 3.00, "description": "Repolho roxo fatiado", "category": "base_folhas", "active": True, "created_at": now},
        
        # Proteína
        {"id": str(uuid.uuid4()), "name": "Frango", "price": 9.00, "description": "Frango grelhado desfiado", "category": "proteina", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Atum", "price": 8.50, "description": "Atum em pedaços", "category": "proteina", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Carne moída (patinho)", "price": 9.00, "description": "Patinho moído temperado", "category": "proteina", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Carne em cubos (patinho)", "price": 9.00, "description": "Cubos de patinho grelhado", "category": "proteina", "active": True, "created_at": now},
        
        # Legumes & Verduras
        {"id": str(uuid.uuid4()), "name": "Cenoura", "price": 3.00, "description": "Cenoura ralada", "category": "legumes", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Tomate", "price": 2.50, "description": "Tomate em cubos", "category": "legumes", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Tomate cereja", "price": 3.50, "description": "Tomates cereja frescos", "category": "legumes", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Pepino", "price": 3.00, "description": "Pepino em rodelas", "category": "legumes", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Beterraba", "price": 3.50, "description": "Beterraba ralada", "category": "legumes", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Cebola roxa", "price": 2.50, "description": "Cebola roxa em anéis", "category": "legumes", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Salsa", "price": 2.00, "description": "Salsa fresca picada", "category": "legumes", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Milho", "price": 3.00, "description": "Milho em grãos", "category": "legumes", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Brócolis", "price": 3.50, "description": "Brócolis cozido", "category": "legumes", "active": True, "created_at": now},
        
        # Frutas
        {"id": str(uuid.uuid4()), "name": "Manga", "price": 3.50, "description": "Manga em cubos", "category": "frutas", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Maçã", "price": 3.00, "description": "Maçã em fatias", "category": "frutas", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Morango", "price": 4.00, "description": "Morangos frescos", "category": "frutas", "active": True, "created_at": now},
        
        # Extras & Crocância
        {"id": str(uuid.uuid4()), "name": "Batata palha", "price": 3.50, "description": "Batata palha crocante", "category": "extras", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Croutons", "price": 4.50, "description": "Croutons artesanais", "category": "extras", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Queijo parmesão", "price": 3.00, "description": "Parmesão ralado", "category": "extras", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Castanha do Pará", "price": 8.00, "description": "Castanhas do Pará", "category": "extras", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Amêndoas laminadas", "price": 6.00, "description": "Amêndoas em lâminas", "category": "extras", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Castanha de caju", "price": 7.00, "description": "Castanhas de caju", "category": "extras", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Queijo", "price": 4.00, "description": "Queijo em cubos", "category": "extras", "active": True, "created_at": now},
        
        # Molhos & Cremes
        {"id": str(uuid.uuid4()), "name": "Creme de abacate", "price": 5.00, "description": "Creme de abacate cremoso", "category": "molhos", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Molho verde", "price": 5.00, "description": "Molho verde da casa", "category": "molhos", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Molho especial tipo MC", "price": 5.00, "description": "Molho especial exclusivo", "category": "molhos", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Mostarda e mel", "price": 5.00, "description": "Molho mostarda e mel", "category": "molhos", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Molho da casa", "price": 5.00, "description": "Molho especial da casa", "category": "molhos", "active": True, "created_at": now},
        
        # Temperos
        {"id": str(uuid.uuid4()), "name": "Azeite", "price": 2.00, "description": "Azeite extra virgem", "category": "temperos", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Sal", "price": 0.00, "description": "Sal a gosto", "category": "temperos", "active": True, "created_at": now},
        {"id": str(uuid.uuid4()), "name": "Orégano", "price": 1.00, "description": "Orégano seco", "category": "temperos", "active": True, "created_at": now},
    ]
    await db.complements.insert_many(complements)
    
    # Get complement IDs by name for products
    comp_map = {c["name"]: c["id"] for c in complements}
    
    # ==================== PRODUCTS ====================
    products = [
        # Monte sua Salada (product with all complements)
        {
            "id": str(uuid.uuid4()),
            "category_id": cats[0]["id"],
            "name": "Monte sua Salada",
            "description": "Monte sua salada do seu jeito! Escolha sua base de folhas, proteína, legumes, frutas, extras e molhos.",
            "price": 28.50,
            "image_url": "https://customer-assets.emergentagent.com/job_food-ordering-app-11/artifacts/ddurxrzt_0def224a-ae63-4233-b0cc-7909010588f0.jpeg",
            "stock": -1,
            "tags": ["personalizavel", "mais_pedido"],
            "additionals": [],
            "complement_ids": [c["id"] for c in complements],  # All complements available
            "order": 0,
            "active": True,
            "created_at": now,
            "updated_at": now
        },
        
        # Saladas Prontas
        {
            "id": str(uuid.uuid4()),
            "category_id": cats[1]["id"],
            "name": "Salada Harmonia",
            "description": "Mix de folhas, Frango, Cenoura + Milho + Tomate, Manga, Queijo",
            "price": 35.50,
            "image_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400",
            "stock": -1,
            "tags": ["recomendado"],
            "additionals": [],
            "complement_ids": [],
            "order": 0,
            "active": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "category_id": cats[1]["id"],
            "name": "Salada Aura Verde",
            "description": "Mix de folhas, Frango, Tomate cereja + Pepino + Beterraba, Maçã, Croutons, Molho da casa",
            "price": 35.50,
            "image_url": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400",
            "stock": -1,
            "tags": ["mais_pedido"],
            "additionals": [],
            "complement_ids": [],
            "order": 1,
            "active": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "category_id": cats[1]["id"],
            "name": "Salada Essência",
            "description": "Mix de folhas, Atum, Cenoura + Cebola roxa + Milho, Maçã, Croutons, Molho especial",
            "price": 35.90,
            "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
            "stock": -1,
            "tags": [],
            "additionals": [],
            "complement_ids": [],
            "order": 2,
            "active": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "category_id": cats[1]["id"],
            "name": "Salada Zen",
            "description": "Mix de folhas, Patinho moído, Cenoura + Brócolis + Beterraba, Morango, Batata palha, Mostarda e mel",
            "price": 37.50,
            "image_url": "https://images.unsplash.com/photo-1607532941433-304659e8198a?w=400",
            "stock": -1,
            "tags": [],
            "additionals": [],
            "complement_ids": [],
            "order": 3,
            "active": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "category_id": cats[1]["id"],
            "name": "Salada Prana",
            "description": "Mix de folhas, Carne em cubos, Tomate cereja + Cenoura + Brócolis, Manga, Castanha de caju, Mostarda e mel",
            "price": 38.50,
            "image_url": "https://images.unsplash.com/photo-1604497181015-76590d828b75?w=400",
            "stock": -1,
            "tags": ["recomendado"],
            "additionals": [],
            "complement_ids": [],
            "order": 4,
            "active": True,
            "created_at": now,
            "updated_at": now
        },
        
        # Lanches Frios
        {
            "id": str(uuid.uuid4()),
            "category_id": cats[2]["id"],
            "name": "Sanduíche Alma Verde",
            "description": "Pão integral, Patê artesanal de frango 70g, Cenoura, Alface",
            "price": 26.90,
            "image_url": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400",
            "stock": -1,
            "tags": [],
            "additionals": [],
            "complement_ids": [],
            "order": 0,
            "active": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "category_id": cats[2]["id"],
            "name": "Sanduíche Brisa do Mar",
            "description": "Pão integral, Patê artesanal de atum 40g, sem óleo, Cenoura, Alface",
            "price": 25.90,
            "image_url": "https://images.unsplash.com/photo-1554433607-66b5efe9d304?w=400",
            "stock": -1,
            "tags": [],
            "additionals": [],
            "complement_ids": [],
            "order": 1,
            "active": True,
            "created_at": now,
            "updated_at": now
        },
        
        # Bebidas
        {
            "id": str(uuid.uuid4()),
            "category_id": cats[3]["id"],
            "name": "Guaraná Antarctica Zero 269ml",
            "description": "Refrigerante zero açúcar",
            "price": 5.90,
            "image_url": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400",
            "stock": -1,
            "tags": [],
            "additionals": [],
            "complement_ids": [],
            "order": 0,
            "active": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "category_id": cats[3]["id"],
            "name": "Coca-Cola Zero 250ml",
            "description": "Refrigerante zero açúcar",
            "price": 5.90,
            "image_url": "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400",
            "stock": -1,
            "tags": [],
            "additionals": [],
            "complement_ids": [],
            "order": 1,
            "active": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "category_id": cats[3]["id"],
            "name": "Suco de Laranja 500ml",
            "description": "Suco natural de laranja",
            "price": 7.50,
            "image_url": "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400",
            "stock": -1,
            "tags": ["recomendado"],
            "additionals": [],
            "complement_ids": [],
            "order": 2,
            "active": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "category_id": cats[3]["id"],
            "name": "Água com Gás 500ml",
            "description": "Água mineral gaseificada",
            "price": 5.00,
            "image_url": "https://images.unsplash.com/photo-1559839914-17aae19cec71?w=400",
            "stock": -1,
            "tags": [],
            "additionals": [],
            "complement_ids": [],
            "order": 3,
            "active": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "category_id": cats[3]["id"],
            "name": "Água Mineral sem Gás 500ml",
            "description": "Água mineral natural",
            "price": 5.00,
            "image_url": "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400",
            "stock": -1,
            "tags": [],
            "additionals": [],
            "complement_ids": [],
            "order": 4,
            "active": True,
            "created_at": now,
            "updated_at": now
        },
    ]
    await db.products.insert_many(products)
    
    # ==================== MENU ====================
    await db.menus.insert_one({
        "id": str(uuid.uuid4()),
        "name": "Cardápio Salada Soul",
        "description": "Nutre o corpo, alimenta a alma",
        "category_ids": [c["id"] for c in cats],
        "active": True,
        "order": 0,
        "created_at": now
    })
    
    # Ensure admin user exists
    admin_exists = await db.admin_users.find_one({"email": "admin@saladasoul.com"})
    if not admin_exists:
        admin_password = pwd_context.hash("admin123")
        await db.admin_users.insert_one({
            "id": f"admin_{uuid.uuid4().hex[:12]}",
            "email": "admin@saladasoul.com",
            "name": "Admin",
            "role": "admin",
            "password_hash": admin_password,
            "picture": "",
            "created_at": now
        })
    
    print("✅ Real menu data seeded successfully!")
    print(f"   - {len(cats)} categories")
    print(f"   - {len(products)} products")
    print(f"   - {len(complements)} complements/add-ons")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_real_data())

"""
Servidor completo para Railway - Salada Soul API
"""
import os
import logging
import asyncio
import json
import uuid
import math
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import re

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Verificar variáveis de ambiente
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    logger.error("DATABASE_URL não configurada! API funcionará com funcionalidade limitada.")

logger.info("Using DATABASE_URL from environment")

JWT_SECRET = os.environ.get('JWT_SECRET', 'default-secret-change-in-production')

from fastapi import FastAPI, Request, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import asyncpg
import jwt
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def serialize_product(row: dict) -> dict:
    """Garante que campos JSONB (additionals) sejam retornados como lista Python"""
    d = dict(row)
    additionals = d.get('additionals')
    if isinstance(additionals, str):
        try:
            d['additionals'] = json.loads(additionals)
        except Exception:
            d['additionals'] = []
    elif additionals is None:
        d['additionals'] = []
    return d

app = FastAPI(
    title="Salada Soul API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS - Origens permitidas
# Inclui domínios do Vercel e Railway por padrão
DEFAULT_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://saladasoul.com",
    "https://www.saladasoul.com",
    "https://saladasoul.shop",
    "https://www.saladasoul.shop",
    "https://salada-soul-admin.vercel.app",
    "https://salada-soul.vercel.app",
]

# Adicionar origens da variável de ambiente se existir
CORS_ORIGINS_ENV = os.environ.get('CORS_ORIGINS', '')
if CORS_ORIGINS_ENV:
    env_origins = [origin.strip() for origin in CORS_ORIGINS_ENV.split(',') if origin.strip()]
    DEFAULT_ORIGINS.extend(env_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=DEFAULT_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database pool
db_pool = None


# ============================================
# PYDANTIC MODELS
# ============================================

class LoginRequest(BaseModel):
    email: str
    password: str


class CustomerLoginRequest(BaseModel):
    phone: str
    name: Optional[str] = None


class OrderItem(BaseModel):
    product_id: str
    name: str
    price: float
    quantity: int
    complements: Optional[List[dict]] = []


class CreateOrderRequest(BaseModel):
    customer_name: str
    customer_phone: str
    delivery_type: str
    address: Optional[str] = None
    neighborhood: Optional[str] = None
    items: List[OrderItem]
    subtotal: float
    delivery_fee: float = 0
    total: float
    observation: Optional[str] = None
    payment_method: Optional[str] = "pix"


class UpdateOrderStatusRequest(BaseModel):
    status: str


class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    category_id: Optional[str] = None
    image_url: Optional[str] = None
    stock: int = -1
    tags: Optional[List[str]] = []
    additionals: Optional[List[dict]] = []  # [{name, price, category, required, min_select, max_select, ...}]
    complement_ids: Optional[List[str]] = []
    order: int = 0
    active: bool = True


class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    menu_id: Optional[str] = None
    order: int = 0
    active: bool = True


class MenuCreate(BaseModel):
    name: str
    description: Optional[str] = None
    order: int = 0
    active: bool = True


class ComplementCreate(BaseModel):
    name: str
    price: float
    description: Optional[str] = None
    category: Optional[str] = None
    active: bool = True


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    favorites: Optional[List[dict]] = None


# ============================================
# DATABASE HELPERS
# ============================================

async def get_db_pool():
    """Get or create database pool lazily"""
    global db_pool
    if db_pool is None:
        try:
            logger.info("Connecting to database...")
            dsn = DATABASE_URL
            if 'sslmode' not in dsn:
                dsn += "?sslmode=require"
            logger.info(f"Using DSN: {dsn.split('@')[0]}@****")
            db_pool = await asyncpg.create_pool(
                dsn,
                ssl='require',
                min_size=1,
                max_size=5,
                command_timeout=60,
                timeout=30,
                statement_cache_size=0  # Necessário para pgbouncer com pool_mode=transaction
            )
            logger.info("Database pool created successfully")
        except Exception as e:
            logger.error(f"Failed to create database pool: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
    return db_pool


async def connect_db_background():
    """Connect to database in background"""
    global db_pool
    await asyncio.sleep(1)
    logger.info("Background database connection starting...")
    try:
        await get_db_pool()
        logger.info("Database connected successfully!")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        await asyncio.sleep(10)
        try:
            await get_db_pool()
            logger.info("Database connected on retry!")
        except Exception as e2:
            logger.error(f"Database connection retry failed: {e2}")


# ============================================
# AUTH HELPERS
# ============================================

async def get_current_user(request: Request):
    """Extract and validate JWT token"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = auth_header.split(' ')[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def create_token(user_id: str, email: str, role: str = 'admin'):
    """Create JWT token"""
    payload = {
        'sub': user_id,
        'email': email,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')


# ============================================
# STARTUP/SHUTDOWN
# ============================================

@app.on_event("startup")
async def startup():
    logger.info("Starting up Salada Soul API")
    logger.info(f"DATABASE_URL configured: {bool(DATABASE_URL)}")
    logger.info("Scheduling background database connection...")
    asyncio.create_task(connect_db_background())
    logger.info("Server ready to accept requests")


@app.on_event("shutdown")
async def shutdown():
    global db_pool
    if db_pool:
        await db_pool.close()
        logger.info("Database pool closed")


# ============================================
# HEALTH CHECKS
# ============================================

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat(), "version": "1.0.0"}


@app.get("/health/db")
async def health_check_db():
    try:
        if db_pool:
            async with db_pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            return {"status": "healthy", "database": "connected"}
        return {"status": "unhealthy", "database": "pool not ready"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}


# ============================================
# PUBLIC ENDPOINTS
# ============================================

@app.get("/api/products")
async def get_products(category_id: Optional[str] = None):
    """Lista produtos ativos"""
    if not db_pool:
        return []
    async with db_pool.acquire() as conn:
        query = "SELECT * FROM products WHERE active = TRUE"
        params = []
        if category_id:
            query += " AND category_id = $1"
            params.append(category_id)
        query += ' ORDER BY "order", name'
        rows = await conn.fetch(query, *params)
        return [serialize_product(r) for r in rows]


@app.get("/api/products/{product_id}")
async def get_product(product_id: str):
    """Detalhes de um produto"""
    if not db_pool:
        raise HTTPException(status_code=404, detail="Product not found")
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM products WHERE id = $1", product_id)
        if not row:
            raise HTTPException(status_code=404, detail="Product not found")
        return serialize_product(row)


@app.get("/api/categories")
async def get_categories():
    """Lista categorias ativas"""
    if not db_pool:
        return []
    async with db_pool.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM categories WHERE active = TRUE ORDER BY "order"')
        return [dict(r) for r in rows]


@app.get("/api/menus")
async def get_menus():
    """Lista menus ativos"""
    if not db_pool:
        return []
    async with db_pool.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM menus WHERE active = TRUE ORDER BY "order"')
        return [dict(r) for r in rows]


@app.get("/api/menus/{menu_id}/categories")
async def get_menu_categories(menu_id: str):
    """Lista categorias de um menu"""
    if not db_pool:
        return []
    try:
        uuid.UUID(menu_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Menu not found")
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT * FROM categories WHERE menu_id = $1 AND active = TRUE ORDER BY "order"',
            uuid.UUID(menu_id)
        )
        return [dict(r) for r in rows]


@app.get("/api/categories/{category_id}/products")
async def get_category_products(category_id: str):
    """Lista produtos de uma categoria"""
    if not db_pool:
        return []
    try:
        uuid.UUID(category_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Category not found")
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT * FROM products WHERE category_id = $1 AND active = TRUE ORDER BY "order"',
            uuid.UUID(category_id)
        )
        return [serialize_product(r) for r in rows]


@app.get("/api/complements")
async def get_complements():
    """Lista complementos ativos"""
    if not db_pool:
        return []
    async with db_pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM complements WHERE active = TRUE ORDER BY name")
        return [dict(r) for r in rows]


@app.get("/api/banners")
async def get_banners():
    """Lista banners ativos"""
    if not db_pool:
        return []
    async with db_pool.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM banners WHERE active = TRUE ORDER BY "order"')
        return [dict(r) for r in rows]


@app.get("/api/combos")
async def get_combos():
    """Lista combos ativos"""
    if not db_pool:
        return []
    async with db_pool.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM combos WHERE active = TRUE ORDER BY "order"')
        return [dict(r) for r in rows]


@app.get("/api/delivery-settings")
async def get_delivery_settings():
    """Configurações de entrega"""
    if not db_pool:
        return {}
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM delivery_settings WHERE id = 1")
        return dict(row) if row else {}


@app.get("/api/pix-settings")
async def get_pix_settings():
    """Configurações do PIX"""
    if not db_pool:
        return {}
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM pix_settings WHERE id = 1")
        return dict(row) if row else {}


# ============================================
# DELIVERY DISTANCE CALCULATION
# ============================================

def calculate_distance_km(lat1, lng1, lat2, lng2) -> float:
    """Calcula a distância em km entre duas coordenadas usando a fórmula de Haversine.
    Converte Decimal para float automaticamente."""
    R = 6371  # Raio da Terra em km
    
    # Converter para float (lida com Decimal do banco de dados)
    lat1 = float(lat1)
    lng1 = float(lng1)
    lat2 = float(lat2)
    lng2 = float(lng2)
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)
    
    a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


async def geocode_address(address: str) -> Optional[dict]:
    """Geocodifica um endereço usando a API Nominatim (OpenStreetMap).
    Tenta múltiplas variações do endereço se a primeira falhar."""
    
    if not address or len(address.strip()) < 5:
        logger.warning(f"Endereço muito curto ou vazio: '{address}'")
        return None
    
    address = address.strip()
    
    # Lista de variações do endereço para tentar (do mais específico ao mais genérico)
    variations = [address]  # Endereço original
    
    # Remover "I" do bairro se existir
    if "Jardim Santa Clara I" in address:
        variations.append(address.replace("Jardim Santa Clara I", "Jardim Santa Clara"))
    
    # Tentar com acento
    if "Jose" in address or "jose" in address:
        variations.append(address.replace("Jose", "José").replace("jose", "josé"))
    
    # Versão simplificada (primeiras 6 palavras)
    words = address.split()
    if len(words) > 6:
        variations.append(' '.join(words[:6]))
    
    # Tentar extrair rua e cidade para uma busca mais genérica
    try:
        street_match = re.search(r'^(Rua|Avenida|Av\.?|Travessa|Tv\.?|Alameda|Al\.?)\s+([^,\d]+)', address, re.IGNORECASE)
        city_match = re.search(r'(Rondon[óo]polis)', address, re.IGNORECASE)
        
        if street_match and city_match:
            street = street_match.group(0)
            city = city_match.group(1)
            variations.append(f"{street} {city} MT")
    except Exception as e:
        logger.warning(f"Erro ao extrair componentes do endereço: {e}")
    
    # Remover duplicatas mantendo a ordem
    seen = set()
    unique_variations = []
    for addr in variations:
        if addr not in seen:
            seen.add(addr)
            unique_variations.append(addr)
    
    async with httpx.AsyncClient() as client:
        for i, addr in enumerate(unique_variations):
            try:
                logger.info(f"Tentativa {i+1}/{len(unique_variations)} de geocodificação: {addr[:80]}...")
                response = await client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={
                        "q": addr,
                        "format": "json",
                        "limit": 1,
                        "countrycodes": "br"
                    },
                    headers={"User-Agent": "SaladaSoul/1.0"},
                    timeout=10.0
                )
                response.raise_for_status()
                data = response.json()
                
                if data and len(data) > 0:
                    logger.info(f"Geocodificação bem-sucedida na tentativa {i+1}")
                    return {
                        "lat": float(data[0]["lat"]),
                        "lng": float(data[0]["lon"]),
                        "display_name": data[0]["display_name"]
                    }
            except Exception as e:
                logger.warning(f"Erro na tentativa {i+1}: {e}")
    
    logger.error(f"Todas as {len(unique_variations)} tentativas de geocodificação falharam para: {address[:80]}")
    return None


@app.get("/api/calculate-delivery-fee")
async def calculate_delivery_fee(address: str):
    """
    Calcula a taxa de entrega baseada na distância do endereço até o restaurante.
    Usa geocodificação via OpenStreetMap (Nominatim).
    """
    try:
        if not db_pool:
            raise HTTPException(status_code=500, detail="Database not available")
        
        logger.info(f"Calculando taxa de entrega para endereço: {address}")
        
        async with db_pool.acquire() as conn:
            # Buscar configurações do restaurante
            settings = await conn.fetchrow("SELECT * FROM delivery_settings WHERE id = 1")
            if not settings:
                logger.error("Configurações de entrega não encontradas no banco de dados")
                raise HTTPException(status_code=500, detail="Configurações de entrega não encontradas")
            
            settings_dict = dict(settings)
            logger.info(f"Configurações carregadas: restaurant_address={settings_dict.get('restaurant_address')}, lat={settings_dict.get('restaurant_lat')}, lng={settings_dict.get('restaurant_lng')}")
            
            # Verificar se temos as coordenadas do restaurante
            restaurant_lat = settings_dict.get("restaurant_lat")
            restaurant_lng = settings_dict.get("restaurant_lng")
            restaurant_address = settings_dict.get("restaurant_address", "")
            
            # Se não temos coordenadas, tentar geocodificar o endereço do restaurante
            if restaurant_lat is None or restaurant_lng is None:
                if not restaurant_address:
                    logger.error("Endereço do restaurante não configurado nas configurações de entrega")
                    raise HTTPException(status_code=500, detail="Endereço do restaurante não configurado. Por favor, configure o endereço no painel administrativo em Configurações > Entrega.")
                
                logger.info(f"Geocodificando endereço do restaurante: {restaurant_address}")
                restaurant_geo = await geocode_address(restaurant_address)
                if not restaurant_geo:
                    logger.error(f"Não foi possível geocodificar o endereço do restaurante: {restaurant_address}")
                    raise HTTPException(status_code=400, detail=f"Não foi possível localizar o endereço do restaurante configurado: '{restaurant_address}'. Verifique o endereço nas configurações.")
                
                restaurant_lat = restaurant_geo["lat"]
                restaurant_lng = restaurant_geo["lng"]
                logger.info(f"Coordenadas do restaurante obtidas: lat={restaurant_lat}, lng={restaurant_lng}")
                
                # Salvar coordenadas para uso futuro
                await conn.execute(
                    "UPDATE delivery_settings SET restaurant_lat = $1, restaurant_lng = $2 WHERE id = 1",
                    restaurant_lat, restaurant_lng
                )
            
            # Geocodificar o endereço do cliente
            logger.info(f"Geocodificando endereço do cliente: {address}")
            customer_geo = await geocode_address(address)
            if not customer_geo:
                logger.error(f"Não foi possível geocodificar o endereço do cliente: {address}")
                raise HTTPException(status_code=400, detail="Não foi possível localizar o endereço informado. Verifique se o endereço está completo e correto (rua, número, bairro, cidade).")
            
            # Calcular distância
            distance_km = calculate_distance_km(
                restaurant_lat, restaurant_lng,
                customer_geo["lat"], customer_geo["lng"]
            )
            
            # Verificar distância máxima
            max_distance = settings_dict.get("max_delivery_distance", 10.0)
            if distance_km > max_distance:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Distância excede o limite de entrega ({max_distance} km). Distância calculada: {distance_km:.1f} km"
                )
            
            # Calcular taxa baseada na tabela de taxas
            distance_rates = settings_dict.get("distance_rates", [])
            delivery_fee = settings_dict.get("delivery_fee", 5.0)  # Taxa padrão
            
            # Converter distance_rates de string JSON para lista se necessário
            if isinstance(distance_rates, str):
                try:
                    import json
                    distance_rates = json.loads(distance_rates)
                except json.JSONDecodeError:
                    distance_rates = []
            
            if distance_rates and len(distance_rates) > 0:
                # Ordenar por max_distance
                sorted_rates = sorted(distance_rates, key=lambda x: x.get("max_distance", float("inf")) if isinstance(x, dict) else float("inf"))
                
                # Encontrar a taxa adequada
                for rate in sorted_rates:
                    if isinstance(rate, dict) and distance_km <= rate.get("max_distance", float("inf")):
                        delivery_fee = rate.get("fee", delivery_fee)
                        break
            
            return {
                "distance_km": round(distance_km, 2),
                "delivery_fee": delivery_fee,
                "customer_location": {
                    "lat": customer_geo["lat"],
                    "lng": customer_geo["lng"],
                    "display_name": customer_geo["display_name"]
                },
                "restaurant_location": {
                    "lat": restaurant_lat,
                    "lng": restaurant_lng
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro inesperado ao calcular taxa de entrega: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno ao calcular taxa de entrega: {str(e)}")


# ============================================
# AUTH ENDPOINTS
# ============================================

@app.post("/api/auth/login")
async def login(request: LoginRequest):
    """Login do administrador"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    async with db_pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, email, name, role, password_hash FROM admin_users WHERE email = $1",
            request.email.lower()
        )

        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if not pwd_context.verify(request.password, user['password_hash']):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token = create_token(user['id'], user['email'], user['role'])

        # Create session
        session_token = str(uuid.uuid4())
        await conn.execute(
            "INSERT INTO sessions (session_token, user_id, expires_at) VALUES ($1, $2, $3)",
            session_token, user['id'], datetime.now(timezone.utc) + timedelta(days=7)
        )

        return {
            "token": token,
            "user": {
                "id": user['id'],
                "email": user['email'],
                "name": user['name'],
                "role": user['role']
            }
        }


@app.get("/api/auth/me")
async def get_me(user=Depends(get_current_user)):
    """Dados do usuário logado"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, email, name, role, picture, created_at FROM admin_users WHERE id = $1",
            user['sub']
        )
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        return dict(row)


@app.post("/api/auth/logout")
async def logout(user=Depends(get_current_user)):
    """Logout"""
    return {"success": True}


# ============================================
# CUSTOMER ENDPOINTS
# ============================================

@app.post("/api/customers/login")
async def customer_login(request: CustomerLoginRequest):
    """Login/registro do cliente por telefone"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    phone = request.phone.replace("\\D", "")

    async with db_pool.acquire() as conn:
        customer = await conn.fetchrow(
            "SELECT * FROM customers WHERE phone = $1", phone
        )

        if customer:
            if request.name:
                await conn.execute(
                    "UPDATE customers SET name = $1 WHERE phone = $2",
                    request.name, phone
                )
                customer = await conn.fetchrow("SELECT * FROM customers WHERE phone = $1", phone)
            return {**dict(customer), "is_new": False}
        else:
            if not request.name:
                raise HTTPException(status_code=400, detail="Name is required for new customers")

            new_customer = await conn.fetchrow(
                """INSERT INTO customers (name, phone, tags) 
                   VALUES ($1, $2, ARRAY['novo']) 
                   RETURNING *""",
                request.name, phone
            )
            return {**dict(new_customer), "is_new": True}


@app.get("/api/customers/{phone}/orders")
async def get_customer_orders(phone: str, limit: int = 5):
    """Últimos pedidos do cliente"""
    if not db_pool:
        return []
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT * FROM orders 
               WHERE customer_phone = $1 
               ORDER BY created_at DESC LIMIT $2""",
            phone.replace("\\D", ""), limit
        )
        return [dict(r) for r in rows]


@app.get("/api/customers/{phone}/reorder-suggestions")
async def get_reorder_suggestions(phone: str):
    """Sugestões de pedido baseadas no histórico"""
    if not db_pool:
        return []
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT items FROM orders 
               WHERE customer_phone = $1 AND status = 'entregue'
               ORDER BY created_at DESC LIMIT 10""",
            phone.replace("\\D", "")
        )

        product_counts = {}
        for row in rows:
            items = row['items'] if isinstance(row['items'], list) else json.loads(row['items'])
            for item in items:
                pid = item.get('product_id')
                if pid:
                    product_counts[pid] = product_counts.get(pid, 0) + 1

        if not product_counts:
            return []

        product_ids = list(product_counts.keys())[:5]
        products = await conn.fetch(
            "SELECT * FROM products WHERE id = ANY($1) AND active = TRUE",
            product_ids
        )
        return [dict(p) for p in products]


@app.get("/api/customers/{phone}")
async def get_customer(phone: str):
    """Buscar cliente por telefone"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")
    
    phone = phone.replace("\\D", "")
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM customers WHERE phone = $1", phone)
        if not row:
            raise HTTPException(status_code=404, detail="Customer not found")
        return dict(row)


@app.put("/api/customers/{phone}")
async def update_customer(phone: str, request: CustomerUpdate):
    """Atualizar dados do cliente"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    phone = phone.replace("\\D", "")
    update_fields = []
    params = [phone]
    idx = 2

    if request.name:
        update_fields.append(f"name = ${idx}")
        params.append(request.name)
        idx += 1
    if request.address:
        update_fields.append(f"address = ${idx}")
        params.append(request.address)
        idx += 1
    if request.favorites is not None:
        update_fields.append(f"favorites = ${idx}::jsonb")
        params.append(json.dumps(request.favorites))
        idx += 1

    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    async with db_pool.acquire() as conn:
        await conn.execute(
            f"UPDATE customers SET {', '.join(update_fields)} WHERE phone = $1",
            *params
        )
        row = await conn.fetchrow("SELECT * FROM customers WHERE phone = $1", phone)
        return dict(row) if row else None


# ============================================
# ORDER ENDPOINTS
# ============================================

@app.post("/api/orders")
async def create_order(request: CreateOrderRequest):
    """Criar novo pedido"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    async with db_pool.acquire() as conn:
        order_number = await conn.fetchval(
            "UPDATE counters SET value = value + 1 WHERE name = 'order_number' RETURNING value"
        )

        order_id = await conn.fetchval(
            """INSERT INTO orders 
               (order_number, customer_name, customer_phone, delivery_type, address, 
                neighborhood, items, subtotal, delivery_fee, total, status, payment_status, observation)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'aguardando', 'pendente', $11)
               RETURNING id""",
            order_number,
            request.customer_name,
            request.customer_phone.replace("\\D", ""),
            request.delivery_type,
            request.address,
            request.neighborhood,
            json.dumps([item.dict() for item in request.items]),
            request.subtotal,
            request.delivery_fee,
            request.total,
            request.observation
        )

        await conn.execute(
            """INSERT INTO customers (name, phone, orders_count, last_order_date) 
               VALUES ($1, $2, 1, NOW())
               ON CONFLICT (phone) DO UPDATE SET 
               orders_count = customers.orders_count + 1,
               last_order_date = NOW(),
               name = EXCLUDED.name""",
            request.customer_name,
            request.customer_phone.replace("\\D", "")
        )

        return {
            "id": str(order_id),
            "order_number": order_number,
            "status": "aguardando"
        }


@app.get("/api/orders/{order_id}")
async def get_order(order_id: str):
    """Buscar pedido por ID"""
    if not db_pool:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Validar UUID
    try:
        uuid.UUID(order_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Order not found")
    
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM orders WHERE id = $1", order_id)
        if not row:
            raise HTTPException(status_code=404, detail="Order not found")
        return dict(row)


@app.post("/api/orders/{order_id}/rate")
async def rate_order(order_id: str, rating: int = Form(...), comment: Optional[str] = Form(None)):
    """Avaliar pedido"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    async with db_pool.acquire() as conn:
        await conn.execute(
            "UPDATE orders SET rating = $1, rating_comment = $2 WHERE id = $3",
            rating, comment, order_id
        )
        return {"success": True}


# ============================================
# ADMIN - ORDERS
# ============================================

@app.get("/api/admin/orders")
async def admin_get_orders(status: Optional[str] = None, user=Depends(get_current_user)):
    """Listar pedidos (admin)"""
    if not db_pool:
        return []

    async with db_pool.acquire() as conn:
        query = "SELECT * FROM orders"
        params = []
        if status:
            query += " WHERE status = $1"
            params.append(status)
        query += " ORDER BY created_at DESC LIMIT 100"
        rows = await conn.fetch(query, *params)
        return [dict(r) for r in rows]


@app.put("/api/admin/orders/{order_id}/status")
async def admin_update_order_status(order_id: str, request: UpdateOrderStatusRequest, user=Depends(get_current_user)):
    """Atualizar status do pedido"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    valid_statuses = ['aguardando', 'confirmado', 'preparando', 'saiu_entrega', 'entregue', 'cancelado']
    if request.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid: {valid_statuses}")

    async with db_pool.acquire() as conn:
        await conn.execute(
            "UPDATE orders SET status = $1 WHERE id = $2",
            request.status, order_id
        )
        return {"success": True}


@app.put("/api/admin/orders/{order_id}/payment")
async def admin_mark_paid(order_id: str, user=Depends(get_current_user)):
    """Marcar pedido como pago"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    async with db_pool.acquire() as conn:
        await conn.execute(
            "UPDATE orders SET payment_status = 'pago' WHERE id = $1",
            order_id
        )
        return {"success": True}


# ============================================
# ADMIN - PRODUCTS
# ============================================

@app.get("/api/admin/products")
async def admin_get_products(user=Depends(get_current_user)):
    """Listar todos os produtos (admin)"""
    if not db_pool:
        return []
    async with db_pool.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM products ORDER BY "order", name')
        return [serialize_product(r) for r in rows]


@app.post("/api/admin/products")
async def admin_create_product(request: ProductCreate, user=Depends(get_current_user)):
    """Criar produto"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO products 
               (name, description, price, category_id, image_url, stock, tags, additionals, complement_ids, "order", active)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
               RETURNING *""",
            request.name,
            request.description,
            request.price,
            request.category_id,
            request.image_url,
            request.stock,
            request.tags,
            json.dumps(request.additionals),
            request.complement_ids,
            request.order,
            request.active
        )
        return dict(row)


@app.put("/api/admin/products/{product_id}")
async def admin_update_product(product_id: str, request: ProductCreate, user=Depends(get_current_user)):
    """Atualizar produto"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """UPDATE products SET 
               name = $1, description = $2, price = $3, category_id = $4, image_url = $5,
               stock = $6, tags = $7, additionals = $8, complement_ids = $9, "order" = $10, active = $11
               WHERE id = $12 RETURNING *""",
            request.name, request.description, request.price, request.category_id,
            request.image_url, request.stock, request.tags, json.dumps(request.additionals),
            request.complement_ids, request.order, request.active, product_id
        )
        return dict(row) if row else None


@app.delete("/api/admin/products/{product_id}")
async def admin_delete_product(product_id: str, user=Depends(get_current_user)):
    """Excluir produto (soft delete)"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    async with db_pool.acquire() as conn:
        await conn.execute("UPDATE products SET active = FALSE WHERE id = $1", product_id)
        return {"success": True}


# ============================================
# ADMIN - CATEGORIES
# ============================================

@app.get("/api/admin/categories")
async def admin_get_categories(user=Depends(get_current_user)):
    """Listar todas as categorias (admin)"""
    if not db_pool:
        return []
    async with db_pool.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM categories ORDER BY "order"')
        return [dict(r) for r in rows]


@app.post("/api/admin/categories")
async def admin_create_category(request: CategoryCreate, user=Depends(get_current_user)):
    """Criar categoria"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO categories (name, description, icon, menu_id, "order", active)
               VALUES ($1, $2, $3, $4, $5, $6) RETURNING *""",
            request.name, request.description, request.icon, request.menu_id, request.order, request.active
        )
        return dict(row)


@app.put("/api/admin/categories/{category_id}")
async def admin_update_category(category_id: str, request: CategoryCreate, user=Depends(get_current_user)):
    """Atualizar categoria"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """UPDATE categories SET name = $1, description = $2, icon = $3, menu_id = $4, "order" = $5, active = $6
               WHERE id = $7 RETURNING *""",
            request.name, request.description, request.icon, request.menu_id, request.order, request.active, category_id
        )
        return dict(row) if row else None


@app.delete("/api/admin/categories/{category_id}")
async def admin_delete_category(category_id: str, user=Depends(get_current_user)):
    """Excluir categoria (soft delete)"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    async with db_pool.acquire() as conn:
        await conn.execute("UPDATE categories SET active = FALSE WHERE id = $1", category_id)
        return {"success": True}


# ============================================
# ADMIN - MENUS
# ============================================

@app.get("/api/admin/menus")
async def admin_get_menus(user=Depends(get_current_user)):
    """Listar todos os menus (admin)"""
    if not db_pool:
        return []
    async with db_pool.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM menus ORDER BY "order"')
        return [dict(r) for r in rows]


@app.post("/api/admin/menus")
async def admin_create_menu(request: MenuCreate, user=Depends(get_current_user)):
    """Criar menu"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            'INSERT INTO menus (name, description, "order", active) VALUES ($1, $2, $3, $4) RETURNING *',
            request.name, request.description, request.order, request.active
        )
        return dict(row)


@app.put("/api/admin/menus/{menu_id}")
async def admin_update_menu(menu_id: str, request: MenuCreate, user=Depends(get_current_user)):
    """Atualizar menu"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            'UPDATE menus SET name = $1, description = $2, "order" = $3, active = $4 WHERE id = $5 RETURNING *',
            request.name, request.description, request.order, request.active, menu_id
        )
        return dict(row) if row else None


@app.delete("/api/admin/menus/{menu_id}")
async def admin_delete_menu(menu_id: str, user=Depends(get_current_user)):
    """Excluir menu"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    async with db_pool.acquire() as conn:
        await conn.execute("DELETE FROM menus WHERE id = $1", menu_id)
        return {"success": True}


# ============================================
# ADMIN - COMPLEMENTS
# ============================================

@app.get("/api/admin/complements")
async def admin_get_complements(user=Depends(get_current_user)):
    """Listar todos os complementos (admin)"""
    if not db_pool:
        return []
    async with db_pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM complements ORDER BY name")
        return [dict(r) for r in rows]


@app.post("/api/admin/complements")
async def admin_create_complement(request: ComplementCreate, user=Depends(get_current_user)):
    """Criar complemento"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO complements (name, price, description, category, active) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            request.name, request.price, request.description, request.category, request.active
        )
        return dict(row)


@app.put("/api/admin/complements/{complement_id}")
async def admin_update_complement(complement_id: str, request: ComplementCreate, user=Depends(get_current_user)):
    """Atualizar complemento"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE complements SET name = $1, price = $2, description = $3, category = $4, active = $5 WHERE id = $6 RETURNING *",
            request.name, request.price, request.description, request.category, request.active, complement_id
        )
        return dict(row) if row else None


@app.delete("/api/admin/complements/{complement_id}")
async def admin_delete_complement(complement_id: str, user=Depends(get_current_user)):
    """Excluir complemento"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    async with db_pool.acquire() as conn:
        await conn.execute("UPDATE complements SET active = FALSE WHERE id = $1", complement_id)
        return {"success": True}


# ============================================
# ADMIN - COMPLEMENT CATEGORIES
# ============================================

@app.get("/api/admin/complement-categories")
async def admin_get_complement_categories(user=Depends(get_current_user)):
    """Listar todas as categorias de complemento"""
    if not db_pool:
        return []
    async with db_pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM complement_categories ORDER BY order_index, name")
        return [dict(r) for r in rows]


@app.post("/api/admin/complement-categories")
async def admin_create_complement_category(
    key: str = Form(...),
    name: str = Form(...),
    icon: str = Form(""),
    order_index: int = Form(0),
    required: bool = Form(False),
    min_select: int = Form(0),
    max_select: int = Form(1),
    user=Depends(get_current_user)
):
    """Criar categoria de complemento"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")
    
    async with db_pool.acquire() as conn:
        # Verificar se key já existe
        existing = await conn.fetchrow("SELECT id FROM complement_categories WHERE key = $1", key)
        if existing:
            raise HTTPException(status_code=400, detail="Já existe uma categoria com este código")
        
        row = await conn.fetchrow(
            """INSERT INTO complement_categories 
               (key, name, icon, order_index, required, min_select, max_select) 
               VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *""",
            key, name, icon, order_index, required, min_select, max_select
        )
        return dict(row)


@app.put("/api/admin/complement-categories/{category_id}")
async def admin_update_complement_category(
    category_id: str,
    key: str = Form(...),
    name: str = Form(...),
    icon: str = Form(""),
    order_index: int = Form(0),
    required: bool = Form(False),
    min_select: int = Form(0),
    max_select: int = Form(1),
    user=Depends(get_current_user)
):
    """Atualizar categoria de complemento"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")
    
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """UPDATE complement_categories 
               SET name = $1, icon = $2, order_index = $3, required = $4, min_select = $5, max_select = $6 
               WHERE id = $7 RETURNING *""",
            name, icon, order_index, required, min_select, max_select, category_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Categoria não encontrada")
        return dict(row)


@app.delete("/api/admin/complement-categories/{category_id}")
async def admin_delete_complement_category(category_id: str, user=Depends(get_current_user)):
    """Excluir categoria de complemento"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")
    
    async with db_pool.acquire() as conn:
        # Verificar se há complementos usando esta categoria
        comps = await conn.fetch("SELECT id FROM complements WHERE category = (SELECT key FROM complement_categories WHERE id = $1)", category_id)
        if comps:
            # Atualizar complementos para categoria 'extras' antes de excluir
            await conn.execute(
                "UPDATE complements SET category = 'extras' WHERE category = (SELECT key FROM complement_categories WHERE id = $1)",
                category_id
            )
        
        await conn.execute("DELETE FROM complement_categories WHERE id = $1", category_id)
        return {"success": True}


# ============================================
# ADMIN - BANNERS
# ============================================

@app.get("/api/admin/banners")
async def admin_get_banners(user=Depends(get_current_user)):
    """Listar todos os banners (admin)"""
    if not db_pool:
        return []
    async with db_pool.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM banners ORDER BY "order"')
        return [dict(r) for r in rows]


@app.post("/api/admin/banners")
async def admin_create_banner(request: dict, user=Depends(get_current_user)):
    """Criar banner"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO banners (title, subtitle, image_url, cta_text, cta_link, active, "order")
               VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *""",
            request.get('title'), request.get('subtitle'), request.get('image_url'),
            request.get('cta_text', 'Ver mais'), request.get('cta_link', '#'),
            request.get('active', True), request.get('order', 0)
        )
        return dict(row)


@app.put("/api/admin/banners/{banner_id}")
async def admin_update_banner(banner_id: str, request: dict, user=Depends(get_current_user)):
    """Atualizar banner"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """UPDATE banners SET title = $1, subtitle = $2, image_url = $3, cta_text = $4, cta_link = $5, active = $6, "order" = $7
               WHERE id = $8 RETURNING *""",
            request.get('title'), request.get('subtitle'), request.get('image_url'),
            request.get('cta_text'), request.get('cta_link'), request.get('active'), request.get('order'), banner_id
        )
        return dict(row) if row else None


@app.delete("/api/admin/banners/{banner_id}")
async def admin_delete_banner(banner_id: str, user=Depends(get_current_user)):
    """Excluir banner"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    async with db_pool.acquire() as conn:
        await conn.execute("DELETE FROM banners WHERE id = $1", banner_id)
        return {"success": True}


# ============================================
# ADMIN - COMBOS
# ============================================

@app.get("/api/admin/combos")
async def admin_get_combos(user=Depends(get_current_user)):
    """Listar todos os combos (admin)"""
    if not db_pool:
        return []
    async with db_pool.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM combos ORDER BY "order"')
        return [dict(r) for r in rows]


@app.post("/api/admin/combos")
async def admin_create_combo(request: dict, user=Depends(get_current_user)):
    """Criar combo"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO combos (name, description, image_url, base_price, discount_percent, active, "order")
               VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *""",
            request.get('name'), request.get('description'), request.get('image_url'),
            request.get('base_price'), request.get('discount_percent', 0),
            request.get('active', True), request.get('order', 0)
        )
        return dict(row)


@app.put("/api/admin/combos/{combo_id}")
async def admin_update_combo(combo_id: str, request: dict, user=Depends(get_current_user)):
    """Atualizar combo"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """UPDATE combos SET name = $1, description = $2, image_url = $3, base_price = $4, discount_percent = $5, active = $6, "order" = $7
               WHERE id = $8 RETURNING *""",
            request.get('name'), request.get('description'), request.get('image_url'),
            request.get('base_price'), request.get('discount_percent'), request.get('active'), request.get('order'), combo_id
        )
        return dict(row) if row else None


@app.delete("/api/admin/combos/{combo_id}")
async def admin_delete_combo(combo_id: str, user=Depends(get_current_user)):
    """Excluir combo"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    async with db_pool.acquire() as conn:
        await conn.execute("DELETE FROM combos WHERE id = $1", combo_id)
        return {"success": True}


# ============================================
# ADMIN - SETTINGS
# ============================================

@app.get("/api/admin/delivery-settings")
async def admin_get_delivery_settings(user=Depends(get_current_user)):
    """Configurações de entrega"""
    if not db_pool:
        return {}
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM delivery_settings WHERE id = 1")
        return dict(row) if row else {}


@app.put("/api/admin/delivery-settings")
async def admin_update_delivery_settings(request: dict, user=Depends(get_current_user)):
    """Atualizar configurações de entrega"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    async with db_pool.acquire() as conn:
        # Verificar se colunas existem, adicionar se não existirem
        try:
            await conn.execute(
                "ALTER TABLE delivery_settings ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{}'"
            )
            await conn.execute(
                "ALTER TABLE delivery_settings ADD COLUMN IF NOT EXISTS restaurant_address TEXT DEFAULT ''"
            )
            await conn.execute(
                "ALTER TABLE delivery_settings ADD COLUMN IF NOT EXISTS restaurant_lat NUMERIC(10,8) DEFAULT NULL"
            )
            await conn.execute(
                "ALTER TABLE delivery_settings ADD COLUMN IF NOT EXISTS restaurant_lng NUMERIC(11,8) DEFAULT NULL"
            )
            await conn.execute(
                "ALTER TABLE delivery_settings ADD COLUMN IF NOT EXISTS distance_rates JSONB DEFAULT '[]'"
            )
            await conn.execute(
                "ALTER TABLE delivery_settings ADD COLUMN IF NOT EXISTS max_delivery_distance NUMERIC(10,2) DEFAULT 10.0"
            )
            await conn.execute(
                "ALTER TABLE delivery_settings ADD COLUMN IF NOT EXISTS always_open BOOLEAN DEFAULT FALSE"
            )
            await conn.execute(
                "ALTER TABLE delivery_settings ADD COLUMN IF NOT EXISTS temporarily_closed BOOLEAN DEFAULT FALSE"
            )
        except Exception:
            pass
        
        # Se o endereço do restaurante mudou, limpar as coordenadas para recalcular
        current_settings = await conn.fetchrow("SELECT restaurant_address FROM delivery_settings WHERE id = 1")
        current_address = current_settings["restaurant_address"] if current_settings else ""
        new_address = request.get("restaurant_address", "")
        
        if new_address != current_address:
            # Endereço mudou, limpar coordenadas para forçar recálculo
            await conn.execute(
                "UPDATE delivery_settings SET restaurant_lat = NULL, restaurant_lng = NULL WHERE id = 1"
            )
        
        row = await conn.fetchrow(
            """UPDATE delivery_settings SET 
               areas = $1, delivery_fee = $2, min_free_delivery = $3, active = $4, business_hours = $5,
               restaurant_address = $6, distance_rates = $7, max_delivery_distance = $8,
               always_open = $9, temporarily_closed = $10
               WHERE id = 1 RETURNING *""",
            json.dumps(request.get('areas', [])),
            request.get('delivery_fee', 5.0),
            request.get('min_free_delivery', 50.0),
            request.get('active', True),
            json.dumps(request.get('business_hours', {})),
            new_address,
            json.dumps(request.get('distance_rates', [])),
            request.get('max_delivery_distance', 10.0),
            request.get('always_open', False),
            request.get('temporarily_closed', False)
        )
        return dict(row) if row else None


@app.get("/api/admin/pix-settings")
async def admin_get_pix_settings(user=Depends(get_current_user)):
    """Configurações do PIX"""
    if not db_pool:
        return {}
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM pix_settings WHERE id = 1")
        return dict(row) if row else {}


@app.put("/api/admin/pix-settings")
async def admin_update_pix_settings(request: dict, user=Depends(get_current_user)):
    """Atualizar configurações do PIX"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    async with db_pool.acquire() as conn:
        # Garantir que coluna pix_key_type existe
        try:
            await conn.execute(
                "ALTER TABLE pix_settings ADD COLUMN IF NOT EXISTS pix_key_type VARCHAR(50) DEFAULT 'cpf'"
            )
        except Exception:
            pass
        row = await conn.fetchrow(
            "UPDATE pix_settings SET pix_key = $1, pix_name = $2, qr_code_url = $3, pix_key_type = $4 WHERE id = 1 RETURNING *",
            request.get('pix_key', ''),
            request.get('pix_name', 'Salada Soul'),
            request.get('qr_code_url', ''),
            request.get('pix_key_type', 'cpf')
        )
        return dict(row) if row else None


# ============================================
# ADMIN - CUSTOMERS
# ============================================

@app.get("/api/admin/customers")
async def admin_get_customers(search: Optional[str] = None, user=Depends(get_current_user)):
    """Listar clientes"""
    if not db_pool:
        return []

    async with db_pool.acquire() as conn:
        query = "SELECT * FROM customers"
        params = []
        if search:
            query += " WHERE name ILIKE $1 OR phone ILIKE $1"
            params.append(f"%{search}%")
        query += " ORDER BY created_at DESC LIMIT 100"
        rows = await conn.fetch(query, *params)
        return [dict(r) for r in rows]


@app.get("/api/admin/customers/{customer_id}")
async def admin_get_customer(customer_id: str, user=Depends(get_current_user)):
    """Detalhes do cliente"""
    if not db_pool:
        raise HTTPException(status_code=404, detail="Customer not found")

    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM customers WHERE id = $1", customer_id)
        if not row:
            raise HTTPException(status_code=404, detail="Customer not found")
        return dict(row)


# ============================================
# ADMIN - REPORTS
# ============================================

@app.get("/api/admin/reports/sales")
async def admin_get_sales_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user=Depends(get_current_user)
):
    """Relatório de vendas"""
    if not db_pool:
        return {}

    async with db_pool.acquire() as conn:
        query = "SELECT * FROM orders WHERE status != 'cancelado'"
        params = []
        idx = 1

        if start_date:
            query += f" AND created_at >= ${idx}"
            params.append(start_date)
            idx += 1
        if end_date:
            query += f" AND created_at <= ${idx}"
            params.append(end_date)
            idx += 1

        rows = await conn.fetch(query, *params)
        orders = [dict(r) for r in rows]

        total_sales = sum(o['total'] for o in orders)
        total_orders = len(orders)
        avg_ticket = total_sales / total_orders if total_orders > 0 else 0

        daily_sales = {}
        for o in orders:
            date = o['created_at'].strftime('%Y-%m-%d') if o.get('created_at') else None
            if date:
                daily_sales[date] = daily_sales.get(date, 0) + o['total']

        return {
            "total_sales": total_sales,
            "total_orders": total_orders,
            "avg_ticket": avg_ticket,
            "daily_sales": daily_sales
        }


# ============================================
# FILE UPLOAD
# ============================================

@app.post("/api/admin/upload")
async def admin_upload_file(file: UploadFile = File(...), user=Depends(get_current_user)):
    """Upload de imagem para o Supabase Storage (bucket Fotos)"""
    SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
    SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
    BUCKET = 'Fotos'

    content = await file.read()
    file_ext = os.path.splitext(file.filename or 'img.jpg')[1].lower() or '.jpg'
    file_name = f"{uuid.uuid4()}{file_ext}"

    # Se Supabase Storage estiver configurado, usa ele
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        try:
            from supabase import create_client
            sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
            mime = file.content_type or 'image/jpeg'
            sb.storage.from_(BUCKET).upload(
                path=file_name,
                file=content,
                file_options={"content-type": mime, "upsert": "true"}
            )
            public_url = sb.storage.from_(BUCKET).get_public_url(file_name)
            return {"url": public_url}
        except Exception as e:
            logger.error(f"Erro no upload Supabase Storage: {e}")
            raise HTTPException(status_code=500, detail=f"Erro no upload: {str(e)}")

    # Fallback: salva localmente (apenas para dev local)
    import aiofiles
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file_name)
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    return {"url": f"/uploads/{file_name}"}


# ============================================
# SERVE UPLOADS
# ============================================

if os.path.exists("uploads"):
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# ============================================
# MAIN
# ============================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

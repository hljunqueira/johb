"""
Servidor completo para VPS - JOHB API
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
app = FastAPI(
    title="JOHB API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS - Origens permitidas
DEFAULT_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "https://johb-cyan.vercel.app",
    "https://johb-qm4um2wl7-henriques-projects-31af9234.vercel.app",
    "https://www.appzapcar.com.br",
    "https://appzapcar.com.br",
    "https://johb-api.hljdev.com.br"
]

CORS_ORIGINS_ENV = os.environ.get('CORS_ORIGINS', '')
if CORS_ORIGINS_ENV:
    env_origins = [origin.strip() for origin in CORS_ORIGINS_ENV.split(',') if origin.strip()]
    for o in env_origins:
        if o not in DEFAULT_ORIGINS:
            DEFAULT_ORIGINS.append(o)

logger.info(f"CORS Allowed Origins: {DEFAULT_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=DEFAULT_ORIGINS,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database pool
db_pool = None


def serialize_product(row: dict) -> dict:
    """Garante que campos JSONB (additionals) e UUIDs sejam retornados em formato serializavel"""
    d = dict(row)
    if isinstance(d.get('id'), uuid.UUID):
        d['id'] = str(d['id'])
    if isinstance(d.get('category_id'), uuid.UUID):
        d['category_id'] = str(d['category_id'])
    additionals = d.get('additionals')
    if isinstance(additionals, str):
        try:
            d['additionals'] = json.loads(additionals)
        except Exception:
            d['additionals'] = []
    elif additionals is None:
        d['additionals'] = []
    return d

@app.get("/api/products")
async def get_products(category_id: Optional[str] = None):
    """Lista produtos ativos"""
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            query = "SELECT * FROM products WHERE active = TRUE"
            params = []
            if category_id:
                try:
                    cat_uuid = uuid.UUID(category_id)
                    query += " AND (category_id = $1 OR category_id::text = $2)"
                    params.extend([cat_uuid, category_id])
                except Exception:
                    query += " AND category_id::text = $1"
                    params.append(category_id)
            query += ' ORDER BY "order", name'
            rows = await conn.fetch(query, *params)
            return [serialize_product(r) for r in rows]
    except Exception as e:
        logger.error(f"Erro ao carregar produtos para category_id={category_id}: {e}")
        return []

@app.get("/api/categories")
async def get_categories():
    """Lista categorias ativas"""
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch('SELECT * FROM categories WHERE active = TRUE ORDER BY "order"')
            res = []
            for r in rows:
                d = dict(r)
                if isinstance(d.get('id'), uuid.UUID):
                    d['id'] = str(d['id'])
                if isinstance(d.get('menu_id'), uuid.UUID):
                    d['menu_id'] = str(d['menu_id'])
                res.append(d)
            return res
    except Exception as e:
        logger.error(f"Erro ao carregar categorias: {e}")
        return []

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
    payment_method: Optional[str] = "asaas"
    change_for: Optional[float] = None
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    coupon_code: Optional[str] = None
    discount_amount: Optional[float] = 0.0


class CouponValidateRequest(BaseModel):
    code: str
    subtotal: float


class CouponCreate(BaseModel):
    code: str
    discount_type: str = "fixed"  # 'fixed' ou 'percent'
    discount_value: float
    min_order_value: Optional[float] = 0.0
    max_uses: Optional[int] = -1
    active: bool = True
    expires_at: Optional[str] = None


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
            ssl_mode = os.environ.get('DB_SSL', 'require')
            
            if 'sslmode' not in dsn:
                connector = "&" if "?" in dsn else "?"
                dsn += f"{connector}sslmode={ssl_mode}"
            
            logger.info(f"Using DSN: {dsn.split('@')[0]}@**** (SSL: {ssl_mode})")
            
            db_pool = await asyncpg.create_pool(
                dsn,
                ssl=ssl_mode if ssl_mode not in ['disable', 'prefer'] else None,
                min_size=2,
                max_size=25,
                command_timeout=30,
                timeout=10,
                max_inactive_connection_lifetime=300,
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
    logger.info("Starting up JOHB API")
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
            pool = await get_db_pool()
            async with pool.acquire() as conn:
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
    pool = await get_db_pool()
    async with pool.acquire() as conn:
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
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM products WHERE id = $1", product_id)
        if not row:
            raise HTTPException(status_code=404, detail="Product not found")
        return serialize_product(row)


@app.get("/api/categories")
async def get_categories():
    """Lista categorias ativas"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM categories WHERE active = TRUE ORDER BY "order"')
        return [dict(r) for r in rows]


@app.get("/api/menus")
async def get_menus():
    """Lista menus ativos"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
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
    pool = await get_db_pool()
    async with pool.acquire() as conn:
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
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT * FROM products WHERE category_id = $1 AND active = TRUE ORDER BY "order"',
            uuid.UUID(category_id)
        )
        return [serialize_product(r) for r in rows]


@app.get("/api/complements")
async def get_complements():
    """Lista complementos ativos"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM complements WHERE active = TRUE ORDER BY name")
        return [dict(r) for r in rows]


@app.get("/api/banners")
async def get_banners():
    """Lista banners ativos"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM banners WHERE active = TRUE ORDER BY "order"')
        return [dict(r) for r in rows]


@app.get("/api/combos")
async def get_combos():
    """Lista combos ativos"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM combos WHERE active = TRUE ORDER BY "order"')
        return [dict(r) for r in rows]


def parse_jsonb_field(val, default):
    if val is None:
        return default
    if isinstance(val, (dict, list)):
        if isinstance(val, dict) and "0" in val and "1" in val:
            try:
                sorted_keys = sorted([int(k) for k in val.keys() if str(k).isdigit()])
                reconstructed = "".join([val[str(k)] for k in sorted_keys])
                parsed = json.loads(reconstructed)
                if isinstance(parsed, str):
                    parsed = json.loads(parsed)
                return parsed
            except Exception:
                return default
        return val
    if isinstance(val, str):
        try:
            parsed = json.loads(val)
            if isinstance(parsed, str):
                parsed = json.loads(parsed)
            return parsed
        except Exception:
            return default
    return default


def sanitize_json_input(val, default):
    if val is None:
        return default
    if isinstance(val, (dict, list)):
        return val
    if isinstance(val, str):
        try:
            parsed = json.loads(val)
            if isinstance(parsed, str):
                parsed = json.loads(parsed)
            return parsed
        except Exception:
            return default
    return default


def format_delivery_settings_row(row):
    if not row:
        return {}
    d = dict(row)
    d["business_hours"] = parse_jsonb_field(d.get("business_hours"), {})
    d["areas"] = parse_jsonb_field(d.get("areas"), [])
    d["distance_rates"] = parse_jsonb_field(d.get("distance_rates"), [])
    d["allowed_schedule_days"] = parse_jsonb_field(d.get("allowed_schedule_days"), ["seg", "ter", "qua", "qui", "sex", "sab", "dom"])
    d["always_open"] = bool(d.get("always_open", False))
    d["temporarily_closed"] = bool(d.get("temporarily_closed", False))
    d["accept_online_payment"] = bool(d.get("accept_online_payment", True))
    d["accept_card_machine"] = bool(d.get("accept_card_machine", True))
    d["accept_cash"] = bool(d.get("accept_cash", True))
    d["allow_immediate_orders"] = bool(d.get("allow_immediate_orders", True))
    d["allow_scheduled_orders"] = bool(d.get("allow_scheduled_orders", True))
    d["min_lead_hours"] = float(d.get("min_lead_hours") or 0.5)
    d["max_schedule_days"] = int(d.get("max_schedule_days") or 7)
    d["delivery_fee"] = float(d.get("delivery_fee") or 5.0)
    d["min_free_delivery"] = float(d.get("min_free_delivery") or 60.0)
    d["max_delivery_distance"] = float(d.get("max_delivery_distance") or 10.5)
    return d


@app.get("/api/delivery-settings")
async def get_delivery_settings():
    """Configurações de entrega"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM delivery_settings WHERE id = 1")
        return format_delivery_settings_row(row)


@app.get("/api/pix-settings")
async def get_pix_settings():
    """Configurações do PIX"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM pix_settings WHERE id = 1")
        return dict(row) if row else {}


@app.post("/api/coupons/validate")
async def validate_coupon(request: CouponValidateRequest):
    """Valida um cupom de desconto para o cliente"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Garantir tabela coupons
        try:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS coupons (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    code VARCHAR(50) UNIQUE NOT NULL,
                    discount_type VARCHAR(20) DEFAULT 'fixed',
                    discount_value NUMERIC(10,2) NOT NULL,
                    min_order_value NUMERIC(10,2) DEFAULT 0.0,
                    max_uses INTEGER DEFAULT -1,
                    uses_count INTEGER DEFAULT 0,
                    active BOOLEAN DEFAULT TRUE,
                    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            """)
        except Exception:
            pass

        row = await conn.fetchrow(
            "SELECT * FROM coupons WHERE UPPER(code) = UPPER($1) AND active = TRUE",
            request.code.strip()
        )

        if not row:
            raise HTTPException(status_code=404, detail="Cupom inválido ou expirado")

        min_val = float(row['min_order_value'] or 0)
        if request.subtotal < min_val:
            raise HTTPException(
                status_code=400,
                detail=f"Este cupom é válido apenas para pedidos a partir de R$ {min_val:.2f}"
            )

        if row['max_uses'] and row['max_uses'] > 0 and row['uses_count'] >= row['max_uses']:
            raise HTTPException(status_code=400, detail="Limite de utilizações deste cupom atingido")

        d_type = row['discount_type']
        d_val = float(row['discount_value'])
        calculated_discount = 0.0

        if d_type == 'percent':
            calculated_discount = round((request.subtotal * d_val) / 100.0, 2)
        else:
            calculated_discount = min(request.subtotal, d_val)

        return {
            "valid": True,
            "code": row['code'],
            "discount_type": d_type,
            "discount_value": d_val,
            "calculated_discount": calculated_discount,
            "min_order_value": min_val,
            "message": f"Cupom {row['code']} aplicado com sucesso!"
        }


def format_relative_date(dt):
    if not dt:
        return "Hoje"
    if isinstance(dt, str):
        return dt
    try:
        now = datetime.now()
        diff = now.date() - dt.date()
        if diff.days == 0:
            return "Hoje"
        elif diff.days == 1:
            return "Ontem"
        elif diff.days < 7:
            return f"Há {diff.days} dias"
        else:
            return dt.strftime("%d/%m")
    except Exception:
        return "Hoje"


@app.get("/api/reviews/summary")
async def get_reviews_summary():
    """Resumo de avaliações 100% reais para prova social no cardápio"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        stats = await conn.fetchrow("""
            SELECT 
                COUNT(*) as total_reviews,
                AVG(rating) as avg_rating
            FROM orders 
            WHERE rating IS NOT NULL AND rating > 0
        """)
        
        recent_comments = await conn.fetch("""
            SELECT customer_name, rating, rating_comment, created_at
            FROM orders 
            WHERE rating IS NOT NULL AND rating_comment IS NOT NULL AND LENGTH(TRIM(rating_comment)) >= 2
            ORDER BY created_at DESC 
            LIMIT 9
        """)

        # Processar avaliações 100% reais
        real_testimonials = []
        for c in recent_comments:
            c_dict = dict(c)
            c_dict["created_at"] = format_relative_date(c_dict.get("created_at"))
            real_testimonials.append(c_dict)

        total_count = int(stats['total_reviews']) if stats and stats['total_reviews'] else 0
        avg_val = float(stats['avg_rating']) if stats and stats['avg_rating'] else 5.0

        return {
            "avg_rating": round(avg_val, 1) if total_count > 0 else 5.0,
            "total_reviews": total_count,
            "testimonials": real_testimonials
        }


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
                    headers={"User-Agent": "JOHB/1.0"},
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
        
        pool = await get_db_pool()
        async with pool.acquire() as conn:
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

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, email, name, role, password_hash FROM admin_users WHERE email = $1",
            request.email.lower().strip()
        )

        if not user:
            raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")

        stored_hash = user['password_hash']
        is_valid = False
        
        # Verificar senha com bcrypt nativo em threadpool para nao travar o event loop
        try:
            import bcrypt
            pwd_bytes = request.password.encode('utf-8')
            hash_bytes = stored_hash.encode('utf-8') if isinstance(stored_hash, str) else stored_hash
            is_valid = await asyncio.to_thread(bcrypt.checkpw, pwd_bytes, hash_bytes)
        except Exception as err:
            logger.warning(f"Erro ao verificar senha com bcrypt: {err}")
            is_valid = False

        if not is_valid:
            raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")

        token = create_token(str(user['id']), user['email'], user['role'])

        return {
            "token": token,
            "user": {
                "id": str(user['id']),
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

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        sub_val = user.get('sub')
        try:
            user_uuid = uuid.UUID(sub_val)
            row = await conn.fetchrow(
                "SELECT id, email, name, role, picture, created_at FROM admin_users WHERE id = $1",
                user_uuid
            )
        except Exception:
            row = await conn.fetchrow(
                "SELECT id, email, name, role, picture, created_at FROM admin_users WHERE id::text = $1",
                str(sub_val)
            )

        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        d = dict(row)
        if isinstance(d.get('id'), uuid.UUID):
            d['id'] = str(d['id'])
        if isinstance(d.get('created_at'), datetime):
            d['created_at'] = d['created_at'].isoformat()
        return d


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

    pool = await get_db_pool()
    async with pool.acquire() as conn:
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
    pool = await get_db_pool()
    async with pool.acquire() as conn:
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
    pool = await get_db_pool()
    async with pool.acquire() as conn:
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
    pool = await get_db_pool()
    async with pool.acquire() as conn:
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

    pool = await get_db_pool()
    async with pool.acquire() as conn:
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
    """Criar novo pedido com recálculo 100% no backend (Regra de Segurança de Preços)"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    if not request.items or len(request.items) == 0:
        raise HTTPException(status_code=400, detail="O pedido precisa conter pelo menos um item")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # 1. Recalcular Subtotal no Backend a partir da tabela de produtos do banco de dados
        recalculated_subtotal = 0.0
        processed_items = []

        for item in request.items:
            try:
                prod_uuid = uuid.UUID(item.product_id)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"ID de produto inválido: {item.product_id}")

            product_row = await conn.fetchrow("SELECT id, name, price, active FROM products WHERE id = $1", prod_uuid)
            if not product_row or not product_row['active']:
                raise HTTPException(status_code=400, detail=f"Produto '{item.name}' não está mais disponível no cardápio")

            unit_price = float(product_row['price'])
            
            # Recalcular adicionais / complementos
            complements_total = 0.0
            if item.complements:
                for comp in item.complements:
                    if isinstance(comp, dict) and "price" in comp:
                        complements_total += float(comp.get("price", 0))

            item_unit_total = unit_price + complements_total
            item_line_total = item_unit_total * item.quantity
            recalculated_subtotal += item_line_total

            processed_items.append({
                "product_id": str(product_row['id']),
                "product_name": product_row['name'],
                "price": unit_price,
                "quantity": item.quantity,
                "complements": item.complements or [],
                "line_total": item_line_total
            })

        # 2. Recalcular Taxa de Entrega no Backend com regra de frete grátis
        recalculated_delivery_fee = 0.0
        if request.delivery_type == "entrega":
            settings_row = await conn.fetchrow("SELECT delivery_fee, min_free_delivery FROM delivery_settings WHERE id = 1")
            base_fee = float(settings_row['delivery_fee']) if (settings_row and settings_row['delivery_fee'] is not None) else 5.00
            min_free = float(settings_row['min_free_delivery']) if (settings_row and settings_row['min_free_delivery'] is not None) else 0.0
            
            if min_free > 0 and recalculated_subtotal >= min_free:
                recalculated_delivery_fee = 0.0
            else:
                recalculated_delivery_fee = base_fee

        # 3. Aplicar cupom de desconto se fornecido
        calculated_discount = 0.0
        applied_coupon_code = None
        if request.coupon_code:
            coupon_row = await conn.fetchrow(
                "SELECT * FROM coupons WHERE UPPER(code) = UPPER($1) AND active = TRUE",
                request.coupon_code.strip()
            )
            if coupon_row:
                min_val = float(coupon_row['min_order_value'] or 0)
                if recalculated_subtotal >= min_val:
                    d_type = coupon_row['discount_type']
                    d_val = float(coupon_row['discount_value'])
                    if d_type == 'percent':
                        calculated_discount = round((recalculated_subtotal * d_val) / 100.0, 2)
                    else:
                        calculated_discount = min(recalculated_subtotal, d_val)
                    
                    applied_coupon_code = coupon_row['code']
                    # Incrementar uso do cupom
                    await conn.execute("UPDATE coupons SET uses_count = uses_count + 1 WHERE id = $1", coupon_row['id'])

        recalculated_total = max(0.0, recalculated_subtotal + recalculated_delivery_fee - calculated_discount)

        # 4. Gerar número de pedido único
        order_number = await conn.fetchval(
            "UPDATE counters SET value = value + 1 WHERE name = 'order_number' RETURNING value"
        )

        clean_phone = re.sub(r'\D', '', request.customer_phone or '')

        # Garantir colunas na tabela orders
        try:
            await conn.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS change_for NUMERIC(10,2) DEFAULT NULL")
            await conn.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50) DEFAULT NULL")
            await conn.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0.0")
        except Exception:
            pass

        # 5. Inserir pedido com os valores calculados pelo backend
        order_id = await conn.fetchval(
            """INSERT INTO orders 
               (order_number, customer_name, customer_phone, delivery_type, address, 
                neighborhood, items, subtotal, delivery_fee, total, status, payment_status, payment_method, observation, scheduled_date, scheduled_time, change_for, coupon_code, discount_amount)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'aguardando', 'pendente', $11, $12, $13, $14, $15, $16, $17)
               RETURNING id""",
            order_number,
            request.customer_name,
            clean_phone,
            request.delivery_type,
            request.address,
            request.neighborhood,
            json.dumps(processed_items),
            recalculated_subtotal,
            recalculated_delivery_fee,
            recalculated_total,
            request.payment_method or "asaas",
            request.observation,
            request.scheduled_date,
            request.scheduled_time,
            request.change_for,
            applied_coupon_code,
            calculated_discount
        )

        # 6. Atualizar histórico e tags automáticas do cliente
        cust_row = await conn.fetchrow("SELECT orders_count FROM customers WHERE phone = $1", clean_phone)
        next_count = (cust_row['orders_count'] + 1) if cust_row else 1
        new_tag = "vip" if next_count >= 8 else ("frequente" if next_count >= 3 else "novo")

        await conn.execute(
            """INSERT INTO customers (name, phone, orders_count, last_order_date, tags) 
               VALUES ($1, $2, 1, NOW(), ARRAY[$3]::text[])
               ON CONFLICT (phone) DO UPDATE SET 
               orders_count = customers.orders_count + 1,
               last_order_date = NOW(),
               tags = ARRAY[$3]::text[],
               name = EXCLUDED.name""",
            request.customer_name,
            clean_phone,
            new_tag
        )

        logger.info(f"Pedido #{order_number} criado com sucesso (ID: {order_id}). Total: R$ {recalculated_total:.2f} (Desc: R$ {calculated_discount:.2f})")

        return {
            "id": str(order_id),
            "order_number": order_number,
            "subtotal": recalculated_subtotal,
            "delivery_fee": recalculated_delivery_fee,
            "discount_amount": calculated_discount,
            "coupon_code": applied_coupon_code,
            "total": recalculated_total,
            "status": "aguardando",
            "payment_status": "pendente"
        }


@app.get("/api/orders/{order_id}")
async def get_order(order_id: str):
    """Buscar pedido por ID"""
    if not db_pool:
        raise HTTPException(status_code=404, detail="Order not found")
    
    try:
        uuid.UUID(order_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Order not found")
    
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM orders WHERE id = $1", uuid.UUID(order_id))
        if not row:
            raise HTTPException(status_code=404, detail="Order not found")
        return dict(row)


@app.post("/api/orders/{order_id}/rate")
async def rate_order(order_id: str, request: Request):
    """Avaliar pedido com suporte flexivel a JSON ou Form Data"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    try:
        order_uuid = uuid.UUID(order_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Order not found")

    rating = None
    comment = None

    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body = await request.json()
            rating = int(body.get("rating", 0))
            comment = body.get("comment", "")
        except Exception:
            pass
    else:
        try:
            form = await request.form()
            rating = int(form.get("rating", 0)) if form.get("rating") else None
            comment = form.get("comment", "")
        except Exception:
            pass

    if not rating or rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        clean_comment = comment.strip() if comment else None
        await conn.execute(
            "UPDATE orders SET rating = $1, rating_comment = $2 WHERE id = $3",
            rating, clean_comment, order_uuid
        )
        return {"success": True, "rating": rating, "comment": clean_comment}


# ============================================
# ASAAS PAYMENT INTEGRATION (SANDBOX / PRODUÇÃO)
# ============================================

class AsaasCheckoutRequest(BaseModel):
    order_id: str
    billing_type: Optional[str] = "UNDEFINED" # PIX, CREDIT_CARD ou UNDEFINED (permite ambos no checkout hospedado)

ASAAS_API_KEY = os.environ.get("ASAAS_API_KEY", "").strip()
ASAAS_ENV = os.environ.get("ASAAS_ENVIRONMENT", "sandbox").strip().lower()
ASAAS_WEBHOOK_TOKEN = os.environ.get("ASAAS_WEBHOOK_TOKEN", "").strip()

# URL base centralizada
ASAAS_BASE_URL = "https://www.asaas.com/api/v3" if ASAAS_ENV == "production" else "https://sandbox.asaas.com/api/v3"


@app.post("/api/payments/asaas/checkout")
async def create_asaas_checkout(request: AsaasCheckoutRequest):
    """Cria uma sessão de checkout hospedado no Asaas (PIX / Cartão) com proteção contra duplicação"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    try:
        order_uuid = uuid.UUID(request.order_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de pedido inválido")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        order = await conn.fetchrow("SELECT * FROM orders WHERE id = $1", order_uuid)
        if not order:
            raise HTTPException(status_code=404, detail="Pedido não encontrado")

        order_dict = dict(order)

        # Regra de Idempotência: Se já existir um link de pagamento ativo no pedido, reutilizá-lo!
        if order_dict.get("payment_url") and order_dict.get("payment_status") == "pendente":
            logger.info(f"Reutilizando checkout Asaas existente para o pedido {order_uuid}")
            return {
                "success": True,
                "reused": True,
                "payment_id": order_dict.get("asaas_payment_id"),
                "invoice_url": order_dict.get("payment_url"),
                "order_id": str(order_dict['id'])
            }

        # Regra de Proteção de Produção: Em produção, falhar se a chave ASAAS_API_KEY estiver ausente
        if ASAAS_ENV == "production" and not ASAAS_API_KEY:
            logger.error("ERRO CRÍTICO DE CONFIGURAÇÃO: Tentativa de checkout em Produção sem ASAAS_API_KEY configurada.")
            raise HTTPException(status_code=500, detail="Configuração de pagamentos em produção indisponível.")

        # Modo Simulado exclusivo para desenvolvimento Sandbox quando não há API Key no .env
        if not ASAAS_API_KEY:
            logger.info("ASAAS_API_KEY não configurada no backend/.env. Retornando resposta de simulação Sandbox.")
            simulated_url = f"/pedido/{order_dict['id']}"
            await conn.execute("UPDATE orders SET payment_url = $1 WHERE id = $2", simulated_url, order_uuid)
            return {
                "success": True,
                "sandbox_simulated": True,
                "message": "Modo de testes Sandbox. Adicione ASAAS_API_KEY no arquivo backend/.env para gerar links reais no Asaas.",
                "order_id": str(order_dict['id']),
                "total": float(order_dict['total']),
                "invoice_url": simulated_url
            }

        headers = {
            "access_token": ASAAS_API_KEY,
            "Content-Type": "application/json"
        }

        # 1. Buscar ou Criar cliente no Asaas pelo telefone
        customer_phone = order_dict['customer_phone']
        customer_name = order_dict['customer_name']
        asaas_customer_id = order_dict.get("asaas_customer_id")

        async with httpx.AsyncClient(timeout=15.0) as client:
            if not asaas_customer_id:
                # Buscar cliente existente no Asaas
                cust_res = await client.get(
                    f"{ASAAS_BASE_URL}/customers",
                    params={"mobilePhone": customer_phone},
                    headers=headers
                )
                if cust_res.status_code == 200:
                    data = cust_res.json()
                    if data.get("data") and len(data["data"]) > 0:
                        asaas_customer_id = data["data"][0]["id"]

                if not asaas_customer_id:
                    # Criar novo cliente no Asaas
                    new_cust = await client.post(
                        f"{ASAAS_BASE_URL}/customers",
                        headers=headers,
                        json={
                            "name": customer_name,
                            "mobilePhone": customer_phone,
                            "notificationDisabled": True
                        }
                    )
                    if new_cust.status_code in [200, 201]:
                        asaas_customer_id = new_cust.json().get("id")

            # 2. Criar cobrança hospedada no Asaas
            due_date = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
            payment_payload = {
                "customer": asaas_customer_id,
                "billingType": request.billing_type if request.billing_type != "UNDEFINED" else "UNDEFINED",
                "value": float(order_dict['total']),
                "dueDate": due_date,
                "description": f"JOHB Salgados — Pedido #{order_dict['order_number']}",
                "externalReference": str(order_dict['id'])
            }

            pay_res = await client.post(
                f"{ASAAS_BASE_URL}/payments",
                headers=headers,
                json=payment_payload
            )

            if pay_res.status_code in [200, 201]:
                pay_data = pay_res.json()
                payment_id = pay_data.get("id")
                invoice_url = pay_data.get("invoiceUrl") or pay_data.get("bankSlipUrl")

                # Gravar dados do Asaas no pedido
                await conn.execute(
                    """UPDATE orders SET 
                       asaas_payment_id = $1, 
                       asaas_customer_id = $2, 
                       payment_url = $3, 
                       payment_status = 'pendente' 
                       WHERE id = $4""",
                    payment_id, asaas_customer_id, invoice_url, order_uuid
                )

                logger.info(f"Cobrança Asaas criada para Pedido #{order_dict['order_number']} (Payment ID: {payment_id})")

                return {
                    "success": True,
                    "payment_id": payment_id,
                    "invoice_url": invoice_url,
                    "order_id": str(order_dict['id'])
                }
            else:
                logger.error(f"Erro ao criar cobrança Asaas: Status {pay_res.status_code} - Resposta: {pay_res.text}")
                raise HTTPException(status_code=400, detail="Não foi possível gerar o checkout no Asaas.")


@app.post("/api/webhooks/asaas")
async def asaas_webhook(request: Request):
    """Webhook do Asaas para atualização do status de pagamento com validação rigorosa de token e idempotência"""
    # Validação do Token no Header asaas-access-token
    if ASAAS_WEBHOOK_TOKEN:
        token_header = request.headers.get("asaas-access-token")
        if not token_header or token_header != ASAAS_WEBHOOK_TOKEN:
            logger.warning(f"Tentativa não autorizada no Webhook Asaas. Token fornecido: '{token_header}'")
            raise HTTPException(status_code=401, detail="Token de segurança do Webhook inválido ou ausente.")

    try:
        body = await request.json()
        event = body.get("event")
        payment = body.get("payment", {})
        order_id = payment.get("externalReference")

        logger.info(f"Webhook Asaas Recebido | Evento: {event} | OrderID: {order_id}")

        if not order_id or not db_pool:
            return {"status": "ignored", "reason": "Sem ID de pedido interno"}

        try:
            order_uuid = uuid.UUID(order_id)
        except ValueError:
            return {"status": "ignored", "reason": "ID de pedido inválido"}

        pool = await get_db_pool()
        async with pool.acquire() as conn:
            order = await conn.fetchrow("SELECT id, payment_status, status FROM orders WHERE id = $1", order_uuid)
            if not order:
                return {"status": "ignored", "reason": "Pedido não encontrado no banco JOHB"}

            order_dict = dict(order)

            # Processar Eventos Oficiais do Asaas
            if event in ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]:
                # Regra de Idempotência: Se já foi pago, não repete efeitos
                if order_dict.get("payment_status") == "pago":
                    logger.info(f"Webhook repetido para pedido {order_id} já marcado como PAGO. Ignorando duplicação.")
                    return {"status": "already_processed", "payment_status": "pago"}

                await conn.execute(
                    """UPDATE orders SET 
                       payment_status = 'pago', 
                       status = 'confirmado', 
                       payment_confirmed_at = NOW() 
                       WHERE id = $1""",
                    order_uuid
                )
                logger.info(f"Pedido {order_id} atualizado via Webhook: payment_status = 'pago', status = 'confirmado'.")
                return {"status": "success", "event": event, "payment_status": "pago"}

            elif event in ["PAYMENT_OVERDUE"]:
                await conn.execute(
                    "UPDATE orders SET payment_status = 'falhou' WHERE id = $1",
                    order_uuid
                )
                logger.info(f"Pedido {order_id} atualizado via Webhook: payment_status = 'falhou'.")
                return {"status": "success", "event": event, "payment_status": "falhou"}

            elif event in ["PAYMENT_REFUNDED", "PAYMENT_DELETED"]:
                await conn.execute(
                    "UPDATE orders SET payment_status = 'estornado' WHERE id = $1",
                    order_uuid
                )
                logger.info(f"Pedido {order_id} atualizado via Webhook: payment_status = 'estornado'.")
                return {"status": "success", "event": event, "payment_status": "estornado"}

            return {"status": "ignored", "event": event}

    except Exception as e:
        logger.error(f"Erro inesperado no Webhook Asaas: {e}", exc_info=True)
        return {"status": "error", "detail": str(e)}


# ============================================
# ADMIN - ORDERS
# ============================================

def serialize_order(row: dict) -> dict:
    """Garante que campos JSONB, UUID e datas sejam retornados como tipos Python serializáveis"""
    if not row:
        return {}
    d = dict(row)
    if isinstance(d.get('id'), uuid.UUID):
        d['id'] = str(d['id'])
    if isinstance(d.get('created_at'), datetime):
        d['created_at'] = d['created_at'].isoformat()
    if isinstance(d.get('updated_at'), datetime):
        d['updated_at'] = d['updated_at'].isoformat()
    if isinstance(d.get('payment_confirmed_at'), datetime):
        d['payment_confirmed_at'] = d['payment_confirmed_at'].isoformat()
    if isinstance(d.get('scheduled_for'), datetime):
        d['scheduled_for'] = d['scheduled_for'].isoformat()
    if isinstance(d.get('estimated_delivery'), datetime):
        d['estimated_delivery'] = d['estimated_delivery'].isoformat()
    
    # Conversão segura de valores monetários / Decimals para float
    for f in ['total', 'subtotal', 'delivery_fee', 'discount', 'discount_amount', 'change_for', 'estimated_distance']:
        if d.get(f) is not None:
            try:
                d[f] = float(d[f])
            except Exception:
                pass

    items = d.get('items')
    if isinstance(items, str):
        try:
            parsed = json.loads(items)
            if isinstance(parsed, str):
                parsed = json.loads(parsed)
            d['items'] = parsed if isinstance(parsed, list) else []
        except Exception:
            d['items'] = []
    elif not isinstance(items, list):
        d['items'] = []
    return d

@app.get("/api/admin/orders")
async def admin_get_orders(status: Optional[str] = None, user=Depends(get_current_user)):
    """Listar pedidos (admin)"""
    if not db_pool:
        return []

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        query = "SELECT * FROM orders"
        params = []
        if status:
            query += " WHERE status = $1"
            params.append(status)
        query += " ORDER BY created_at DESC LIMIT 100"
        rows = await conn.fetch(query, *params)
        return [serialize_order(r) for r in rows]


@app.delete("/api/admin/orders/{order_id}")
async def admin_delete_order(order_id: str, user=Depends(get_current_user)):
    """Excluir pedido"""
    logger.info(f"Tentativa de exclusão do pedido: {order_id}")
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM orders WHERE id = $1", order_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Pedido não encontrado")
        return {"success": True}


@app.put("/api/admin/orders/{order_id}/status")
async def admin_update_order_status(order_id: str, request: UpdateOrderStatusRequest, user=Depends(get_current_user)):
    """Atualizar status do pedido"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    valid_statuses = ['aguardando', 'confirmado', 'preparando', 'saiu_entrega', 'entregue', 'cancelado']
    if request.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid: {valid_statuses}")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        if request.status == 'cancelado':
            # Placeholder para integração futura com API da InfinitePay
            await conn.execute(
                "UPDATE orders SET status = $1, payment_status = 'estornado' WHERE id = $2",
                request.status, order_id
            )
        else:
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

    pool = await get_db_pool()
    async with pool.acquire() as conn:
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
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM products ORDER BY "order", name')
        return [serialize_product(r) for r in rows]


@app.post("/api/admin/products")
async def admin_create_product(request: dict, user=Depends(get_current_user)):
    """Criar produto"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        additionals = request.get("additionals", [])
        row = await conn.fetchrow(
            """INSERT INTO products 
               (name, description, price, category_id, image_url, stock, tags, additionals, complement_ids, "order", active)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
               RETURNING *""",
            request.get("name", ""),
            request.get("description", ""),
            float(request.get("price", 0.0)),
            request.get("category_id"),
            request.get("image_url", ""),
            int(request.get("stock", -1)),
            request.get("tags", []),
            json.dumps(additionals) if isinstance(additionals, (list, dict)) else str(additionals),
            request.get("complement_ids", []),
            int(request.get("order", 0)),
            bool(request.get("active", True))
        )
        return serialize_product(row)


@app.put("/api/admin/products/{product_id}")
async def admin_update_product(product_id: str, request: dict, user=Depends(get_current_user)):
    """Atualizar produto (suporta partial update)"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT * FROM products WHERE id = $1", product_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        
        ex_dict = dict(existing)
        name = request.get("name", ex_dict["name"])
        description = request.get("description", ex_dict.get("description"))
        price = float(request.get("price", ex_dict["price"]))
        category_id = request.get("category_id", ex_dict.get("category_id"))
        image_url = request.get("image_url", ex_dict.get("image_url"))
        stock = int(request.get("stock", ex_dict.get("stock", -1)))
        tags = request.get("tags", ex_dict.get("tags", []))
        
        adds = request.get("additionals")
        if adds is None:
            additionals = ex_dict.get("additionals", [])
        else:
            additionals = json.dumps(adds) if isinstance(adds, (list, dict)) else str(adds)
            
        complement_ids = request.get("complement_ids", ex_dict.get("complement_ids", []))
        order = int(request.get("order", ex_dict.get("order", 0)))
        active = bool(request.get("active", ex_dict.get("active", True)))

        row = await conn.fetchrow(
            """UPDATE products SET 
               name = $1, description = $2, price = $3, category_id = $4, image_url = $5,
               stock = $6, tags = $7, additionals = $8, complement_ids = $9, "order" = $10, active = $11
               WHERE id = $12 RETURNING *""",
            name, description, price, category_id, image_url, stock, tags,
            additionals if isinstance(additionals, str) else json.dumps(additionals),
            complement_ids, order, active, product_id
        )
        return serialize_product(row)


@app.post("/api/admin/products/{product_id}/clone")
async def admin_clone_product(product_id: str, user=Depends(get_current_user)):
    """Clonar produto existente"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT * FROM products WHERE id = $1", product_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        
        ex = dict(existing)
        row = await conn.fetchrow(
            """INSERT INTO products 
               (name, description, price, category_id, image_url, stock, tags, additionals, complement_ids, "order", active)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
               RETURNING *""",
            f"{ex['name']} (Cópia)",
            ex.get("description"),
            ex["price"],
            ex.get("category_id"),
            ex.get("image_url"),
            ex.get("stock", -1),
            ex.get("tags", []),
            ex.get("additionals", "[]"),
            ex.get("complement_ids", []),
            ex.get("order", 0),
            True
        )
        return serialize_product(row)


@app.delete("/api/admin/products/{product_id}")
async def admin_delete_product(product_id: str, user=Depends(get_current_user)):
    """Excluir produto do banco de dados"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM products WHERE id = $1", product_id)
        return {"success": True}


# ============================================
# ADMIN - COMPLEMENT CATEGORIES & COMPLEMENTS
# ============================================

@app.get("/api/admin/complement-categories")
async def admin_get_complement_categories(user=Depends(get_current_user)):
    """Listar categorias de adicionais/opcionais"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            rows = await conn.fetch("SELECT * FROM complement_categories ORDER BY created_at DESC")
            return [dict(r) for r in rows]
        except Exception:
            return []

@app.post("/api/admin/complement-categories")
async def admin_create_complement_category(request: dict, user=Depends(get_current_user)):
    """Criar categoria de adicionais"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(
                "INSERT INTO complement_categories (name, description, min_selection, max_selection, required) VALUES ($1, $2, $3, $4, $5) RETURNING *",
                request.get("name", ""), request.get("description", ""), request.get("min_selection", 0), request.get("max_selection", 1), request.get("required", False)
            )
            return dict(row)
        except Exception as e:
            return {"id": str(uuid.uuid4()), "name": request.get("name", "")}

@app.get("/api/admin/complements")
async def admin_get_complements(user=Depends(get_current_user)):
    """Listar adicionais/opcionais"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            rows = await conn.fetch("SELECT * FROM complements ORDER BY name")
            return [dict(r) for r in rows]
        except Exception:
            return []

@app.post("/api/admin/complements")
async def admin_create_complement(request: dict, user=Depends(get_current_user)):
    """Criar complemento/opcional"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO complements (name, price, description, category, active)
               VALUES ($1, $2, $3, $4, $5) RETURNING *""",
            request.get("name", ""),
            float(request.get("price", 0.0)),
            request.get("description", ""),
            request.get("category", "extras"),
            bool(request.get("active", True))
        )
        return dict(row)

@app.put("/api/admin/complements/{comp_id}")
async def admin_update_complement(comp_id: str, request: dict, user=Depends(get_current_user)):
    """Atualizar complemento/opcional"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """UPDATE complements SET name = $1, price = $2, description = $3, category = $4, active = $5
               WHERE id = $6 RETURNING *""",
            request.get("name", ""),
            float(request.get("price", 0.0)),
            request.get("description", ""),
            request.get("category", "extras"),
            bool(request.get("active", True)),
            uuid.UUID(comp_id) if isinstance(comp_id, str) else comp_id
        )
        return dict(row)

@app.delete("/api/admin/complements/{comp_id}")
async def admin_delete_complement(comp_id: str, user=Depends(get_current_user)):
    """Excluir complemento e remover das listas de complement_ids dos produtos"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        comp_uuid = uuid.UUID(comp_id) if isinstance(comp_id, str) else comp_id
        await conn.execute("DELETE FROM complements WHERE id = $1", comp_uuid)
        await conn.execute("UPDATE products SET complement_ids = array_remove(complement_ids, $1)", comp_uuid)
        return {"success": True}


# ============================================
# ADMIN - CATEGORIES
# ============================================

@app.get("/api/admin/categories")
async def admin_get_categories(user=Depends(get_current_user)):
    """Listar todas as categorias (admin)"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM categories ORDER BY "order"')
        return [dict(r) for r in rows]


@app.post("/api/admin/categories")
async def admin_create_category(request: CategoryCreate, user=Depends(get_current_user)):
    """Criar categoria"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
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

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """UPDATE categories SET name = $1, description = $2, icon = $3, menu_id = $4, "order" = $5, active = $6
               WHERE id = $7 RETURNING *""",
            request.name, request.description, request.icon, request.menu_id, request.order, request.active, category_id
        )
        return dict(row) if row else None


@app.delete("/api/admin/categories/{category_id}")
async def admin_delete_category(category_id: str, user=Depends(get_current_user)):
    """Excluir categoria"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        await conn.execute("UPDATE products SET category_id = NULL WHERE category_id = $1", category_id)
        await conn.execute("DELETE FROM categories WHERE id = $1", category_id)
        return {"success": True}


# ============================================
# ADMIN - MENUS
# ============================================

@app.get("/api/admin/menus")
async def admin_get_menus(user=Depends(get_current_user)):
    """Listar todos os menus (admin)"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM menus ORDER BY "order"')
        return [dict(r) for r in rows]


@app.post("/api/admin/menus")
async def admin_create_menu(request: MenuCreate, user=Depends(get_current_user)):
    """Criar menu"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
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

    pool = await get_db_pool()
    async with pool.acquire() as conn:
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

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        await conn.execute("UPDATE categories SET menu_id = NULL WHERE menu_id = $1", menu_id)
        await conn.execute("DELETE FROM menus WHERE id = $1", menu_id)
        return {"success": True}


# ============================================
# ADMIN - COMPLEMENTS
# ============================================

@app.get("/api/admin/complements")
async def admin_get_complements(user=Depends(get_current_user)):
    """Listar todos os complementos (admin)"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM complements ORDER BY name")
        return [dict(r) for r in rows]


@app.post("/api/admin/complements")
async def admin_create_complement(request: ComplementCreate, user=Depends(get_current_user)):
    """Criar complemento"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
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

    pool = await get_db_pool()
    async with pool.acquire() as conn:
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

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM complements WHERE id = $1", complement_id)
        return {"success": True}


# ============================================
# ADMIN - COMPLEMENT CATEGORIES
# ============================================

@app.get("/api/admin/complement-categories")
async def admin_get_complement_categories(user=Depends(get_current_user)):
    """Listar todas as categorias de complemento"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
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
    
    pool = await get_db_pool()
    async with pool.acquire() as conn:
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
    
    pool = await get_db_pool()
    async with pool.acquire() as conn:
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
    
    pool = await get_db_pool()
    async with pool.acquire() as conn:
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
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM banners ORDER BY "order"')
        return [dict(r) for r in rows]


@app.post("/api/admin/banners")
async def admin_create_banner(request: dict, user=Depends(get_current_user)):
    """Criar banner"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
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

    pool = await get_db_pool()
    async with pool.acquire() as conn:
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

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM banners WHERE id = $1", banner_id)
        return {"success": True}


# ============================================
# ADMIN - COMBOS
# ============================================

@app.get("/api/admin/combos")
async def admin_get_combos(user=Depends(get_current_user)):
    """Listar todos os combos (admin)"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch('SELECT * FROM combos ORDER BY "order"')
        return [dict(r) for r in rows]


@app.post("/api/admin/combos")
async def admin_create_combo(request: dict, user=Depends(get_current_user)):
    """Criar combo"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
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

    pool = await get_db_pool()
    async with pool.acquire() as conn:
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

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM combos WHERE id = $1", combo_id)
        return {"success": True}


# ============================================
# ADMIN - SETTINGS
# ============================================

@app.get("/api/admin/delivery-settings")
async def admin_get_delivery_settings(user=Depends(get_current_user)):
    """Configurações de entrega"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM delivery_settings WHERE id = 1")
        return format_delivery_settings_row(row)


@app.put("/api/admin/delivery-settings")
async def admin_update_delivery_settings(request: dict, user=Depends(get_current_user)):
    """Atualizar configurações de entrega"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
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
               areas = $1::jsonb, delivery_fee = $2, min_free_delivery = $3, active = $4, business_hours = $5::jsonb,
               restaurant_address = $6, distance_rates = $7::jsonb, max_delivery_distance = $8,
               always_open = $9, temporarily_closed = $10,
               min_lead_hours = $11, max_schedule_days = $12, allowed_schedule_days = $13::jsonb,
               accept_online_payment = $14, accept_card_machine = $15, accept_cash = $16,
               allow_immediate_orders = $17, allow_scheduled_orders = $18
               WHERE id = 1 RETURNING *""",
            json.dumps(sanitize_json_input(request.get('areas'), [])),
            float(request.get('delivery_fee', 5.0)),
            float(request.get('min_free_delivery', 60.0)),
            bool(request.get('active', True)),
            json.dumps(sanitize_json_input(request.get('business_hours'), {})),
            new_address,
            json.dumps(sanitize_json_input(request.get('distance_rates'), [])),
            float(request.get('max_delivery_distance', 10.5)),
            bool(request.get('always_open', False)),
            bool(request.get('temporarily_closed', False)),
            float(request.get('min_lead_hours', 0.5)),
            int(request.get('max_schedule_days', 7)),
            json.dumps(sanitize_json_input(request.get('allowed_schedule_days'), ["seg", "ter", "qua", "qui", "sex", "sab", "dom"])),
            bool(request.get('accept_online_payment', True)),
            bool(request.get('accept_card_machine', True)),
            bool(request.get('accept_cash', True)),
            bool(request.get('allow_immediate_orders', True)),
            bool(request.get('allow_scheduled_orders', True))
        )
        return format_delivery_settings_row(row)


@app.get("/api/admin/pix-settings")
async def admin_get_pix_settings(user=Depends(get_current_user)):
    """Configurações do PIX"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM pix_settings WHERE id = 1")
        return dict(row) if row else {}


@app.put("/api/admin/pix-settings")
async def admin_update_pix_settings(request: dict, user=Depends(get_current_user)):
    """Atualizar configurações do PIX"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
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
            request.get('pix_name', 'JOHB Café & Salgados'),
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

    pool = await get_db_pool()
    async with pool.acquire() as conn:
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

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM customers WHERE id = $1", customer_id)
        if not row:
            raise HTTPException(status_code=404, detail="Customer not found")
        return dict(row)


@app.put("/api/admin/customers/{customer_id}")
async def admin_update_customer(customer_id: str, request: dict, user=Depends(get_current_user)):
    """Atualizar dados do cliente"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM customers WHERE id = $1", customer_id)
        if not row:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        update_fields = []
        params = [customer_id]
        idx = 2
        
        fields = {
            "name": "name",
            "phone": "phone",
            "address": "address",
            "internal_note": "internal_note",
            "tags": "tags"
        }

        for req_field, db_field in fields.items():
            if req_field in request:
                if req_field == "tags":
                    update_fields.append(f"{db_field} = ${idx}")
                    params.append(request[req_field]) # asyncpg handles list -> text[]
                else:
                    update_fields.append(f"{db_field} = ${idx}")
                    params.append(request[req_field])
                idx += 1
        
        if not update_fields:
            return dict(row)
        
        try:
            await conn.execute(
                f"UPDATE customers SET {', '.join(update_fields)} WHERE id = $1",
                *params
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        row = await conn.fetchrow("SELECT * FROM customers WHERE id = $1", customer_id)
        return dict(row)


@app.delete("/api/admin/customers/{customer_id}")
async def admin_delete_customer(customer_id: str, user=Depends(get_current_user)):
    """Excluir cliente"""
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM customers WHERE id = $1", customer_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Customer not found")
        return {"success": True}


@app.get("/api/admin/customers/{customer_id}/orders")
async def admin_get_customer_orders(customer_id: str, user=Depends(get_current_user)):
    """Lista histórico de pedidos de um cliente específico"""
    if not db_pool:
        return []

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        customer = await conn.fetchrow("SELECT phone FROM customers WHERE id = $1", customer_id)
        if not customer:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")

        rows = await conn.fetch(
            "SELECT * FROM orders WHERE customer_phone = $1 ORDER BY created_at DESC LIMIT 50",
            customer['phone']
        )
        return [dict(r) for r in rows]


# ============================================
# ADMIN - COUPONS
# ============================================

@app.get("/api/admin/coupons")
async def admin_get_coupons(user=Depends(get_current_user)):
    """Listar todos os cupons"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        try:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS coupons (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    code VARCHAR(50) UNIQUE NOT NULL,
                    discount_type VARCHAR(20) DEFAULT 'fixed',
                    discount_value NUMERIC(10,2) NOT NULL,
                    min_order_value NUMERIC(10,2) DEFAULT 0.0,
                    max_uses INTEGER DEFAULT -1,
                    uses_count INTEGER DEFAULT 0,
                    active BOOLEAN DEFAULT TRUE,
                    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            """)
        except Exception:
            pass

        rows = await conn.fetch("SELECT * FROM coupons ORDER BY created_at DESC")
        return [dict(r) for r in rows]


@app.post("/api/admin/coupons")
async def admin_create_coupon(request: CouponCreate, user=Depends(get_current_user)):
    """Criar novo cupom"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        code_clean = request.code.strip().upper()
        row = await conn.fetchrow(
            """INSERT INTO coupons (code, discount_type, discount_value, min_order_value, max_uses, active)
               VALUES ($1, $2, $3, $4, $5, $6)
               RETURNING *""",
            code_clean,
            request.discount_type,
            request.discount_value,
            request.min_order_value or 0.0,
            request.max_uses if request.max_uses is not None else -1,
            request.active
        )
        return dict(row)


@app.put("/api/admin/coupons/{coupon_id}")
async def admin_update_coupon(coupon_id: str, request: CouponCreate, user=Depends(get_current_user)):
    """Atualizar cupom"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        code_clean = request.code.strip().upper()
        row = await conn.fetchrow(
            """UPDATE coupons SET 
               code = $1, discount_type = $2, discount_value = $3, min_order_value = $4, max_uses = $5, active = $6
               WHERE id = $7 RETURNING *""",
            code_clean,
            request.discount_type,
            request.discount_value,
            request.min_order_value or 0.0,
            request.max_uses if request.max_uses is not None else -1,
            request.active,
            coupon_id
        )
        return dict(row) if row else None


@app.delete("/api/admin/coupons/{coupon_id}")
async def admin_delete_coupon(coupon_id: str, user=Depends(get_current_user)):
    """Excluir cupom"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM coupons WHERE id = $1", coupon_id)
        return {"success": True}


# ============================================
# ADMIN - REPORTS (EXPANDED WITH FECHAMENTO DE CAIXA)
# ============================================

@app.get("/api/admin/reports/sales")
async def admin_get_sales_report(
    date: Optional[str] = None,
    period: Optional[str] = None,  # 'today', '7days', '30days'
    user=Depends(get_current_user)
):
    """Relatório de vendas e fechamento de caixa"""
    if not db_pool:
        return {}

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        query = "SELECT * FROM orders WHERE status != 'cancelado'"
        params = []

        if period == "7days":
            query += " AND created_at >= NOW() - INTERVAL '7 days'"
        elif period == "30days":
            query += " AND created_at >= NOW() - INTERVAL '30 days'"
        elif date:
            query += " AND DATE(created_at) = $1::date"
            params.append(date)
        else:
            # Padrão: hoje
            query += " AND DATE(created_at) = CURRENT_DATE"

        rows = await conn.fetch(query, *params)
        orders = [dict(r) for r in rows]

        total_sales = sum(float(o.get('total') or 0) for o in orders)
        total_orders = len(orders)
        avg_ticket = (total_sales / total_orders) if total_orders > 0 else 0.0

        # Totais por Forma de Pagamento (Fechamento de Caixa)
        cash_total = sum(float(o.get('total') or 0) for o in orders if o.get('payment_method') == 'dinheiro')
        card_machine_total = sum(float(o.get('total') or 0) for o in orders if o.get('payment_method') == 'cartao_maquininha')
        online_total = sum(float(o.get('total') or 0) for o in orders if o.get('payment_method') in ('asaas', 'pix', None))

        delivery_count = sum(1 for o in orders if o.get('delivery_type') == 'entrega')
        pickup_count = sum(1 for o in orders if o.get('delivery_type') == 'retirada')

        hourly_breakdown = {}
        top_products_map = {}

        for o in orders:
            # Horários
            if o.get('created_at'):
                h_str = o['created_at'].strftime('%H:00')
                hourly_breakdown[h_str] = hourly_breakdown.get(h_str, 0) + 1

            # Top produtos
            items = o.get('items')
            if isinstance(items, str):
                try:
                    items = json.loads(items)
                except Exception:
                    items = []
            if isinstance(items, list):
                for it in items:
                    p_name = it.get('name') or it.get('product_name') or 'Salgado'
                    qty = int(it.get('quantity') or 1)
                    top_products_map[p_name] = top_products_map.get(p_name, 0) + qty

        # Ordenar top produtos
        top_products = [
            {"name": name, "quantity": qty}
            for name, qty in sorted(top_products_map.items(), key=lambda x: x[1], reverse=True)[:5]
        ]

        # Pico
        peak_hour = "N/A"
        if hourly_breakdown:
            peak_hour = max(hourly_breakdown.items(), key=lambda x: x[1])[0]

        return {
            "total_sales": total_sales,
            "total_orders": total_orders,
            "avg_ticket": avg_ticket,
            "cash_total": cash_total,
            "card_machine_total": card_machine_total,
            "online_total": online_total,
            "delivery_count": delivery_count,
            "pickup_count": pickup_count,
            "hourly_breakdown": hourly_breakdown,
            "top_products": top_products,
            "peak_hour": peak_hour
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

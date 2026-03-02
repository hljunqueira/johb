from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Request, Query, Form
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import asyncpg
import os
import logging
import json
from pathlib import Path
from pythonjsonlogger import jsonlogger
from pydantic import BaseModel, Field, validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
import json
import csv
import io
import requests as http_client

# Rate Limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Rate limiter setup
limiter = Limiter(key_func=get_remote_address)

# Database configuration
# Support both individual env vars and DATABASE_URL (Railway/Supabase style)
DATABASE_URL = os.environ.get('DATABASE_URL')

if DATABASE_URL:
    # Parse DATABASE_URL
    # Format: postgresql://user:password@host:port/database
    import urllib.parse
    parsed = urllib.parse.urlparse(DATABASE_URL)
    DB_USER = parsed.username or 'postgres'
    DB_PASSWORD = parsed.password or ''
    DB_HOST = parsed.hostname or 'db'
    DB_PORT = str(parsed.port) if parsed.port else '5432'
    DB_NAME = parsed.path.lstrip('/') if parsed.path else 'postgres'
else:
    # Fallback to individual env vars
    DB_HOST = os.environ.get('DB_HOST', 'db')
    DB_NAME = os.environ.get('DB_NAME', 'saladasoul')
    DB_USER = os.environ.get('DB_USER', 'postgres')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', 'postgres')
    DB_PORT = os.environ.get('DB_PORT', '5432')

JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
UPLOAD_DIR = ROOT_DIR / 'uploads'
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(
    title="Salada Soul API",
    description="API para o sistema de pedidos do restaurante Salada Soul",
    version="1.0.0",
    docs_url="/api/docs" if os.environ.get('ENVIRONMENT') != 'production' else None,
    redoc_url="/api/redoc" if os.environ.get('ENVIRONMENT') != 'production' else None
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

api_router = APIRouter(prefix="/api")

# Configure structured logging
def setup_logging():
    """Setup structured JSON logging for production"""
    log_level = logging.DEBUG if ENVIRONMENT == 'development' else logging.INFO
    
    # Create logger
    logger = logging.getLogger()
    logger.setLevel(log_level)
    
    # Clear existing handlers
    logger.handlers = []
    
    # Create formatter
    if ENVIRONMENT == 'production':
        # JSON format for production
        formatter = jsonlogger.JsonFormatter(
            '%(timestamp)s %(level)s %(name)s %(message)s %(pathname)s %(lineno)d',
            rename_fields={'levelname': 'level', 'asctime': 'timestamp'}
        )
    else:
        # Human-readable format for development
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File handler for production
    if ENVIRONMENT == 'production':
        log_dir = ROOT_DIR / 'logs'
        log_dir.mkdir(exist_ok=True)
        file_handler = logging.handlers.RotatingFileHandler(
            log_dir / 'app.log',
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5
        )
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger

# Initialize logging after ENVIRONMENT is set
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'development')
logger = setup_logging()

# Database pool
db_pool = None

async def get_db():
    async with db_pool.acquire() as conn:
        yield conn

# ==================== MODELS ====================
class ProductCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200, description="Nome do produto")
    description: str = Field(default="", max_length=1000, description="Descrição do produto")
    price: float = Field(..., gt=0, description="Preço deve ser maior que zero")
    category_id: str = Field(..., min_length=1, description="ID da categoria")
    image_url: str = Field(default="", max_length=500, description="URL da imagem")
    stock: int = Field(default=-1, ge=-1, description="Estoque (-1 para ilimitado)")
    tags: List[str] = Field(default=[], max_length=10, description="Tags do produto")
    additionals: List[dict] = Field(default=[], description="Adicionais do produto")
    complement_ids: List[str] = Field(default=[], description="IDs dos complementos")
    active: bool = Field(default=True, description="Status ativo")
    
    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Nome do produto é obrigatório')
        return v.strip()
    
    @validator('price')
    def validate_price(cls, v):
        if v <= 0:
            raise ValueError('Preço deve ser maior que zero')
        if v > 10000:
            raise ValueError('Preço máximo é R$ 10.000')
        return round(v, 2)

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category_id: Optional[str] = None
    image_url: Optional[str] = None
    stock: Optional[int] = None
    tags: Optional[List[str]] = None
    additionals: Optional[List[dict]] = None
    complement_ids: Optional[List[str]] = None
    active: Optional[bool] = None
    order: Optional[int] = None

class OrderItemCreate(BaseModel):
    product_id: str = Field(..., min_length=1, description="ID do produto")
    product_name: str = Field(..., min_length=1, max_length=200, description="Nome do produto")
    quantity: int = Field(..., ge=1, le=50, description="Quantidade (1-50)")
    price: float = Field(..., gt=0, description="Preço unitário")
    observation: str = Field(default="", max_length=500, description="Observação do item")
    
    @validator('observation')
    def validate_observation(cls, v):
        if v and len(v) > 500:
            raise ValueError('Observação muito longa (máx 500 caracteres)')
        return v.strip() if v else v

class OrderCreate(BaseModel):
    customer_name: str = Field(..., min_length=2, max_length=100, description="Nome do cliente")
    customer_phone: str = Field(..., min_length=10, max_length=20, description="Telefone do cliente")
    delivery_type: str = Field(..., pattern="^(entrega|retirada)$", description="Tipo: entrega ou retirada")
    address: str = Field(default="", max_length=300, description="Endereço de entrega")
    neighborhood: str = Field(default="", max_length=100, description="Bairro")
    items: List[OrderItemCreate] = Field(..., min_items=1, max_items=20, description="Itens do pedido")
    observation: str = Field(default="", max_length=1000, description="Observação geral")
    
    @validator('customer_phone')
    def validate_phone(cls, v):
        # Remove caracteres não numéricos
        cleaned = ''.join(c for c in v if c.isdigit())
        if len(cleaned) < 10 or len(cleaned) > 15:
            raise ValueError('Telefone inválido')
        return cleaned
    
    @validator('customer_name')
    def validate_customer_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Nome do cliente é obrigatório')
        return v.strip()
    
    @validator('delivery_type')
    def validate_delivery_type(cls, v):
        if v not in ['entrega', 'retirada']:
            raise ValueError('Tipo de entrega deve ser "entrega" ou "retirada"')
        return v
    
    @validator('items')
    def validate_items(cls, v):
        if not v or len(v) == 0:
            raise ValueError('Pedido deve ter pelo menos 1 item')
        if len(v) > 20:
            raise ValueError('Máximo de 20 itens por pedido')
        return v

class OrderRating(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Avaliação de 1 a 5 estrelas")
    comment: str = Field(default="", max_length=500, description="Comentário opcional")
    
    @validator('comment')
    def validate_comment(cls, v):
        if v and len(v) > 500:
            raise ValueError('Comentário muito longo (máx 500 caracteres)')
        return v.strip() if v else v

class CategoryCreate(BaseModel):
    name: str
    description: str = ""
    icon: str = ""
    menu_id: Optional[str] = None

class AdminLogin(BaseModel):
    email: str = Field(..., min_length=5, max_length=100, description="Email do administrador")
    password: str = Field(..., min_length=6, max_length=100, description="Senha")
    
    @validator('email')
    def validate_email(cls, v):
        if '@' not in v or '.' not in v.split('@')[-1]:
            raise ValueError('Email inválido')
        return v.lower().strip()

class CustomerUpdate(BaseModel):
    internal_note: Optional[str] = None
    tags: Optional[List[str]] = None

class DeliverySettingsUpdate(BaseModel):
    areas: List[dict] = []
    delivery_fee: float = 5.0
    min_free_delivery: float = 50.0
    active: bool = True

class PixSettingsUpdate(BaseModel):
    pix_key: str = ""
    pix_name: str = ""
    qr_code_url: str = ""

class ComplementCreate(BaseModel):
    name: str
    price: float
    description: str = ""
    category: str = ""
    image_url: str = ""
    required: bool = False
    min_select: int = 0
    max_select: int = 1
    active: bool = True

class ComplementUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    description: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    required: Optional[bool] = None
    min_select: Optional[int] = None
    max_select: Optional[int] = None
    active: Optional[bool] = None

class MenuCreate(BaseModel):
    name: str
    description: str = ""
    icon: str = ""
    category_ids: List[str] = []
    active: bool = True

class MenuUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    category_ids: Optional[List[str]] = None
    active: Optional[bool] = None

class BannerCreate(BaseModel):
    title: str
    subtitle: str = ""
    image_url: str = ""
    cta_text: str = "Ver mais"
    cta_link: str = "#"
    active: bool = True
    order: int = 0

class BannerUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    image_url: Optional[str] = None
    cta_text: Optional[str] = None
    cta_link: Optional[str] = None
    active: Optional[bool] = None
    order: Optional[int] = None

class ComboCreate(BaseModel):
    name: str
    description: str = ""
    image_url: str = ""
    base_price: float
    discount_percent: int = 0
    active: bool = True
    items: List[dict] = []

class ComboUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    base_price: Optional[float] = None
    discount_percent: Optional[int] = None
    active: Optional[bool] = None
    items: Optional[List[dict]] = None

# ==================== AUTH ====================
async def get_current_admin(request: Request):
    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    if not token:
        token = request.cookies.get("session_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        async with db_pool.acquire() as conn:
            user = await conn.fetchrow(
                "SELECT * FROM admin_users WHERE id = $1",
                payload["sub"]
            )
            if user:
                return dict(user)
    except (JWTError, Exception):
        pass

    async with db_pool.acquire() as conn:
        session = await conn.fetchrow(
            "SELECT * FROM sessions WHERE session_token = $1",
            token
        )
        if session:
            expires_at = session["expires_at"]
            if expires_at > datetime.now(timezone.utc):
                user = await conn.fetchrow(
                    "SELECT * FROM admin_users WHERE id = $1",
                    session["user_id"]
                )
                if user:
                    return dict(user)

    raise HTTPException(status_code=401, detail="Not authenticated")

def create_jwt_token(user_id: str):
    return jwt.encode(
        {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)},
        JWT_SECRET, algorithm=JWT_ALGORITHM
    )

async def resolve_product_complements(conn, products):
    all_ids = set()
    for p in products:
        comp_ids = p.get("complement_ids", []) or []
        # Convert UUID objects to strings
        for cid in comp_ids:
            if cid:
                all_ids.add(str(cid))
    if not all_ids:
        return products
    
    uuid_ids = [uuid.UUID(cid) for cid in all_ids]
    if not uuid_ids:
        return products
        
    comps = await conn.fetch(
        "SELECT * FROM complements WHERE id = ANY($1) AND active = TRUE",
        uuid_ids
    )
    comp_map = {str(c["id"]): dict(c) for c in comps}
    
    for p in products:
        comp_ids = p.get("complement_ids", []) or []
        if comp_ids:
            p["additionals"] = [
                {"name": comp_map[str(cid)]["name"], "price": comp_map[str(cid)]["price"], 
                 "id": str(cid), "category": comp_map[str(cid)].get("category", "")}
                for cid in comp_ids if str(cid) in comp_map
            ]
    return products

# ==================== PUBLIC ROUTES ====================
@api_router.get("/")
@limiter.limit("100/minute")
async def root(request: Request):
    return {"message": "Salada Soul API"}

@api_router.get("/categories")
@limiter.limit("100/minute")
async def get_categories(request: Request):
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM categories WHERE active = TRUE ORDER BY \"order\" ASC"
        )
        return [dict(r) for r in rows]

@api_router.get("/products")
@limiter.limit("100/minute")
async def get_products(request: Request, category_id: str = None, search: str = None):
    async with db_pool.acquire() as conn:
        query = "SELECT * FROM products WHERE active = TRUE"
        params = []
        if category_id:
            query += " AND category_id = $1"
            params.append(uuid.UUID(category_id))
        if search:
            query += f" AND name ILIKE ${len(params) + 1}"
            params.append(f"%{search}%")
        query += " ORDER BY \"order\" ASC"
        
        rows = await conn.fetch(query, *params)
        products = [dict(r) for r in rows]
        products = [p for p in products if p.get("stock", -1) != 0]
        products = await resolve_product_complements(conn, products)
        return products

@api_router.get("/products/{product_id}")
@limiter.limit("100/minute")
async def get_product(request: Request, product_id: str):
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM products WHERE id = $1",
            uuid.UUID(product_id)
        )
        if not row:
            raise HTTPException(status_code=404, detail="Product not found")
        products = await resolve_product_complements(conn, [dict(row)])
        return products[0]

@api_router.get("/delivery-settings")
@limiter.limit("100/minute")
async def get_delivery_settings(request: Request):
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM delivery_settings WHERE id = 1")
        if row:
            return dict(row)
        return {"areas": [], "delivery_fee": 5.0, "min_free_delivery": 50.0, "active": True}

@api_router.get("/pix-settings")
@limiter.limit("100/minute")
async def get_pix_settings(request: Request):
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM pix_settings WHERE id = 1")
        if row:
            return dict(row)
        return {"pix_key": "", "pix_name": "Salada Soul", "qr_code_url": ""}

@api_router.get("/complements")
@limiter.limit("100/minute")
async def get_complements(request: Request):
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM complements WHERE active = TRUE ORDER BY name ASC"
        )
        return [dict(r) for r in rows]

@api_router.get("/menus")
@limiter.limit("100/minute")
async def get_menus(request: Request):
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM menus WHERE active = TRUE ORDER BY \"order\" ASC"
        )
        return [dict(r) for r in rows]

@api_router.get("/menus/{menu_id}/categories")
@limiter.limit("100/minute")
async def get_categories_by_menu(request: Request, menu_id: str):
    """Buscar categorias vinculadas a um menu específico"""
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT * FROM categories 
               WHERE menu_id = $1 AND active = TRUE 
               ORDER BY \"order\" ASC""",
            uuid.UUID(menu_id)
        )
        return [dict(r) for r in rows]

@api_router.get("/categories/{category_id}/products")
@limiter.limit("100/minute")
async def get_products_by_category(request: Request, category_id: str):
    """Buscar produtos vinculados a uma categoria específica"""
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT * FROM products 
               WHERE category_id = $1 AND active = TRUE 
               ORDER BY "order" ASC""",
            uuid.UUID(category_id)
        )
        products = [dict(r) for r in rows]
        products = [p for p in products if p.get("stock", -1) != 0]
        products = await resolve_product_complements(conn, products)
        return products

@api_router.get("/banners")
@limiter.limit("100/minute")
async def get_banners(request: Request):
    """Buscar banners ativos para exibição no cardápio"""
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT * FROM banners 
               WHERE active = TRUE 
               AND (start_date IS NULL OR start_date <= NOW())
               AND (end_date IS NULL OR end_date >= NOW())
               ORDER BY "order" ASC"""
        )
        return [dict(r) for r in rows]

@api_router.get("/combos")
@limiter.limit("100/minute")
async def get_combos(request: Request):
    """Buscar combos ativos para exibição no cardápio"""
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT * FROM combos 
               WHERE active = TRUE 
               ORDER BY "order" ASC"""
        )
        combos = [dict(r) for r in rows]
        
        # Buscar itens de cada combo
        for combo in combos:
            items = await conn.fetch(
                """SELECT ci.*, c.name as category_name 
                   FROM combo_items ci
                   LEFT JOIN categories c ON ci.category_id = c.id
                   WHERE ci.combo_id = $1""",
                combo["id"]
            )
            combo["items"] = [dict(i) for i in items]
        
        return combos

# ==================== HEALTH CHECK ====================
@app.get("/health")
@limiter.limit("60/minute")
async def health_check(request: Request):
    """Health check endpoint for monitoring"""
    try:
        if db_pool:
            async with db_pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            db_status = "healthy"
        else:
            db_status = "unhealthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    return {
        "status": "healthy" if db_status == "healthy" else "unhealthy",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0"
    }


# ==================== ORDER ROUTES ====================
@api_router.post("/orders")
@limiter.limit("10/minute")
async def create_order(order: OrderCreate, request: Request):
    async with db_pool.acquire() as conn:
        async with conn.transaction():
            # Get next order number
            counter = await conn.fetchrow(
                "UPDATE counters SET value = value + 1 WHERE name = 'order_number' RETURNING value"
            )
            order_number = counter["value"] if counter else 1

            subtotal = sum(item.price * item.quantity for item in order.items)

            # Calculate delivery fee
            delivery_fee = 0.0
            if order.delivery_type == "entrega":
                settings = await conn.fetchrow("SELECT * FROM delivery_settings WHERE id = 1")
                if settings and settings.get("active"):
                    if subtotal < settings.get("min_free_delivery", 50.0):
                        areas = settings.get("areas", []) or []
                        area = next((a for a in areas if a.get("name") == order.neighborhood), None)
                        delivery_fee = area["fee"] if area else settings.get("delivery_fee", 5.0)

            total = subtotal + delivery_fee

            # Update stock
            for item in order.items:
                product = await conn.fetchrow(
                    "SELECT * FROM products WHERE id = $1",
                    uuid.UUID(item.product_id)
                )
                if product and product.get("stock", -1) > 0:
                    new_stock = max(0, product["stock"] - item.quantity)
                    await conn.execute(
                        "UPDATE products SET stock = $1, active = $2 WHERE id = $3",
                        new_stock, new_stock > 0, uuid.UUID(item.product_id)
                    )

            # Create order
            order_id = uuid.uuid4()
            items_json = json.dumps([item.model_dump() for item in order.items])
            now = datetime.now(timezone.utc)
            
            await conn.execute(
                """INSERT INTO orders (id, order_number, customer_name, customer_phone, 
                    delivery_type, address, neighborhood, items, subtotal, delivery_fee, 
                    total, status, payment_status, observation, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15)""",
                order_id, order_number, order.customer_name, order.customer_phone,
                order.delivery_type, order.address, order.neighborhood, items_json,
                subtotal, delivery_fee, total, "aguardando", "pendente", order.observation, now
            )

            # Update or create customer (nova estrutura)
            customer = await conn.fetchrow(
                "SELECT * FROM customers WHERE phone = $1",
                order.customer_phone
            )
            if customer:
                new_order_count = (customer.get("order_count") or 0) + 1
                new_total_spent = (float(customer.get("total_spent") or 0)) + total
                
                await conn.execute(
                    """UPDATE customers SET 
                        name = $1, 
                        order_count = $2, 
                        total_spent = $3,
                        last_order_at = $4, 
                        address = COALESCE($5, address),
                        neighborhood = COALESCE($6, neighborhood)
                       WHERE phone = $7""",
                    order.customer_name, new_order_count, new_total_spent, now,
                    order.address, order.neighborhood, order.customer_phone
                )
            else:
                await conn.execute(
                    """INSERT INTO customers (phone, name, address, neighborhood, 
                        order_count, total_spent, last_order_at, favorites)
                    VALUES ($1, $2, $3, $4, 1, $5, $6, $7)""",
                    order.customer_phone, order.customer_name,
                    order.address, order.neighborhood, total, now, json.dumps([])
                )

            return {
                "id": str(order_id),
                "order_number": order_number,
                "customer_name": order.customer_name,
                "customer_phone": order.customer_phone,
                "delivery_type": order.delivery_type,
                "address": order.address,
                "neighborhood": order.neighborhood,
                "items": [item.model_dump() for item in order.items],
                "subtotal": subtotal,
                "delivery_fee": delivery_fee,
                "total": total,
                "status": "aguardando",
                "payment_status": "pendente",
                "observation": order.observation,
                "rating": None,
                "rating_comment": None,
                "estimated_time": 30,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat()
            }

@api_router.get("/orders/{order_id}")
@limiter.limit("60/minute")
async def get_order(request: Request, order_id: str):
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM orders WHERE id = $1",
            uuid.UUID(order_id)
        )
        if not row:
            raise HTTPException(status_code=404, detail="Order not found")
        return dict(row)

@api_router.get("/orders/phone/{phone}")
@limiter.limit("30/minute")
async def get_orders_by_phone(request: Request, phone: str):
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM orders WHERE customer_phone = $1 ORDER BY created_at DESC",
            phone
        )
        return [dict(r) for r in rows]

@api_router.post("/orders/{order_id}/rate")
@limiter.limit("10/minute")
async def rate_order(request: Request, order_id: str, rating: OrderRating):
    async with db_pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE orders SET rating = $1, rating_comment = $2 WHERE id = $3",
            rating.rating, rating.comment, uuid.UUID(order_id)
        )
        if result == "UPDATE 0":
            raise HTTPException(status_code=404, detail="Order not found")
        return {"message": "Rating saved"}

# ==================== CUSTOMERS ROUTES (Login Opcional) ====================
class CustomerLogin(BaseModel):
    phone: str = Field(..., min_length=10, max_length=20, description="Telefone do cliente")
    name: Optional[str] = Field(default=None, max_length=100, description="Nome do cliente")
    
    @validator('phone')
    def validate_phone(cls, v):
        cleaned = ''.join(c for c in v if c.isdigit())
        if len(cleaned) < 10 or len(cleaned) > 15:
            raise ValueError('Telefone inválido')
        return cleaned
    
    @validator('name')
    def validate_name(cls, v):
        if v and len(v) > 100:
            raise ValueError('Nome muito longo (máx 100 caracteres)')
        return v.strip() if v else v

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    neighborhood: Optional[str] = None
    favorites: Optional[list] = None

@api_router.post("/customers/login")
@limiter.limit("10/minute")
async def customer_login(request: Request, data: CustomerLogin):
    """Login ou registro de cliente por telefone (sem senha)"""
    async with db_pool.acquire() as conn:
        # Buscar cliente existente
        customer = await conn.fetchrow(
            "SELECT * FROM customers WHERE phone = $1",
            data.phone
        )
        
        if customer:
            # Cliente existe - retornar dados
            return {
                "id": str(customer["id"]),
                "phone": customer["phone"],
                "name": customer["name"],
                "email": customer["email"],
                "address": customer["address"],
                "neighborhood": customer["neighborhood"],
                "favorites": json.loads(customer["favorites"]) if customer["favorites"] else [],
                "order_count": customer["order_count"],
                "total_spent": float(customer["total_spent"]) if customer["total_spent"] else 0,
                "last_order_at": customer["last_order_at"].isoformat() if customer["last_order_at"] else None,
                "is_new": False
            }
        else:
            # Criar novo cliente
            if not data.name:
                data.name = "Cliente"  # Nome padrão
            
            new_customer = await conn.fetchrow(
                """INSERT INTO customers (phone, name, favorites) 
                   VALUES ($1, $2, $3) 
                   RETURNING *""",
                data.phone, data.name, json.dumps([])
            )
            
            return {
                "id": str(new_customer["id"]),
                "phone": new_customer["phone"],
                "name": new_customer["name"],
                "email": new_customer["email"],
                "address": new_customer["address"],
                "neighborhood": new_customer["neighborhood"],
                "favorites": [],
                "order_count": 0,
                "total_spent": 0,
                "last_order_at": None,
                "is_new": True
            }

@api_router.get("/customers/{phone}")
@limiter.limit("60/minute")
async def get_customer(request: Request, phone: str):
    """Buscar cliente por telefone"""
    async with db_pool.acquire() as conn:
        customer = await conn.fetchrow(
            "SELECT * FROM customers WHERE phone = $1",
            phone
        )
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        return {
            "id": str(customer["id"]),
            "phone": customer["phone"],
            "name": customer["name"],
            "email": customer["email"],
            "address": customer["address"],
            "neighborhood": customer["neighborhood"],
            "favorites": json.loads(customer["favorites"]) if customer["favorites"] else [],
            "order_count": customer["order_count"],
            "total_spent": float(customer["total_spent"]) if customer["total_spent"] else 0,
            "last_order_at": customer["last_order_at"].isoformat() if customer["last_order_at"] else None
        }

@api_router.put("/customers/{phone}")
@limiter.limit("30/minute")
async def update_customer(request: Request, phone: str, data: CustomerUpdate):
    """Atualizar dados do cliente"""
    async with db_pool.acquire() as conn:
        # Construir query dinâmica
        updates = []
        values = []
        param_idx = 1
        
        if data.name is not None:
            updates.append(f"name = ${param_idx}")
            values.append(data.name)
            param_idx += 1
        if data.email is not None:
            updates.append(f"email = ${param_idx}")
            values.append(data.email)
            param_idx += 1
        if data.address is not None:
            updates.append(f"address = ${param_idx}")
            values.append(data.address)
            param_idx += 1
        if data.neighborhood is not None:
            updates.append(f"neighborhood = ${param_idx}")
            values.append(data.neighborhood)
            param_idx += 1
        if data.favorites is not None:
            updates.append(f"favorites = ${param_idx}")
            values.append(json.dumps(data.favorites))
            param_idx += 1
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        values.append(phone)
        query = f"UPDATE customers SET {', '.join(updates)} WHERE phone = ${param_idx} RETURNING *"
        
        customer = await conn.fetchrow(query, *values)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        return {
            "id": str(customer["id"]),
            "phone": customer["phone"],
            "name": customer["name"],
            "email": customer["email"],
            "address": customer["address"],
            "neighborhood": customer["neighborhood"],
            "favorites": json.loads(customer["favorites"]) if customer["favorites"] else [],
            "order_count": customer["order_count"],
            "total_spent": float(customer["total_spent"]) if customer["total_spent"] else 0
        }

@api_router.get("/customers/{phone}/orders")
@limiter.limit("60/minute")
async def get_customer_orders(request: Request, phone: str, limit: int = 10):
    """Buscar últimos pedidos do cliente"""
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT * FROM orders 
               WHERE customer_phone = $1 
               ORDER BY created_at DESC 
               LIMIT $2""",
            phone, limit
        )
        return [dict(r) for r in rows]

@api_router.get("/customers/{phone}/reorder-suggestions")
@limiter.limit("60/minute")
async def get_reorder_suggestions(request: Request, phone: str):
    """Sugerir produtos para pedir novamente baseado no histórico"""
    async with db_pool.acquire() as conn:
        # Buscar produtos mais pedidos pelo cliente
        rows = await conn.fetch(
            """SELECT 
                   items->>'product_id' as product_id,
                   items->>'product_name' as product_name,
                   COUNT(*) as order_count
               FROM orders, jsonb_array_elements(items) as items
               WHERE customer_phone = $1 
                 AND created_at > NOW() - INTERVAL '90 days'
               GROUP BY items->>'product_id', items->>'product_name'
               ORDER BY order_count DESC
               LIMIT 5""",
            phone
        )
        
        suggestions = []
        for row in rows:
            # Buscar detalhes do produto
            product = await conn.fetchrow(
                "SELECT * FROM products WHERE id = $1",
                uuid.UUID(row["product_id"]) if row["product_id"] else None
            )
            if product:
                suggestions.append({
                    "product_id": str(product["id"]),
                    "name": product["name"],
                    "description": product["description"],
                    "price": float(product["price"]),
                    "image_url": product["image_url"],
                    "times_ordered": row["order_count"]
                })
        
        return suggestions

# ==================== AUTH ROUTES ====================
@api_router.post("/auth/login")
@limiter.limit("5/minute")
async def admin_login(request: Request, login_data: AdminLogin):
    async with db_pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT * FROM admin_users WHERE email = $1",
            login_data.email
        )
        if not user or not user.get("password_hash"):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if not pwd_context.verify(login_data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        token = create_jwt_token(user["id"])
        user_data = {k: v for k, v in user.items() if k != "password_hash"}
        return {"token": token, "user": user_data}

@api_router.get("/auth/google-session")
async def process_google_session(request: Request):
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    try:
        resp = http_client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        data = resp.json()
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Auth error: {str(e)}")

    email = data["email"]
    name = data["name"]
    picture = data.get("picture", "")

    async with db_pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT * FROM admin_users WHERE email = $1",
            email
        )
        if existing:
            user_id = existing["id"]
            await conn.execute(
                "UPDATE admin_users SET name = $1, picture = $2 WHERE id = $3",
                name, picture, user_id
            )
        else:
            user_id = f"admin_{uuid.uuid4().hex[:12]}"
            await conn.execute(
                """INSERT INTO admin_users (id, email, name, picture, role, password_hash, created_at)
                VALUES ($1, $2, $3, $4, 'admin', NULL, $5)""",
                user_id, email, name, picture, datetime.now(timezone.utc)
            )

        token = create_jwt_token(user_id)
        session_token = data.get("session_token", str(uuid.uuid4()))
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        await conn.execute(
            """INSERT INTO sessions (session_token, user_id, expires_at, created_at)
            VALUES ($1, $2, $3, $4)""",
            session_token, user_id, expires_at, datetime.now(timezone.utc)
        )

        user = await conn.fetchrow("SELECT * FROM admin_users WHERE id = $1", user_id)
        user_data = {k: v for k, v in user.items() if k != "password_hash"}

        response = JSONResponse(content={"token": token, "user": user_data})
        response.set_cookie(
            key="session_token", value=session_token, httponly=True,
            secure=True, samesite="none", path="/", max_age=7*24*60*60
        )
        return response

@api_router.get("/auth/me")
async def get_current_user(user=Depends(get_current_admin)):
    user_data = {k: v for k, v in user.items() if k != "password_hash"}
    return user_data

@api_router.post("/auth/logout")
async def admin_logout(request: Request):
    token = request.cookies.get("session_token")
    if token:
        async with db_pool.acquire() as conn:
            await conn.execute("DELETE FROM sessions WHERE session_token = $1", token)
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie("session_token")
    return response

# ==================== ADMIN ORDER ROUTES ====================
@api_router.get("/admin/orders")
async def get_admin_orders(status: str = None, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        if status:
            rows = await conn.fetch(
                "SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC",
                status
            )
        else:
            rows = await conn.fetch("SELECT * FROM orders ORDER BY created_at DESC")
        orders = []
        for r in rows:
            order = dict(r)
            # Ensure items is always a list
            if isinstance(order.get('items'), str):
                try:
                    order['items'] = json.loads(order['items'])
                except:
                    order['items'] = []
            elif not isinstance(order.get('items'), list):
                order['items'] = []
            orders.append(order)
        return orders

@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, body: dict, user=Depends(get_current_admin)):
    status = body.get("status")
    if status not in ["aguardando", "preparando", "entregue"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    async with db_pool.acquire() as conn:
        await conn.execute(
            "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2",
            status, uuid.UUID(order_id)
        )
    return {"message": "Status updated"}

@api_router.put("/admin/orders/{order_id}/payment")
async def mark_order_paid(order_id: str, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        await conn.execute(
            "UPDATE orders SET payment_status = 'pago', updated_at = NOW() WHERE id = $1",
            uuid.UUID(order_id)
        )
    return {"message": "Payment marked"}

# ==================== ADMIN PRODUCT ROUTES ====================
@api_router.get("/admin/products")
async def get_admin_products(category_id: str = None, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        if category_id:
            rows = await conn.fetch(
                "SELECT * FROM products WHERE category_id = $1 ORDER BY \"order\" ASC",
                uuid.UUID(category_id)
            )
        else:
            rows = await conn.fetch("SELECT * FROM products ORDER BY \"order\" ASC")
        return [dict(r) for r in rows]

@api_router.post("/admin/products")
async def create_product(product: ProductCreate, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        last = await conn.fetchrow(
            "SELECT \"order\" FROM products WHERE category_id = $1 ORDER BY \"order\" DESC LIMIT 1",
            uuid.UUID(product.category_id) if product.category_id else None
        )
        next_order = (last["order"] + 1) if last else 0
        
        product_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        comp_ids = [uuid.UUID(cid) for cid in product.complement_ids if cid]
        
        await conn.execute(
            """INSERT INTO products (id, name, description, price, category_id, image_url, 
                stock, tags, additionals, complement_ids, "order", active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)""",
            product_id, product.name, product.description, product.price,
            uuid.UUID(product.category_id) if product.category_id else None,
            product.image_url, product.stock, product.tags,
            json.dumps(product.additionals), comp_ids, next_order, product.active, now
        )
        
        row = await conn.fetchrow("SELECT * FROM products WHERE id = $1", product_id)
        return dict(row)

@api_router.put("/admin/products/{product_id}")
async def update_product(product_id: str, product: ProductUpdate, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        update_fields = []
        params = []
        param_idx = 1
        
        if product.name is not None:
            update_fields.append(f"name = ${param_idx}")
            params.append(product.name)
            param_idx += 1
        if product.description is not None:
            update_fields.append(f"description = ${param_idx}")
            params.append(product.description)
            param_idx += 1
        if product.price is not None:
            update_fields.append(f"price = ${param_idx}")
            params.append(product.price)
            param_idx += 1
        if product.category_id is not None:
            update_fields.append(f"category_id = ${param_idx}")
            params.append(uuid.UUID(product.category_id))
            param_idx += 1
        if product.image_url is not None:
            update_fields.append(f"image_url = ${param_idx}")
            params.append(product.image_url)
            param_idx += 1
        if product.stock is not None:
            update_fields.append(f"stock = ${param_idx}")
            params.append(product.stock)
            param_idx += 1
        if product.tags is not None:
            update_fields.append(f"tags = ${param_idx}")
            params.append(product.tags)
            param_idx += 1
        if product.additionals is not None:
            update_fields.append(f"additionals = ${param_idx}")
            params.append(json.dumps(product.additionals))
            param_idx += 1
        if product.complement_ids is not None:
            update_fields.append(f"complement_ids = ${param_idx}")
            params.append([uuid.UUID(cid) for cid in product.complement_ids if cid])
            param_idx += 1
        if product.active is not None:
            update_fields.append(f"active = ${param_idx}")
            params.append(product.active)
            param_idx += 1
        if product.order is not None:
            update_fields.append(f"\"order\" = ${param_idx}")
            params.append(product.order)
            param_idx += 1
        
        if not update_fields:
            row = await conn.fetchrow("SELECT * FROM products WHERE id = $1", uuid.UUID(product_id))
            return dict(row)
        
        params.append(uuid.UUID(product_id))
        query = f"UPDATE products SET {', '.join(update_fields)} WHERE id = ${param_idx}"
        await conn.execute(query, *params)
        
        row = await conn.fetchrow("SELECT * FROM products WHERE id = $1", uuid.UUID(product_id))
        if not row:
            raise HTTPException(status_code=404, detail="Product not found")
        return dict(row)

@api_router.delete("/admin/products/{product_id}")
async def delete_product(product_id: str, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM products WHERE id = $1",
            uuid.UUID(product_id)
        )
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Product not found")
        return {"message": "Product deleted"}

@api_router.post("/admin/products/{product_id}/clone")
async def clone_product(product_id: str, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        product = await conn.fetchrow("SELECT * FROM products WHERE id = $1", uuid.UUID(product_id))
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        new_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        
        await conn.execute(
            """INSERT INTO products (id, name, description, price, category_id, image_url, 
                stock, tags, additionals, complement_ids, "order", active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)""",
            new_id, f"{product['name']} (copia)", product['description'], product['price'],
            product['category_id'], product['image_url'], product['stock'],
            product['tags'], product['additionals'], product['complement_ids'],
            product['order'], product['active'], now
        )
        
        row = await conn.fetchrow("SELECT * FROM products WHERE id = $1", new_id)
        return dict(row)

@api_router.put("/admin/products/reorder")
async def reorder_products(body: dict, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        async with conn.transaction():
            for item in body.get("items", []):
                await conn.execute(
                    "UPDATE products SET \"order\" = $1 WHERE id = $2",
                    item["order"], uuid.UUID(item["id"])
                )
    return {"message": "Products reordered"}

# ==================== ADMIN CATEGORY ROUTES ====================
@api_router.get("/admin/categories")
async def get_admin_categories(menu_id: str = None, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        if menu_id:
            rows = await conn.fetch(
                "SELECT * FROM categories WHERE menu_id = $1 ORDER BY \"order\" ASC",
                uuid.UUID(menu_id)
            )
        else:
            rows = await conn.fetch("SELECT * FROM categories ORDER BY \"order\" ASC")
        return [dict(r) for r in rows]

@api_router.post("/admin/categories")
async def create_category(category: CategoryCreate, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        last = await conn.fetchrow("SELECT \"order\" FROM categories ORDER BY \"order\" DESC LIMIT 1")
        next_order = (last["order"] + 1) if last else 0
        
        category_id = uuid.uuid4()
        menu_id = uuid.UUID(category.menu_id) if category.menu_id else None
        
        await conn.execute(
            """INSERT INTO categories (id, name, description, icon, menu_id, "order", active, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)""",
            category_id, category.name, category.description, category.icon, menu_id, next_order,
            datetime.now(timezone.utc)
        )
        
        row = await conn.fetchrow("SELECT * FROM categories WHERE id = $1", category_id)
        return dict(row)

@api_router.put("/admin/categories/{category_id}")
async def update_category(category_id: str, body: dict, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        update_data = {k: v for k, v in body.items() if k != "id"}
        if not update_data:
            row = await conn.fetchrow("SELECT * FROM categories WHERE id = $1", uuid.UUID(category_id))
            return dict(row)
        
        fields = []
        params = []
        for i, (k, v) in enumerate(update_data.items(), 1):
            fields.append(f"{k} = ${i}")
            params.append(v)
        params.append(uuid.UUID(category_id))
        
        query = f"UPDATE categories SET {', '.join(fields)} WHERE id = ${len(params)}"
        await conn.execute(query, *params)
        
        row = await conn.fetchrow("SELECT * FROM categories WHERE id = $1", uuid.UUID(category_id))
        if not row:
            raise HTTPException(status_code=404, detail="Category not found")
        return dict(row)

@api_router.delete("/admin/categories/{category_id}")
async def delete_category(category_id: str, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM categories WHERE id = $1",
            uuid.UUID(category_id)
        )
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Category not found")
        return {"message": "Category deleted"}

# ==================== ADMIN COMPLEMENT ROUTES ====================
@api_router.get("/admin/complements")
async def get_admin_complements(user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM complements ORDER BY name ASC")
        return [dict(r) for r in rows]

@api_router.post("/admin/complements")
async def create_complement(comp: ComplementCreate, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        comp_id = uuid.uuid4()
        await conn.execute(
            """INSERT INTO complements (id, name, price, description, category, image_url, 
                required, min_select, max_select, active, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)""",
            comp_id, comp.name, comp.price, comp.description, comp.category, 
            comp.image_url, comp.required, comp.min_select, comp.max_select, 
            comp.active, datetime.now(timezone.utc)
        )
        
        row = await conn.fetchrow("SELECT * FROM complements WHERE id = $1", comp_id)
        return dict(row)

@api_router.put("/admin/complements/{comp_id}")
async def update_complement(comp_id: str, comp: ComplementUpdate, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        update_data = {k: v for k, v in comp.model_dump().items() if v is not None}
        if not update_data:
            row = await conn.fetchrow("SELECT * FROM complements WHERE id = $1", uuid.UUID(comp_id))
            return dict(row)
        
        fields = []
        params = []
        for i, (k, v) in enumerate(update_data.items(), 1):
            fields.append(f"{k} = ${i}")
            params.append(v)
        params.append(uuid.UUID(comp_id))
        
        query = f"UPDATE complements SET {', '.join(fields)} WHERE id = ${len(params)}"
        await conn.execute(query, *params)
        
        row = await conn.fetchrow("SELECT * FROM complements WHERE id = $1", uuid.UUID(comp_id))
        if not row:
            raise HTTPException(status_code=404, detail="Complement not found")
        return dict(row)

@api_router.delete("/admin/complements/{comp_id}")
async def delete_complement(comp_id: str, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        await conn.execute("DELETE FROM complements WHERE id = $1", uuid.UUID(comp_id))
        return {"message": "Complement deleted"}

# ==================== COMPLEMENT CATEGORIES ROUTES ====================
@api_router.get("/admin/complement-categories")
async def get_complement_categories(user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM complement_categories ORDER BY order_index ASC, name ASC"
        )
        return [dict(r) for r in rows]

@api_router.post("/admin/complement-categories")
async def create_complement_category(
    key: str = Form(...),
    name: str = Form(...),
    icon: str = Form(""),
    order_index: int = Form(0),
    required: bool = Form(False),
    min_select: int = Form(0),
    max_select: int = Form(1),
    user=Depends(get_current_admin)
):
    async with db_pool.acquire() as conn:
        cat_id = uuid.uuid4()
        await conn.execute(
            """INSERT INTO complement_categories (id, key, name, icon, order_index, active, required, min_select, max_select, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)""",
            cat_id, key, name, icon, order_index, True, required, min_select, max_select, datetime.now(timezone.utc)
        )
        row = await conn.fetchrow("SELECT * FROM complement_categories WHERE id = $1", cat_id)
        return dict(row)

@api_router.put("/admin/complement-categories/{cat_id}")
async def update_complement_category(
    cat_id: str,
    name: str = Form(None),
    icon: str = Form(None),
    order_index: int = Form(None),
    active: bool = Form(None),
    required: bool = Form(None),
    min_select: int = Form(None),
    max_select: int = Form(None),
    user=Depends(get_current_admin)
):
    async with db_pool.acquire() as conn:
        update_fields = []
        params = []
        param_idx = 1
        
        if name is not None:
            update_fields.append(f"name = ${param_idx}")
            params.append(name)
            param_idx += 1
        if icon is not None:
            update_fields.append(f"icon = ${param_idx}")
            params.append(icon)
            param_idx += 1
        if order_index is not None:
            update_fields.append(f"order_index = ${param_idx}")
            params.append(order_index)
            param_idx += 1
        if active is not None:
            update_fields.append(f"active = ${param_idx}")
            params.append(active)
            param_idx += 1
        if required is not None:
            update_fields.append(f"required = ${param_idx}")
            params.append(required)
            param_idx += 1
        if min_select is not None:
            update_fields.append(f"min_select = ${param_idx}")
            params.append(min_select)
            param_idx += 1
        if max_select is not None:
            update_fields.append(f"max_select = ${param_idx}")
            params.append(max_select)
            param_idx += 1
        
        if not update_fields:
            row = await conn.fetchrow("SELECT * FROM complement_categories WHERE id = $1", uuid.UUID(cat_id))
            return dict(row)
        
        params.append(uuid.UUID(cat_id))
        query = f"UPDATE complement_categories SET {', '.join(update_fields)} WHERE id = ${param_idx}"
        await conn.execute(query, *params)
        
        row = await conn.fetchrow("SELECT * FROM complement_categories WHERE id = $1", uuid.UUID(cat_id))
        return dict(row)

@api_router.delete("/admin/complement-categories/{cat_id}")
async def delete_complement_category(cat_id: str, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        # Verificar se há complementos usando esta categoria
        count = await conn.fetchval(
            "SELECT COUNT(*) FROM complements WHERE category = (SELECT key FROM complement_categories WHERE id = $1)",
            uuid.UUID(cat_id)
        )
        if count > 0:
            raise HTTPException(status_code=400, detail="Categoria em uso por complementos")
        await conn.execute("DELETE FROM complement_categories WHERE id = $1", uuid.UUID(cat_id))
        return {"message": "Category deleted"}

# ==================== PRODUCT COMPLEMENTS ROUTES ====================
@api_router.get("/admin/products/{product_id}/complements")
async def get_product_complements(product_id: str, user=Depends(get_current_admin)):
    """Buscar complementos vinculados a um produto"""
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT c.*, pc.id as product_complement_id, pc."order" 
               FROM complements c
               JOIN product_complements pc ON c.id = pc.complement_id
               WHERE pc.product_id = $1
               ORDER BY pc."order" ASC, c.name ASC""",
            uuid.UUID(product_id)
        )
        return [dict(r) for r in rows]

@api_router.post("/admin/products/{product_id}/complements")
async def add_complement_to_product(
    product_id: str, 
    data: dict,
    user=Depends(get_current_admin)
):
    """Vincular um complemento a um produto"""
    complement_id = data.get("complement_id")
    if not complement_id:
        raise HTTPException(status_code=400, detail="complement_id is required")
    
    async with db_pool.acquire() as conn:
        # Verificar se já existe
        existing = await conn.fetchrow(
            "SELECT * FROM product_complements WHERE product_id = $1 AND complement_id = $2",
            uuid.UUID(product_id), uuid.UUID(complement_id)
        )
        if existing:
            raise HTTPException(status_code=400, detail="Complement already linked to product")
        
        # Pegar próxima ordem
        last = await conn.fetchrow(
            'SELECT "order" FROM product_complements WHERE product_id = $1 ORDER BY "order" DESC LIMIT 1',
            uuid.UUID(product_id)
        )
        next_order = (last["order"] + 1) if last else 0
        
        await conn.execute(
            """INSERT INTO product_complements (id, product_id, complement_id, "order", created_at)
               VALUES ($1, $2, $3, $4, $5)""",
            uuid.uuid4(), uuid.UUID(product_id), uuid.UUID(complement_id), next_order,
            datetime.now(timezone.utc)
        )
        return {"message": "Complement added to product"}

@api_router.delete("/admin/products/{product_id}/complements/{complement_id}")
async def remove_complement_from_product(
    product_id: str, 
    complement_id: str,
    user=Depends(get_current_admin)
):
    """Desvincular um complemento de um produto"""
    async with db_pool.acquire() as conn:
        await conn.execute(
            "DELETE FROM product_complements WHERE product_id = $1 AND complement_id = $2",
            uuid.UUID(product_id), uuid.UUID(complement_id)
        )
        return {"message": "Complement removed from product"}

# ==================== ADMIN MENU ROUTES ====================
@api_router.get("/admin/menus")
async def get_admin_menus(user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM menus ORDER BY \"order\" ASC")
        return [dict(r) for r in rows]

@api_router.post("/admin/menus")
async def create_menu(menu: MenuCreate, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        last = await conn.fetchrow("SELECT \"order\" FROM menus ORDER BY \"order\" DESC LIMIT 1")
        next_order = (last["order"] + 1) if last else 0
        
        menu_id = uuid.uuid4()
        cat_ids = [uuid.UUID(cid) for cid in menu.category_ids if cid]
        
        await conn.execute(
            """INSERT INTO menus (id, name, description, category_ids, "order", active, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)""",
            menu_id, menu.name, menu.description, cat_ids, next_order, menu.active,
            datetime.now(timezone.utc)
        )
        
        row = await conn.fetchrow("SELECT * FROM menus WHERE id = $1", menu_id)
        return dict(row)

@api_router.put("/admin/menus/{menu_id}")
async def update_menu(menu_id: str, menu: MenuUpdate, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        update_data = {k: v for k, v in menu.model_dump().items() if v is not None}
        if not update_data:
            row = await conn.fetchrow("SELECT * FROM menus WHERE id = $1", uuid.UUID(menu_id))
            return dict(row)
        
        if "category_ids" in update_data:
            update_data["category_ids"] = [uuid.UUID(cid) for cid in update_data["category_ids"] if cid]
        
        fields = []
        params = []
        for i, (k, v) in enumerate(update_data.items(), 1):
            fields.append(f"{k} = ${i}")
            params.append(v)
        params.append(uuid.UUID(menu_id))
        
        query = f"UPDATE menus SET {', '.join(fields)} WHERE id = ${len(params)}"
        await conn.execute(query, *params)
        
        row = await conn.fetchrow("SELECT * FROM menus WHERE id = $1", uuid.UUID(menu_id))
        if not row:
            raise HTTPException(status_code=404, detail="Menu not found")
        return dict(row)

@api_router.delete("/admin/menus/{menu_id}")
async def delete_menu(menu_id: str, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        await conn.execute("DELETE FROM menus WHERE id = $1", uuid.UUID(menu_id))
        return {"message": "Menu deleted"}

# ==================== ADMIN BANNER ROUTES ====================
@api_router.get("/admin/banners")
async def get_admin_banners(user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM banners ORDER BY \"order\" ASC")
        return [dict(r) for r in rows]

@api_router.post("/admin/banners")
async def create_banner(banner: BannerCreate, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        banner_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        
        await conn.execute(
            """INSERT INTO banners (id, title, subtitle, image_url, cta_text, cta_link, 
                active, "order", created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)""",
            banner_id, banner.title, banner.subtitle, banner.image_url,
            banner.cta_text, banner.cta_link, banner.active, banner.order, now
        )
        
        row = await conn.fetchrow("SELECT * FROM banners WHERE id = $1", banner_id)
        return dict(row)

@api_router.put("/admin/banners/{banner_id}")
async def update_banner(banner_id: str, banner: BannerUpdate, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        update_data = {k: v for k, v in banner.model_dump().items() if v is not None}
        if not update_data:
            row = await conn.fetchrow("SELECT * FROM banners WHERE id = $1", uuid.UUID(banner_id))
            return dict(row)
        
        fields = []
        params = []
        for i, (k, v) in enumerate(update_data.items(), 1):
            fields.append(f"{k} = ${i}")
            params.append(v)
        params.append(uuid.UUID(banner_id))
        
        query = f"UPDATE banners SET {', '.join(fields)} WHERE id = ${len(params)}"
        await conn.execute(query, *params)
        
        row = await conn.fetchrow("SELECT * FROM banners WHERE id = $1", uuid.UUID(banner_id))
        if not row:
            raise HTTPException(status_code=404, detail="Banner not found")
        return dict(row)

@api_router.delete("/admin/banners/{banner_id}")
async def delete_banner(banner_id: str, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        result = await conn.execute("DELETE FROM banners WHERE id = $1", uuid.UUID(banner_id))
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Banner not found")
        return {"message": "Banner deleted"}

@api_router.put("/admin/banners/reorder")
async def reorder_banners(body: dict, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        async with conn.transaction():
            for item in body.get("items", []):
                await conn.execute(
                    "UPDATE banners SET \"order\" = $1 WHERE id = $2",
                    item["order"], uuid.UUID(item["id"])
                )
    return {"message": "Banners reordered"}

# ==================== ADMIN COMBO ROUTES ====================
@api_router.get("/admin/combos")
async def get_admin_combos(user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM combos ORDER BY \"order\" ASC")
        combos = [dict(r) for r in rows]
        
        # Buscar itens de cada combo
        for combo in combos:
            items = await conn.fetch(
                """SELECT ci.*, c.name as category_name 
                   FROM combo_items ci
                   LEFT JOIN categories c ON ci.category_id = c.id
                   WHERE ci.combo_id = $1""",
                combo["id"]
            )
            combo["items"] = [dict(i) for i in items]
        
        return combos

@api_router.post("/admin/combos")
async def create_combo(combo: ComboCreate, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        # Pegar próxima ordem
        last = await conn.fetchrow('SELECT "order" FROM combos ORDER BY "order" DESC LIMIT 1')
        next_order = (last["order"] + 1) if last else 0
        
        combo_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        
        await conn.execute(
            """INSERT INTO combos (id, name, description, image_url, base_price, 
                discount_percent, active, "order", created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)""",
            combo_id, combo.name, combo.description, combo.image_url,
            combo.base_price, combo.discount_percent, combo.active, next_order, now
        )
        
        # Inserir itens do combo
        for item in combo.items:
            await conn.execute(
                """INSERT INTO combo_items (id, combo_id, category_id, quantity, allow_choices, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)""",
                uuid.uuid4(), combo_id, uuid.UUID(item["category_id"]) if item.get("category_id") else None,
                item.get("quantity", 1), item.get("allow_choices", True), now
            )
        
        row = await conn.fetchrow("SELECT * FROM combos WHERE id = $1", combo_id)
        return dict(row)

@api_router.put("/admin/combos/{combo_id}")
async def update_combo(combo_id: str, combo: ComboUpdate, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        # Atualizar dados do combo
        update_data = {k: v for k, v in combo.model_dump().items() if v is not None and k != "items"}
        
        if update_data:
            fields = []
            params = []
            for i, (k, v) in enumerate(update_data.items(), 1):
                fields.append(f"{k} = ${i}")
                params.append(v)
            params.append(uuid.UUID(combo_id))
            
            query = f"UPDATE combos SET {', '.join(fields)} WHERE id = ${len(params)}"
            await conn.execute(query, *params)
        
        # Atualizar itens se fornecidos
        if combo.items is not None:
            # Remover itens antigos
            await conn.execute("DELETE FROM combo_items WHERE combo_id = $1", uuid.UUID(combo_id))
            
            # Inserir novos itens
            now = datetime.now(timezone.utc)
            for item in combo.items:
                await conn.execute(
                    """INSERT INTO combo_items (id, combo_id, category_id, quantity, allow_choices, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6)""",
                    uuid.uuid4(), uuid.UUID(combo_id), 
                    uuid.UUID(item["category_id"]) if item.get("category_id") else None,
                    item.get("quantity", 1), item.get("allow_choices", True), now
                )
        
        row = await conn.fetchrow("SELECT * FROM combos WHERE id = $1", uuid.UUID(combo_id))
        if not row:
            raise HTTPException(status_code=404, detail="Combo not found")
        return dict(row)

@api_router.delete("/admin/combos/{combo_id}")
async def delete_combo(combo_id: str, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        result = await conn.execute("DELETE FROM combos WHERE id = $1", uuid.UUID(combo_id))
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Combo not found")
        return {"message": "Combo deleted"}

@api_router.put("/admin/combos/reorder")
async def reorder_combos(body: dict, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        async with conn.transaction():
            for item in body.get("items", []):
                await conn.execute(
                    "UPDATE combos SET \"order\" = $1 WHERE id = $2",
                    item["order"], uuid.UUID(item["id"])
                )
    return {"message": "Combos reordered"}

# ==================== ADMIN CUSTOMER ROUTES ====================
@api_router.get("/admin/customers")
async def get_admin_customers(search: str = None, tag: str = None, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        if search:
            rows = await conn.fetch(
                """SELECT * FROM customers 
                   WHERE name ILIKE $1 OR phone ILIKE $1 
                   ORDER BY last_order_at DESC NULLS LAST""",
                f"%{search}%"
            )
        elif tag:
            rows = await conn.fetch(
                "SELECT * FROM customers WHERE $1 = ANY(tags) ORDER BY last_order_at DESC NULLS LAST",
                tag
            )
        else:
            rows = await conn.fetch(
                "SELECT * FROM customers ORDER BY last_order_at DESC NULLS LAST"
            )
        return [dict(r) for r in rows]

@api_router.get("/admin/customers/{customer_id}")
async def get_admin_customer(customer_id: str, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        customer = await conn.fetchrow(
            "SELECT * FROM customers WHERE id = $1",
            uuid.UUID(customer_id)
        )
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        orders = await conn.fetch(
            "SELECT * FROM orders WHERE customer_phone = $1 ORDER BY created_at DESC",
            customer["phone"]
        )
        
        result = dict(customer)
        result["orders"] = [dict(o) for o in orders]
        return result

@api_router.put("/admin/customers/{customer_id}")
async def update_customer(customer_id: str, update: CustomerUpdate, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        update_data = {k: v for k, v in update.model_dump().items() if v is not None}
        if not update_data:
            row = await conn.fetchrow("SELECT * FROM customers WHERE id = $1", uuid.UUID(customer_id))
            return dict(row)
        
        fields = []
        params = []
        for i, (k, v) in enumerate(update_data.items(), 1):
            fields.append(f"{k} = ${i}")
            params.append(v)
        params.append(uuid.UUID(customer_id))
        
        query = f"UPDATE customers SET {', '.join(fields)} WHERE id = ${len(params)}"
        result = await conn.execute(query, *params)
        
        if result == "UPDATE 0":
            raise HTTPException(status_code=404, detail="Customer not found")
        
        row = await conn.fetchrow("SELECT * FROM customers WHERE id = $1", uuid.UUID(customer_id))
        return dict(row)

# ==================== ADMIN REPORTS ====================
@api_router.get("/admin/reports/sales")
async def get_sales_report(date: str = None, user=Depends(get_current_admin)):
    from datetime import datetime as dt
    
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Converter string para objeto date
    try:
        date_obj = dt.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        date_obj = datetime.now(timezone.utc).date()
    
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT * FROM orders 
               WHERE DATE(created_at) = $1 
               ORDER BY created_at ASC""",
            date_obj
        )
        orders = [dict(r) for r in rows]
        
        total_sales = sum(o.get("total", 0) for o in orders)
        total_orders = len(orders)
        paid_orders = len([o for o in orders if o.get("payment_status") == "pago"])
        avg_ticket = total_sales / total_orders if total_orders > 0 else 0
        delivery_count = len([o for o in orders if o.get("delivery_type") == "entrega"])
        pickup_count = len([o for o in orders if o.get("delivery_type") == "retirada"])

        hourly = {}
        for o in orders:
            try:
                hour = o["created_at"].strftime("%H:00")
                hourly[hour] = hourly.get(hour, 0) + 1
            except Exception:
                pass
        peak_hour = max(hourly, key=hourly.get) if hourly else "N/A"

        product_sales = {}
        for o in orders:
            items = o.get("items", []) or []
            if isinstance(items, str):
                items = json.loads(items)
            for item in items:
                name = item.get("product_name", "")
                product_sales[name] = product_sales.get(name, 0) + item.get("quantity", 0)
        top_products = sorted(product_sales.items(), key=lambda x: x[1], reverse=True)[:5]

        return {
            "date": date, "total_sales": round(total_sales, 2), "total_orders": total_orders,
            "paid_orders": paid_orders, "avg_ticket": round(avg_ticket, 2),
            "delivery_count": delivery_count, "pickup_count": pickup_count,
            "peak_hour": peak_hour, "hourly_breakdown": hourly,
            "top_products": [{"name": n, "quantity": q} for n, q in top_products]
        }

@api_router.get("/admin/reports/export")
async def export_csv_report(date: str = None, user=Depends(get_current_admin)):
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT * FROM orders 
               WHERE DATE(created_at) = $1 
               ORDER BY created_at ASC""",
            date
        )
        orders = [dict(r) for r in rows]

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Pedido", "Cliente", "Telefone", "Tipo", "Status", "Pagamento", "Total", "Data"])
        for o in orders:
            writer.writerow([
                f"#{o.get('order_number', '')}", o.get("customer_name", ""),
                o.get("customer_phone", ""), o.get("delivery_type", ""),
                o.get("status", ""), o.get("payment_status", ""),
                f"R$ {o.get('total', 0):.2f}", o.get("created_at", "")
            ])
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=vendas_{date}.csv"}
        )

# ==================== ADMIN DELIVERY ====================
@api_router.get("/admin/delivery-settings")
async def get_admin_delivery(user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM delivery_settings WHERE id = 1")
        if row:
            return dict(row)
        return {"areas": [], "delivery_fee": 5.0, "min_free_delivery": 50.0, "active": True}

@api_router.put("/admin/delivery-settings")
async def update_delivery(settings: DeliverySettingsUpdate, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO delivery_settings (id, areas, delivery_fee, min_free_delivery, active)
            VALUES (1, $1, $2, $3, $4)
            ON CONFLICT (id) DO UPDATE SET
                areas = EXCLUDED.areas,
                delivery_fee = EXCLUDED.delivery_fee,
                min_free_delivery = EXCLUDED.min_free_delivery,
                active = EXCLUDED.active""",
            json.dumps(settings.areas), settings.delivery_fee, settings.min_free_delivery, settings.active
        )
        row = await conn.fetchrow("SELECT * FROM delivery_settings WHERE id = 1")
        return dict(row)

@api_router.get("/admin/pix-settings")
async def get_admin_pix(user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM pix_settings WHERE id = 1")
        if row:
            return dict(row)
        return {"pix_key": "", "pix_name": "Salada Soul", "qr_code_url": ""}

@api_router.put("/admin/pix-settings")
async def update_pix(settings: PixSettingsUpdate, user=Depends(get_current_admin)):
    async with db_pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO pix_settings (id, pix_key, pix_name, qr_code_url)
            VALUES (1, $1, $2, $3)
            ON CONFLICT (id) DO UPDATE SET
                pix_key = EXCLUDED.pix_key,
                pix_name = EXCLUDED.pix_name,
                qr_code_url = EXCLUDED.qr_code_url""",
            settings.pix_key, settings.pix_name, settings.qr_code_url
        )
        row = await conn.fetchrow("SELECT * FROM pix_settings WHERE id = 1")
        return dict(row)

# ==================== UPLOAD ====================
@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), user=Depends(get_current_admin)):
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = UPLOAD_DIR / filename
    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)
    return {"url": f"/api/uploads/{filename}"}

# ==================== APP SETUP ====================
# CORS configuration - restrict in production
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'development')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

# Always use production CORS settings for HTTPS domains
allowed_origins = [
    FRONTEND_URL,
    "https://saladasoul.com",
    "https://www.saladasoul.com",
    "https://saladasoul.shop",
    "https://www.saladasoul.shop",
    "http://localhost:3000",
    "http://localhost:3001",
]
# Add any additional origins from env var
additional_origins = os.environ.get('ADDITIONAL_CORS_ORIGINS', '')
if additional_origins:
    allowed_origins.extend([o.strip() for o in additional_origins.split(',') if o.strip()])

logger.info(f"CORS allowed origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With", "X-Session-ID"],
    max_age=600,  # Cache preflight for 10 minutes
)

app.include_router(api_router)
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

@app.on_event("startup")
async def startup():
    global db_pool
    logger.info("Starting up Salada Soul API", extra={
        'environment': ENVIRONMENT,
        'version': '1.0.0'
    })
    
    # Log database configuration (without password)
    logger.info(f"Database config - Host: {DB_HOST}, Port: {DB_PORT}, Database: {DB_NAME}, User: {DB_USER}")
    logger.info(f"DATABASE_URL configured: {bool(DATABASE_URL)}")
    
    # SSL is required for Supabase connections
    ssl_mode = 'require' if DATABASE_URL and 'supabase' in DATABASE_URL else None
    logger.info(f"SSL mode: {ssl_mode}")
    
    try:
        db_pool = await asyncpg.create_pool(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            port=DB_PORT,
            min_size=5,
            max_size=20,
            ssl=ssl_mode
        )
        logger.info("Database pool created", extra={
            'host': DB_HOST,
            'database': DB_NAME,
            'pool_size': '5-20'
        })
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        logger.error(f"DB_HOST: {DB_HOST}, DB_PORT: {DB_PORT}, DB_NAME: {DB_NAME}")
        raise

@app.on_event("shutdown")
async def shutdown():
    if db_pool:
        await db_pool.close()
        logger.info("Database pool closed")
    logger.info("Shutting down Salada Soul API")

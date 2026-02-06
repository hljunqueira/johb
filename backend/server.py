from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Request, Query
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
import json
import csv
import io
import requests as http_client

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
JWT_SECRET = os.environ.get('JWT_SECRET')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
UPLOAD_DIR = ROOT_DIR / 'uploads'
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================
class ProductCreate(BaseModel):
    name: str
    description: str = ""
    price: float
    category_id: str
    image_url: str = ""
    stock: int = -1
    tags: List[str] = []
    additionals: List[dict] = []
    complement_ids: List[str] = []
    active: bool = True

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
    product_id: str
    product_name: str
    quantity: int
    price: float
    observation: str = ""

class OrderCreate(BaseModel):
    customer_name: str
    customer_phone: str
    delivery_type: str
    address: str = ""
    neighborhood: str = ""
    items: List[OrderItemCreate]
    observation: str = ""

class OrderRating(BaseModel):
    rating: int
    comment: str = ""

class CategoryCreate(BaseModel):
    name: str
    description: str = ""
    icon: str = ""

class AdminLogin(BaseModel):
    email: str
    password: str

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
    active: bool = True

class ComplementUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    description: Optional[str] = None
    active: Optional[bool] = None

class MenuCreate(BaseModel):
    name: str
    description: str = ""
    category_ids: List[str] = []
    active: bool = True

class MenuUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_ids: Optional[List[str]] = None
    active: Optional[bool] = None

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
        user = await db.admin_users.find_one({"id": payload["sub"]}, {"_id": 0})
        if user:
            return user
    except (JWTError, Exception):
        pass

    session = await db.sessions.find_one({"session_token": token}, {"_id": 0})
    if session:
        expires_at = session.get("expires_at", "")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at > datetime.now(timezone.utc):
            user = await db.admin_users.find_one({"id": session["user_id"]}, {"_id": 0})
            if user:
                return user

    raise HTTPException(status_code=401, detail="Not authenticated")

def create_jwt_token(user_id: str):
    return jwt.encode(
        {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)},
        JWT_SECRET, algorithm=JWT_ALGORITHM
    )

async def resolve_product_complements(products):
    all_ids = set()
    for p in products:
        all_ids.update(p.get("complement_ids", []))
    if not all_ids:
        return products
    comps = await db.complements.find({"id": {"$in": list(all_ids)}, "active": True}, {"_id": 0}).to_list(200)
    comp_map = {c["id"]: c for c in comps}
    for p in products:
        if p.get("complement_ids"):
            p["additionals"] = [{"name": comp_map[cid]["name"], "price": comp_map[cid]["price"], "id": cid} for cid in p["complement_ids"] if cid in comp_map]
    return products

# ==================== PUBLIC ROUTES ====================
@api_router.get("/")
async def root():
    return {"message": "Salada Soul API"}

@api_router.get("/categories")
async def get_categories():
    categories = await db.categories.find({"active": True}, {"_id": 0}).sort("order", 1).to_list(100)
    return categories

@api_router.get("/products")
async def get_products(category_id: str = None, search: str = None):
    query = {"active": True}
    if category_id:
        query["category_id"] = category_id
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    products = await db.products.find(query, {"_id": 0}).sort("order", 1).to_list(100)
    products = [p for p in products if p.get("stock", -1) != 0]
    products = await resolve_product_complements(products)
    return products

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    products = await resolve_product_complements([product])
    return products[0]

@api_router.get("/delivery-settings")
async def get_delivery_settings():
    settings = await db.delivery_settings.find_one({}, {"_id": 0})
    return settings or {"areas": [], "delivery_fee": 5.0, "min_free_delivery": 50.0, "active": True}

@api_router.get("/pix-settings")
async def get_pix_settings():
    settings = await db.pix_settings.find_one({}, {"_id": 0})
    return settings or {"pix_key": "", "pix_name": "Salada Soul", "qr_code_url": ""}

@api_router.get("/complements")
async def get_complements():
    return await db.complements.find({"active": True}, {"_id": 0}).sort("name", 1).to_list(200)

@api_router.get("/menus")
async def get_menus():
    return await db.menus.find({"active": True}, {"_id": 0}).sort("order", 1).to_list(50)

# ==================== ORDER ROUTES ====================
@api_router.post("/orders")
async def create_order(order: OrderCreate):
    counter = await db.counters.find_one_and_update(
        {"name": "order_number"},
        {"$inc": {"value": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    order_number = counter["value"] if counter else 1

    subtotal = sum(item.price * item.quantity for item in order.items)

    delivery_fee = 0.0
    if order.delivery_type == "entrega":
        settings = await db.delivery_settings.find_one({}, {"_id": 0})
        if settings and settings.get("active"):
            if subtotal < settings.get("min_free_delivery", 50.0):
                area = next((a for a in settings.get("areas", []) if a["name"] == order.neighborhood), None)
                delivery_fee = area["fee"] if area else settings.get("delivery_fee", 5.0)

    total = subtotal + delivery_fee

    for item in order.items:
        product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
        if product and product.get("stock", -1) > 0:
            new_stock = max(0, product["stock"] - item.quantity)
            await db.products.update_one(
                {"id": item.product_id},
                {"$set": {"stock": new_stock, "active": new_stock > 0}}
            )

    order_doc = {
        "id": str(uuid.uuid4()),
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
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.orders.insert_one(order_doc)
    order_doc.pop("_id", None)

    # Update or create customer
    customer = await db.customers.find_one({"phone": order.customer_phone}, {"_id": 0})
    if customer:
        orders_count = customer.get("orders_count", 0) + 1
        tags = customer.get("tags", ["novo"])
        if orders_count >= 10:
            tags = list(set(tags) | {"vip"})
        elif orders_count >= 3:
            tags = list(set(tags) - {"novo"} | {"frequente"})
        await db.customers.update_one(
            {"phone": order.customer_phone},
            {"$set": {
                "name": order.customer_name,
                "orders_count": orders_count,
                "last_order_date": datetime.now(timezone.utc).isoformat(),
                "address": order.address if order.address else customer.get("address", ""),
                "tags": tags
            }}
        )
    else:
        await db.customers.insert_one({
            "id": str(uuid.uuid4()),
            "name": order.customer_name,
            "phone": order.customer_phone,
            "address": order.address,
            "orders_count": 1,
            "last_order_date": datetime.now(timezone.utc).isoformat(),
            "internal_note": "",
            "tags": ["novo"],
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    return order_doc

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@api_router.get("/orders/phone/{phone}")
async def get_orders_by_phone(phone: str):
    orders = await db.orders.find({"customer_phone": phone}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders

@api_router.post("/orders/{order_id}/rate")
async def rate_order(order_id: str, rating: OrderRating):
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"rating": rating.rating, "rating_comment": rating.comment}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Rating saved"}

# ==================== AUTH ROUTES ====================
@api_router.post("/auth/login")
async def admin_login(login_data: AdminLogin):
    user = await db.admin_users.find_one({"email": login_data.email}, {"_id": 0})
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

    existing = await db.admin_users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["id"]
        await db.admin_users.update_one({"id": user_id}, {"$set": {"name": name, "picture": picture}})
    else:
        user_id = f"admin_{uuid.uuid4().hex[:12]}"
        await db.admin_users.insert_one({
            "id": user_id, "email": email, "name": name, "picture": picture,
            "role": "admin", "password_hash": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    token = create_jwt_token(user_id)
    session_token = data.get("session_token", str(uuid.uuid4()))
    await db.sessions.insert_one({
        "session_token": session_token, "user_id": user_id,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    user = await db.admin_users.find_one({"id": user_id}, {"_id": 0})
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
        await db.sessions.delete_one({"session_token": token})
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie("session_token")
    return response

# ==================== ADMIN ORDER ROUTES ====================
@api_router.get("/admin/orders")
async def get_admin_orders(status: str = None, user=Depends(get_current_admin)):
    query = {}
    if status:
        query["status"] = status
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return orders

@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, body: dict, user=Depends(get_current_admin)):
    status = body.get("status")
    if status not in ["aguardando", "preparando", "entregue"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Status updated"}

@api_router.put("/admin/orders/{order_id}/payment")
async def mark_order_paid(order_id: str, user=Depends(get_current_admin)):
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"payment_status": "pago", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Payment marked"}

# ==================== ADMIN PRODUCT ROUTES ====================
@api_router.get("/admin/products")
async def get_admin_products(user=Depends(get_current_admin)):
    products = await db.products.find({}, {"_id": 0}).sort("order", 1).to_list(500)
    return products

@api_router.post("/admin/products")
async def create_product(product: ProductCreate, user=Depends(get_current_admin)):
    last = await db.products.find_one({"category_id": product.category_id}, sort=[("order", -1)])
    next_order = (last.get("order", 0) + 1) if last else 0
    doc = {
        "id": str(uuid.uuid4()), **product.model_dump(),
        "order": next_order,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/admin/products/{product_id}")
async def update_product(product_id: str, product: ProductUpdate, user=Depends(get_current_admin)):
    update_data = {k: v for k, v in product.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.products.update_one({"id": product_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/products/{product_id}")
async def delete_product(product_id: str, user=Depends(get_current_admin)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

@api_router.post("/admin/products/{product_id}/clone")
async def clone_product(product_id: str, user=Depends(get_current_admin)):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    clone = {**product}
    clone["id"] = str(uuid.uuid4())
    clone["name"] = f"{product['name']} (copia)"
    clone["created_at"] = datetime.now(timezone.utc).isoformat()
    clone["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.products.insert_one(clone)
    clone.pop("_id", None)
    return clone

@api_router.put("/admin/products/reorder")
async def reorder_products(body: dict, user=Depends(get_current_admin)):
    for item in body.get("items", []):
        await db.products.update_one({"id": item["id"]}, {"$set": {"order": item["order"]}})
    return {"message": "Products reordered"}

# ==================== ADMIN CATEGORY ROUTES ====================
@api_router.get("/admin/categories")
async def get_admin_categories(user=Depends(get_current_admin)):
    return await db.categories.find({}, {"_id": 0}).sort("order", 1).to_list(100)

@api_router.post("/admin/categories")
async def create_category(category: CategoryCreate, user=Depends(get_current_admin)):
    last = await db.categories.find_one({}, sort=[("order", -1)])
    next_order = (last.get("order", 0) + 1) if last else 0
    doc = {
        "id": str(uuid.uuid4()), **category.model_dump(),
        "order": next_order, "active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.categories.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/admin/categories/{category_id}")
async def update_category(category_id: str, body: dict, user=Depends(get_current_admin)):
    update_data = {k: v for k, v in body.items() if k != "id"}
    result = await db.categories.update_one({"id": category_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return await db.categories.find_one({"id": category_id}, {"_id": 0})

@api_router.delete("/admin/categories/{category_id}")
async def delete_category(category_id: str, user=Depends(get_current_admin)):
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}

# ==================== ADMIN CUSTOMER ROUTES ====================
@api_router.get("/admin/customers")
async def get_admin_customers(search: str = None, tag: str = None, user=Depends(get_current_admin)):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    if tag:
        query["tags"] = tag
    return await db.customers.find(query, {"_id": 0}).sort("last_order_date", -1).to_list(500)

@api_router.get("/admin/customers/{customer_id}")
async def get_admin_customer(customer_id: str, user=Depends(get_current_admin)):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    orders = await db.orders.find({"customer_phone": customer["phone"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {**customer, "orders": orders}

@api_router.put("/admin/customers/{customer_id}")
async def update_customer(customer_id: str, update: CustomerUpdate, user=Depends(get_current_admin)):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    result = await db.customers.update_one({"id": customer_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return await db.customers.find_one({"id": customer_id}, {"_id": 0})

# ==================== ADMIN REPORTS ====================
@api_router.get("/admin/reports/sales")
async def get_sales_report(date: str = None, user=Depends(get_current_admin)):
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    start = f"{date}T00:00:00"
    end = f"{date}T23:59:59"
    orders = await db.orders.find(
        {"created_at": {"$gte": start, "$lte": end}}, {"_id": 0}
    ).to_list(1000)

    total_sales = sum(o.get("total", 0) for o in orders)
    total_orders = len(orders)
    paid_orders = len([o for o in orders if o.get("payment_status") == "pago"])
    avg_ticket = total_sales / total_orders if total_orders > 0 else 0
    delivery_count = len([o for o in orders if o.get("delivery_type") == "entrega"])
    pickup_count = len([o for o in orders if o.get("delivery_type") == "retirada"])

    hourly = {}
    for o in orders:
        try:
            hour = datetime.fromisoformat(o["created_at"]).strftime("%H:00")
            hourly[hour] = hourly.get(hour, 0) + 1
        except Exception:
            pass
    peak_hour = max(hourly, key=hourly.get) if hourly else "N/A"

    product_sales = {}
    for o in orders:
        for item in o.get("items", []):
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
    start = f"{date}T00:00:00"
    end = f"{date}T23:59:59"
    orders = await db.orders.find(
        {"created_at": {"$gte": start, "$lte": end}}, {"_id": 0}
    ).to_list(1000)

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
    settings = await db.delivery_settings.find_one({}, {"_id": 0})
    return settings or {"areas": [], "delivery_fee": 5.0, "min_free_delivery": 50.0, "active": True}

@api_router.put("/admin/delivery-settings")
async def update_delivery(settings: DeliverySettingsUpdate, user=Depends(get_current_admin)):
    await db.delivery_settings.update_one({}, {"$set": settings.model_dump()}, upsert=True)
    result = await db.delivery_settings.find_one({}, {"_id": 0})
    return result

@api_router.get("/admin/pix-settings")
async def get_admin_pix(user=Depends(get_current_admin)):
    settings = await db.pix_settings.find_one({}, {"_id": 0})
    return settings or {"pix_key": "", "pix_name": "Salada Soul", "qr_code_url": ""}

@api_router.put("/admin/pix-settings")
async def update_pix(settings: PixSettingsUpdate, user=Depends(get_current_admin)):
    await db.pix_settings.update_one({}, {"$set": settings.model_dump()}, upsert=True)
    result = await db.pix_settings.find_one({}, {"_id": 0})
    return result

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

# ==================== SEED DATA ====================
async def seed_data():
    count = await db.categories.count_documents({})
    if count > 0:
        return

    logger.info("Seeding initial data...")

    admin_password = pwd_context.hash("admin123")
    await db.admin_users.insert_one({
        "id": f"admin_{uuid.uuid4().hex[:12]}", "email": "admin@saladasoul.com",
        "name": "Admin", "role": "admin", "password_hash": admin_password,
        "picture": "", "created_at": datetime.now(timezone.utc).isoformat()
    })

    cats = [
        {"id": str(uuid.uuid4()), "name": "Saladas", "description": "Frescas, crocantes e cheias de sabor", "icon": "salad", "order": 0, "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Bowls", "description": "Nutritivos e equilibrados", "icon": "bowl", "order": 1, "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Sucos", "description": "Naturais e refrescantes", "icon": "juice", "order": 2, "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Sobremesas", "description": "Doces saudaveis para adocar seu dia", "icon": "dessert", "order": 3, "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.categories.insert_many(cats)

    now = datetime.now(timezone.utc).isoformat()
    products = [
        {"id": str(uuid.uuid4()), "category_id": cats[0]["id"], "name": "Deusa Verde", "description": "Couve, abacate, pepino, sementes de abobora, molho tahini", "price": 42.90, "image_url": "https://images.unsplash.com/photo-1689832832416-e9be9dc30c6b?w=400", "stock": -1, "tags": ["vegano", "mais_pedido"], "additionals": [{"name": "Proteina extra", "price": 8.0}], "order": 0, "active": True, "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "category_id": cats[0]["id"], "name": "Caesar Classica", "description": "Alface romana, croutons, parmesao ralado, molho caesar caseiro", "price": 36.00, "image_url": "https://images.unsplash.com/photo-1547261434-a2ab96e6ae5c?w=400", "stock": -1, "tags": ["recomendado"], "additionals": [{"name": "Frango grelhado", "price": 10.0}], "order": 1, "active": True, "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "category_id": cats[0]["id"], "name": "Mediterranean Mix", "description": "Tomate, pepino, azeitona kalamata, queijo feta, cebola roxa", "price": 38.50, "image_url": "https://images.pexels.com/photos/35241090/pexels-photo-35241090.jpeg?auto=compress&w=400", "stock": -1, "tags": ["vegano", "leve"], "additionals": [], "order": 2, "active": True, "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "category_id": cats[1]["id"], "name": "Buddha Bowl", "description": "Quinoa, grao de bico assado, abacate, batata doce, tahini", "price": 48.50, "image_url": "https://images.unsplash.com/photo-1642394079524-1d688c19c17a?w=400", "stock": -1, "tags": ["vegano", "mais_pedido"], "additionals": [{"name": "Tofu grelhado", "price": 7.0}], "order": 0, "active": True, "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "category_id": cats[1]["id"], "name": "Acai Power", "description": "Acai, granola artesanal, banana, mel organico, frutas vermelhas", "price": 32.00, "image_url": "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400", "stock": -1, "tags": ["recomendado"], "additionals": [{"name": "Granola extra", "price": 4.0}], "order": 1, "active": True, "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "category_id": cats[2]["id"], "name": "Detox Sunrise", "description": "Cenoura, maca verde, gengibre, limao", "price": 18.00, "image_url": "https://images.unsplash.com/photo-1717398804885-a6c22b3e5c2f?w=400", "stock": -1, "tags": ["leve", "mais_pedido"], "additionals": [], "order": 0, "active": True, "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "category_id": cats[2]["id"], "name": "Green Power", "description": "Couve, abacaxi, hortela, agua de coco", "price": 16.00, "image_url": "https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=400", "stock": -1, "tags": ["vegano", "leve"], "additionals": [], "order": 1, "active": True, "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "category_id": cats[3]["id"], "name": "Chia Pudding", "description": "Chia, leite de coco, frutas frescas, mel", "price": 22.00, "image_url": "https://images.unsplash.com/photo-1767429013015-8ea007ccf002?w=400", "stock": -1, "tags": ["vegano", "leve"], "additionals": [], "order": 0, "active": True, "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "category_id": cats[3]["id"], "name": "Banana Nice Cream", "description": "Banana congelada, cacau, pasta de amendoim, coco ralado", "price": 24.00, "image_url": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400", "stock": -1, "tags": ["vegano"], "additionals": [{"name": "Granola", "price": 3.0}], "order": 1, "active": True, "created_at": now, "updated_at": now},
    ]
    await db.products.insert_many(products)

    await db.delivery_settings.insert_one({
        "areas": [
            {"name": "Centro", "fee": 0}, {"name": "Jardim America", "fee": 5.0},
            {"name": "Vila Nova", "fee": 7.0}, {"name": "Bela Vista", "fee": 5.0},
            {"name": "Santa Cruz", "fee": 8.0}
        ],
        "delivery_fee": 5.0, "min_free_delivery": 60.0, "active": True
    })

    await db.pix_settings.insert_one({
        "pix_key": "", "pix_name": "Salada Soul", "qr_code_url": ""
    })

    await db.counters.insert_one({"name": "order_number", "value": 0})
    logger.info("Seed data created successfully")

# ==================== APP SETUP ====================
app.include_router(api_router)
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await seed_data()

@app.on_event("shutdown")
async def shutdown():
    client.close()

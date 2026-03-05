"""
Servidor simplificado para Railway - Salada Soul API
"""
import os
import sys
import logging
import asyncio
from datetime import datetime, timezone

# Configurar logging simples
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Verificar variáveis de ambiente
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    logger.error("DATABASE_URL não configurada! API funcionará com funcionalidade limitada.")
    # Não fazer sys.exit(1) - deixar o servidor iniciar para healthcheck

# For Supabase session pooler, we might need to adjust the connection
# Try to use direct connection if available, otherwise use session pooler
logger.info(f"Using DATABASE_URL from environment")

JWT_SECRET = os.environ.get('JWT_SECRET', 'default-secret-change-in-production')

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import asyncpg

app = FastAPI(
    title="Salada Soul API",
    version="1.0.0",
    docs_url=None,
    redoc_url=None
)

# CORS
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database pool
db_pool = None

async def get_db_pool():
    """Get or create database pool lazily"""
    global db_pool
    if db_pool is None:
        try:
            logger.info(f"Connecting to database...")
            
            # Use DATABASE_URL directly - let asyncpg handle DNS and SSL
            # Make sure to use port 6543 for Transaction Pooler in Supabase
            dsn = DATABASE_URL
            
            # Ensure sslmode=require is present
            if 'sslmode' not in dsn:
                dsn += "?sslmode=require"
            
            logger.info(f"Using DSN: {dsn.split('@')[0]}@****")
            
            db_pool = await asyncpg.create_pool(
                dsn, 
                ssl='require',
                min_size=1, 
                max_size=3,
                command_timeout=60,
                timeout=30
            )
            logger.info("Database pool created successfully")
        except Exception as e:
            logger.error(f"Failed to create database pool: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
    return db_pool

async def connect_db_background():
    """Connect to database in background - don't block server startup"""
    global db_pool
    # Wait a bit for server to be ready
    await asyncio.sleep(1)
    logger.info("Background database connection starting...")
    try:
        pool = await get_db_pool()
        logger.info("Database connected successfully!")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        logger.warning("API will work with limited functionality - retrying in 10s...")
        # Retry logic
        await asyncio.sleep(10)
        try:
            pool = await get_db_pool()
            logger.info("Database connected on retry!")
        except Exception as e2:
            logger.error(f"Database connection retry failed: {e2}")

@app.on_event("startup")
async def startup():
    global db_pool
    logger.info("Starting up Salada Soul API")
    logger.info(f"DATABASE_URL configured: {bool(DATABASE_URL)}")
    
    # Start database connection in background - don't block!
    logger.info("Scheduling background database connection...")
    asyncio.create_task(connect_db_background())
    logger.info("Server ready to accept requests (DB connecting in background)")

@app.on_event("shutdown")
async def shutdown():
    global db_pool
    if db_pool:
        await db_pool.close()
        logger.info("Database pool closed")

@app.get("/health")
async def health_check():
    """Health check endpoint - Railway usa isso"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0"
    }

@app.get("/health/db")
async def health_check_db():
    """Database health check"""
    try:
        if db_pool:
            async with db_pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            return {"status": "healthy", "database": "connected"}
        else:
            return {"status": "unhealthy", "database": "pool not ready"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}

# Importar rotas do servidor original
# Por enquanto, apenas endpoints básicos
@app.get("/api/products")
async def get_products():
    """Lista produtos"""
    if not db_pool:
        return []
    async with db_pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM products WHERE active = TRUE ORDER BY name")
        return [dict(r) for r in rows]

@app.get("/api/categories")
async def get_categories():
    """Lista categorias"""
    if not db_pool:
        return []
    async with db_pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM categories WHERE active = TRUE ORDER BY \"order\"")
        return [dict(r) for r in rows]

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

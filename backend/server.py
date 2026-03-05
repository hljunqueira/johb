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
    logger.error("DATABASE_URL não configurada!")
    sys.exit(1)

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

@app.on_event("startup")
async def startup():
    global db_pool
    logger.info("Starting up Salada Soul API")
    logger.info(f"DATABASE_URL configured: True")
    logger.info(f"DATABASE_URL starts with: {DATABASE_URL[:50]}...")
    
    # Retry connection up to 10 times with longer delays
    max_retries = 10
    for attempt in range(max_retries):
        try:
            # Parse DATABASE_URL to check if it's Supabase
            import urllib.parse
            parsed = urllib.parse.urlparse(DATABASE_URL)
            logger.info(f"Connecting to host: {parsed.hostname}, port: {parsed.port}, db: {parsed.path}")
            
            # For Supabase, we need to use sslmode=require in the DSN
            # Modify the DATABASE_URL to include sslmode
            if 'sslmode' not in DATABASE_URL:
                dsn = DATABASE_URL + "?sslmode=require"
            else:
                dsn = DATABASE_URL
            
            db_pool = await asyncpg.create_pool(
                dsn,
                min_size=1,
                max_size=10,
                command_timeout=60,
                server_settings={
                    'jit': 'off'
                }
            )
            logger.info("Database pool created successfully")
            return
        except Exception as e:
            logger.warning(f"Database connection attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(5)  # Wait longer between retries
            else:
                logger.error("Failed to create database pool after all retries")
                # Don't raise - let the app start without DB for healthcheck
                logger.warning("Starting without database connection")
                db_pool = None

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

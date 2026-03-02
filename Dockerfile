# Dockerfile na raiz para o Railway detectar automaticamente
# Este Dockerfile é apenas um wrapper que aponta para o backend

FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Railway provides PORT variable
CMD uvicorn server:app --host 0.0.0.0 --port ${PORT:-8001}

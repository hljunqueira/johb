FROM python:3.10-slim

WORKDIR /app

# Install system dependencies (needed for some python packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Railway fornece a variável PORT
# Não expor porta fixa, usar a variável de ambiente PORT
CMD uvicorn server:app --host 0.0.0.0 --port ${PORT:-8001}

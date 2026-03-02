# Dockerfile unificado para Backend + Frontend Cliente + Frontend Admin
# Usa Nginx como proxy reverso para servir tudo na mesma porta

FROM node:20-alpine AS build-client
WORKDIR /app
COPY frontend/package.json frontend/yarn.lock* frontend/package-lock.json* ./
RUN npm install --legacy-peer-deps
RUN npm install ajv@^8.0.0 --legacy-peer-deps
COPY frontend/ .
ENV REACT_APP_MODE=cliente
ENV REACT_APP_BACKEND_URL=http://localhost:8001
RUN npm run build
RUN mv build /client-build

FROM node:20-alpine AS build-admin
WORKDIR /app
COPY frontend/package.json frontend/yarn.lock* frontend/package-lock.json* ./
RUN npm install --legacy-peer-deps
RUN npm install ajv@^8.0.0 --legacy-peer-deps
COPY frontend/ .
ENV REACT_APP_MODE=admin
ENV REACT_APP_BACKEND_URL=http://localhost:8001
RUN npm run build
RUN mv build /admin-build

FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Copy frontend builds
COPY --from=build-client /client-build /var/www/client
COPY --from=build-admin /admin-build /var/www/admin

# Nginx configuration
RUN echo 'server { \
    listen 80; \
    \
    location / { \
        root /var/www/client; \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location /admin { \
        alias /var/www/admin; \
        try_files $uri $uri/ /admin/index.html; \
    } \
    \
    location /api/ { \
        proxy_pass http://localhost:8001; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
}' > /etc/nginx/sites-available/default

# Startup script
RUN echo '#!/bin/bash\n\
nginx\n\
uvicorn server:app --host 0.0.0.0 --port 8001 --workers 2\n' > /start.sh && chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]

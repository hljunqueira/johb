# Dockerfile unificado para Backend + Frontend Cliente + Frontend Admin
# Usa Nginx como proxy reverso para servir tudo na mesma porta

FROM node:20-alpine AS build-client
WORKDIR /app
COPY frontend/package.json frontend/yarn.lock* frontend/package-lock.json* ./
RUN npm install --legacy-peer-deps
RUN npm install ajv@^8.0.0 --legacy-peer-deps
COPY frontend/ .
ENV REACT_APP_MODE=cliente
# Empty string so axios uses relative path /api without prefix duplication
ENV REACT_APP_BACKEND_URL=
RUN npm run build
RUN mv build /client-build

FROM node:20-alpine AS build-admin
WORKDIR /app
COPY frontend/package.json frontend/yarn.lock* frontend/package-lock.json* ./
RUN npm install --legacy-peer-deps
RUN npm install ajv@^8.0.0 --legacy-peer-deps
COPY frontend/ .
ENV REACT_APP_MODE=admin
# Empty string so axios uses relative path /api without prefix duplication
ENV REACT_APP_BACKEND_URL=
# No PUBLIC_URL needed - admin served at root of saladasoul.shop
RUN npm run build
RUN mv build /admin-build

FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    nginx \
    supervisor \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Copy frontend builds
COPY --from=build-client /client-build /var/www/client
COPY --from=build-admin /admin-build /var/www/admin

# Create nginx config with domain-based routing
RUN mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
RUN printf '# Frontend Cliente - saladasoul.com\nserver {\n    listen 8080;\n    server_name saladasoul.com www.saladasoul.com;\n\n    location / {\n        root /var/www/client;\n        index index.html;\n        try_files $uri $uri/ /index.html;\n    }\n\n    location /api/ {\n        proxy_pass http://127.0.0.1:8001/;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n    }\n}\n\n# Frontend Admin - saladasoul.shop\nserver {\n    listen 8080;\n    server_name saladasoul.shop www.saladasoul.shop;\n\n    location / {\n        root /var/www/admin;\n        index index.html;\n        try_files $uri $uri/ /index.html;\n    }\n\n    location /api/ {\n        proxy_pass http://127.0.0.1:8001/;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n    }\n}\n\n# Default fallback - mostra o cliente\nserver {\n    listen 8080 default_server;\n    server_name _;\n\n    location / {\n        root /var/www/client;\n        index index.html;\n        try_files $uri $uri/ /index.html;\n    }\n\n    location /admin/ {\n        alias /var/www/admin/;\n        index index.html;\n        try_files $uri $uri/ /var/www/admin/index.html;\n    }\n\n    location = /admin {\n        return 301 /admin/;\n    }\n\n    location /api/ {\n        proxy_pass http://127.0.0.1:8001/;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n    }\n}\n' > /etc/nginx/sites-available/default && ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

# Remove default nginx config to avoid conflicts
RUN rm -f /etc/nginx/conf.d/default.conf

# Supervisor configuration to manage both processes
RUN printf '[supervisord]\nnodaemon=true\nuser=root\n\n[program:backend]\ncommand=uvicorn server:app --host 0.0.0.0 --port 8001 --workers 2\ndirectory=/app\nautostart=true\nautorestart=true\nstderr_logfile=/var/log/backend.err.log\nstdout_logfile=/var/log/backend.out.log\n\n[program:nginx]\ncommand=nginx -g "daemon off;"\nautostart=true\nautorestart=true\nstderr_logfile=/var/log/nginx.err.log\nstdout_logfile=/var/log/nginx.out.log\n' > /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8080

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

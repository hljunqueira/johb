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

# Nginx configuration - Railway provides PORT env var
# Using a startup script to handle dynamic port
RUN echo '#!/bin/bash\n\
PORT=${PORT:-8080}\n\
cat > /etc/nginx/sites-available/default << EOF\n\
server {\n\
    listen \$PORT;\n\
    \n\
    location / {\n\
        root /var/www/client;\n\
        try_files \$uri \$uri/ /index.html;\n\
    }\n\
    \n\
    location /admin {\n\
        alias /var/www/admin;\n\
        try_files \$uri \$uri/ /admin/index.html;\n\
    }\n\
    \n\
    location /api/ {\n\
        proxy_pass http://localhost:8001;\n\
        proxy_set_header Host \$host;\n\
        proxy_set_header X-Real-IP \$remote_addr;\n\
    }\n\
}\n\
EOF\n\
nginx -g "daemon off;"\n\
' > /start-nginx.sh && chmod +x /start-nginx.sh

# Supervisor configuration to manage both processes
RUN echo '[supervisord]\n\
nodaemon=true\n\
user=root\n\
\n\
[program:backend]\n\
command=uvicorn server:app --host 0.0.0.0 --port 8001 --workers 2\n\
directory=/app\n\
autostart=true\n\
autorestart=true\n\
stderr_logfile=/var/log/backend.err.log\n\
stdout_logfile=/var/log/backend.out.log\n\
\n\
[program:nginx]\n\
command=/start-nginx.sh\n\
autostart=true\n\
autorestart=true\n\
stderr_logfile=/var/log/nginx.err.log\n\
stdout_logfile=/var/log/nginx.out.log\n\
' > /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8080

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

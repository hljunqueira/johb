# Guia de Deploy - Salada Soul

## Arquitetura de Deploy

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Vercel        │     │   VPS (Backend)  │     │   PostgreSQL    │
│   (Frontend)    │◄────┤   + Docker       │◄────┤   (Database)    │
│                 │     │                  │     │                 │
│  saladasoul.    │     │  api.saladasoul  │     │  localhost:5432 │
│  vercel.app     │     │  .com.br:8000    │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │
         │              ┌────────┴────────┐
         │              │  Docker Compose │
         │              │  - Backend      │
         │              │  - Nginx        │
         │              │  - Redis        │
         │              └─────────────────┘
         │
    ┌────┴────┐
    │  CI/CD  │
    │ GitHub  │
    │ Actions │
    └─────────┘
```

## Pré-requisitos

### VPS (Ubuntu 22.04 LTS recomendado)
- **CPU**: 2+ cores
- **RAM**: 4GB+
- **Disco**: 50GB+ SSD
- **Portas**: 22 (SSH), 80 (HTTP), 443 (HTTPS), 8000 (API)

### Contas Necessárias
- [GitHub](https://github.com) - Repositório e CI/CD
- [Vercel](https://vercel.com) - Hospedagem frontend
- [Cloudflare](https://cloudflare.com) - DNS e SSL (opcional)

---

## 1. Configuração do VPS

### 1.1 Instalação Inicial

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências
sudo apt install -y \
    docker.io \
    docker-compose \
    nginx \
    certbot \
    python3-certbot-nginx \
    git \
    postgresql-client \
    htop \
    ufw

# Configurar Docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
newgrp docker

# Configurar firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### 1.2 Estrutura de Diretórios

```bash
# Criar estrutura
sudo mkdir -p /opt/saladasoul
sudo mkdir -p /opt/saladasoul/backups
sudo mkdir -p /opt/saladasoul/logs
sudo mkdir -p /var/log/saladasoul

# Permissões
sudo chown -R $USER:$USER /opt/saladasoul
sudo chown -R $USER:$USER /var/log/saladasoul
```

### 1.3 Configurar PostgreSQL

```bash
# Instalar PostgreSQL
sudo apt install -y postgresql-15 postgresql-contrib

# Iniciar serviço
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Criar usuário e banco
sudo -u postgres psql -c "CREATE USER salada WITH PASSWORD 'senha_segura_aqui';"
sudo -u postgres psql -c "CREATE DATABASE saladasoul OWNER salada;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE saladasoul TO salada;"

# Configurar acesso local
sudo nano /etc/postgresql/15/main/pg_hba.conf
# Adicionar:
# local   all   salada   md5
# host    all   salada   127.0.0.1/32   md5

sudo systemctl restart postgresql
```

---

## 2. Deploy do Backend

### 2.1 Clonar Repositório

```bash
cd /opt/saladasoul
git clone https://github.com/seu-usuario/saladasoul.git .
```

### 2.2 Configurar Variáveis de Ambiente

```bash
# Backend
cp backend/.env.example backend/.env
nano backend/.env
```

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=saladasoul
DB_USER=salada
DB_PASSWORD=senha_segura_aqui

# Security
JWT_SECRET=chave_jwt_super_segura_minimo_32_caracteres
ENVIRONMENT=production

# CORS
FRONTEND_URL=https://saladasoul.vercel.app
ADDITIONAL_CORS_ORIGINS=https://admin.saladasoul.com.br

# Rate Limiting
REDIS_URL=redis://localhost:6379/0

# Uploads
MAX_UPLOAD_SIZE=5242880
```

### 2.3 Configurar Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    container_name: saladasoul-backend
    restart: unless-stopped
    env_file: ./backend/.env
    ports:
      - "8000:8000"
    volumes:
      - ./backend/uploads:/app/uploads
      - ./logs:/app/logs
    depends_on:
      - redis
    networks:
      - saladasoul-network

  redis:
    image: redis:7-alpine
    container_name: saladasoul-redis
    restart: unless-stopped
    volumes:
      - redis-data:/data
    networks:
      - saladasoul-network

  nginx:
    image: nginx:alpine
    container_name: saladasoul-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./backend/uploads:/var/www/uploads:ro
    depends_on:
      - backend
    networks:
      - saladasoul-network

volumes:
  redis-data:

networks:
  saladasoul-network:
    driver: bridge
```

### 2.4 Iniciar Serviços

```bash
# Build e start
docker-compose up -d --build

# Verificar logs
docker-compose logs -f backend

# Health check
curl http://localhost:8000/health
```

---

## 3. Configurar Nginx + SSL

### 3.1 Configuração Nginx

```nginx
# /opt/saladasoul/nginx/nginx.conf
server {
    listen 80;
    server_name api.saladasoul.com.br;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name api.saladasoul.com.br;
    
    ssl_certificate /etc/letsencrypt/live/api.saladasoul.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.saladasoul.com.br/privkey.pem;
    
    # SSL config
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # Proxy to backend
    location / {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Static files
    location /uploads/ {
        alias /var/www/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 3.2 Obter Certificado SSL

```bash
# Instalar certificado
sudo certbot --nginx -d api.saladasoul.com.br

# Auto-renewal
sudo systemctl enable certbot.timer
```

---

## 4. Deploy do Frontend (Vercel)

### 4.1 Configurar Projeto

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel --prod
```

### 4.2 Variáveis de Ambiente (Vercel Dashboard)

```
REACT_APP_BACKEND_URL=https://api.saladasoul.com.br
REACT_APP_ENVIRONMENT=production
```

### 4.3 Configuração vercel.json

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    }
  ],
  "routes": [
    {
      "src": "/static/(.*)",
      "headers": {
        "cache-control": "public, max-age=31536000, immutable"
      }
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

---

## 5. Configurar CI/CD

### 5.1 Secrets do GitHub

Configurar em: Settings > Secrets and variables > Actions

```
# VPS
STAGING_HOST=staging.saladasoul.com.br
STAGING_USER=deploy
STAGING_SSH_KEY=<private-key>

PROD_HOST=api.saladasoul.com.br
PROD_USER=deploy
PROD_SSH_KEY=<private-key>

# Vercel
VERCEL_TOKEN=<token>
VERCEL_ORG_ID=<org-id>
VERCEL_PROJECT_ID=<project-id>

# Notificações
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

### 5.2 Deploy Automático

O pipeline já está configurado em `.github/workflows/ci-cd.yml`:

- **Push em `develop`**: Deploy automático para staging
- **Push em `main`**: Deploy automático para produção
- **Pull Requests**: Executa lint e testes

---

## 6. Configurar Monitoramento

### 6.1 Instalar Monitor

```bash
# Configurar cron
crontab scripts/crontab.example

# Ou usar systemd
cp scripts/saladasoul-monitor.service /etc/systemd/system/
sudo systemctl enable saladasoul-monitor
sudo systemctl start saladasoul-monitor
```

### 6.2 Configurar Alertas

```bash
# Adicionar ao .env
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...
CHECK_INTERVAL=60
ALERT_THRESHOLD=3
```

---

## 7. Checklist Pós-Deploy

### Verificações Obrigatórias

- [ ] API respondendo em `https://api.saladasoul.com.br/health`
- [ ] Frontend acessível em `https://saladasoul.vercel.app`
- [ ] SSL válido (testar em https://www.ssllabs.com/ssltest/)
- [ ] CORS configurado corretamente
- [ ] Rate limiting funcionando
- [ ] Uploads funcionando
- [ ] Banco de dados conectado
- [ ] Backups configurados
- [ ] Monitoramento ativo
- [ ] Logs sendo gerados

### Testes de Funcionalidade

```bash
# Testar fluxo completo
curl -X POST https://api.saladasoul.com.br/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Teste",
    "customer_phone": "11999999999",
    "delivery_type": "retirada",
    "items": [{
      "product_id": "test-id",
      "product_name": "Produto Teste",
      "quantity": 1,
      "price": 29.90
    }]
  }'
```

---

## 8. Troubleshooting

### Problemas Comuns

#### Backend não inicia
```bash
# Verificar logs
docker-compose logs backend

# Verificar variáveis de ambiente
docker-compose exec backend env

# Testar conexão com banco
docker-compose exec backend python -c "import asyncpg; print('OK')"
```

#### Erro de CORS
```bash
# Verificar configuração
curl -H "Origin: https://saladasoul.vercel.app" \
     -I https://api.saladasoul.com.br/api/products
```

#### Certificado SSL expirado
```bash
# Renovar manualmente
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

---

## 9. Rollback

### Rollback de Deploy

```bash
# Identificar versão anterior
cd /opt/saladasoul
git log --oneline -10

# Reverter para versão anterior
git revert HEAD --no-edit

# Ou checkout em tag específica
git checkout v1.2.3

# Rebuild
docker-compose up -d --build
```

### Restaurar Backup

```bash
# Listar backups disponíveis
python3 scripts/backup_auto.py --list

# Restaurar banco
python3 scripts/backup_database.py restore \
  --file /opt/saladasoul/backups/saladasoul_db_20240115_020000.sql.gz
```

---

## 10. Manutenção

### Tarefas Diárias
- Verificar logs de erro
- Monitorar métricas de uso

### Tarefas Semanais
- Revisar backups
- Atualizar dependências de segurança

### Tarefas Mensais
- Limpar logs antigos
- Revisar custos de infraestrutura
- Testar restore de backup

---

## Contatos de Emergência

- **DevOps**: devops@saladasoul.com.br
- **Infraestrutura**: infra@saladasoul.com.br
- **VPS Provider**: [Contato do provedor]

---

**Última atualização**: 2024
**Versão**: 1.0

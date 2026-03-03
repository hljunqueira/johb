# Guia de Configuração - API Salada Soul

## Arquitetura Final

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Vercel        │     │   Vercel        │     │   Railway       │
│  ┌───────────┐  │     │  ┌───────────┐  │     │  ┌───────────┐  │
│  │  Cliente  │  │     │  │   Admin   │  │     │ │   API     │  │
│  │saladasoul │  │     │  │saladasoul │  │     │ │  Python   │  │
│  │  .com     │  │     │  │  .shop    │  │     │ │ FastAPI   │  │
│  └─────┬─────┘  │     │  └─────┬─────┘  │     │ │:8000      │  │
│        │        │     │        │        │     │  └─────┬─────┘  │
│        └────────┼─────┴────────┘        │     │        │        │
│                 │                       │     │  api.saladasoul │
│                 ▼                       │     │     .com        │
│        https://api.saladasoul.com       │     └─────────────────┘
└─────────────────────────────────────────┘
```

---

## PASSO 1: Configurar Domínio no Railway

### 1.1 Acesse o Dashboard do Railway
1. Vá para https://railway.app/dashboard
2. Selecione o projeto **"Salada Soul"**
3. Clique no serviço (ex: "saladasoul-production")

### 1.2 Adicionar Domínio Customizado
1. Clique na aba **"Settings"**
2. Role até **"Public Networking"**
3. Clique em **"+ Custom Domain"**
4. Digite: `api.saladasoul.com`
5. Clique em **"Add Domain"**

### 1.3 Copiar o Target do Railway
Após adicionar, o Railway mostrará um valor como:
```
Target: bzq0a8po.up.railway.app
```

**Anote esse valor!** Vamos usá-lo no DNS.

---

## PASSO 2: Configurar DNS

### 2.1 Acesse o Painel de DNS do seu Domínio
1. Vá para o painel onde gerencia o `saladasoul.com`
2. Selecione o domínio `saladasoul.com`
3. Vá em **"DNS / Nameservers"**

### 2.2 Criar Registro para Subdomínio
Adicione um novo registro:

| Campo | Valor |
|-------|-------|
| **Tipo** | CNAME |
| **Nome** | api |
| **Conteúdo** | `bzq0a8po.up.railway.app` (o valor do Railway) |
| **TTL** | 300 |

> **Nota:** Se o provedor não permitir CNAME no subdomínio, use ALIAS ou A record com o IP fornecido pelo Railway.

### 2.3 Salvar e Aguardar
- Salve as alterações
- Aguarde a propagação DNS (5-30 minutos com TTL 300)

---

## PASSO 3: Verificar Configuração

### 3.1 Teste o Domínio
```bash
nslookup api.saladasoul.com
```

Deve retornar algo como:
```
Name:    api.saladasoul.com
Address: 151.xxx.xxx.xxx  (ou o IP do Railway)
```

### 3.2 Teste a API
```bash
curl https://api.saladasoul.com/health
```

Deve retornar:
```json
{"status":"healthy","database":"healthy"}
```

---

## PASSO 4: Configurar CORS no Backend

### 4.1 Atualizar Variável de Ambiente no Railway
1. No Railway, vá em **"Variables"**
2. Adicione/Atualize:

```
CORS_ORIGINS=https://saladasoul.com,https://www.saladasoul.com,https://saladasoul.shop,https://www.saladasoul.shop,https://saladasoul-cliente.vercel.app,https://saladasoul-admin.vercel.app
```

### 4.2 Deploy do Backend
O Railway fará deploy automaticamente após o push.

---

## PASSO 5: Deploy dos Frontends no Vercel

### 5.1 Deploy do Cliente
```bash
cd frontend
copy vercel.client.json vercel.json
vercel --prod
```

Quando perguntar sobre o domínio, configure: `saladasoul.com`

### 5.2 Deploy do Admin
```bash
cd frontend
copy vercel.admin.json vercel.json
vercel --prod
```

Quando perguntar sobre o domínio, configure: `saladasoul.shop`

---

## PASSO 6: Configurar Domínios no Vercel

### 6.1 Cliente (saladasoul.com)
1. No dashboard do Vercel, selecione o projeto do cliente
2. Vá em **"Settings"** → **"Domains"**
3. Adicione: `saladasoul.com`
4. Siga as instruções de DNS (geralmente CNAME para `cname.vercel-dns.com`)

### 6.2 Admin (saladasoul.shop)
1. No dashboard do Vercel, selecione o projeto do admin
2. Vá em **"Settings"** → **"Domains"**
3. Adicione: `saladasoul.shop`
4. Siga as instruções de DNS

---

## CHECKLIST FINAL

| Componente | URL | Status |
|------------|-----|--------|
| API | https://api.saladasoul.com | ⬜ |
| Cliente | https://saladasoul.com | ⬜ |
| Admin | https://saladasoul.shop | ⬜ |
| Health Check | https://api.saladasoul.com/health | ⬜ |
| Login | https://saladasoul.shop/admin/login | ⬜ |

---

## SOLUÇÃO DE PROBLEMAS

### Erro: "Domain already in use"
- Verifique se o domínio não está em outro projeto
- Remova do projeto antigo antes de adicionar no novo

### Erro: "DNS not resolving"
- Aguarde mais tempo (pode levar até 24h em alguns casos)
- Verifique se o TTL está baixo (300 ou menos)
- Use `dig` ou `nslookup` para diagnosticar

### Erro: "CORS error"
- Verifique se `CORS_ORIGINS` inclui todos os domínios
- Reinicie o backend após alterar variáveis

### Erro: "502 Bad Gateway"
- Backend não está rodando
- Verifique logs no Railway
- Confirme que a porta está correta (8000)

---

## COMANDOS ÚTEIS

### Verificar DNS
```bash
nslookup api.saladasoul.com
dig api.saladasoul.com
```

### Verificar SSL
```bash
curl -v https://api.saladasoul.com/health
```

### Verificar CORS
```bash
curl -H "Origin: https://saladasoul.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://api.saladasoul.com/api/auth/login
```

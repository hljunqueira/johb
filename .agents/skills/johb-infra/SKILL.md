---
name: johb-infra
description: Gerenciamento, deploy e diagnóstico da infraestrutura da VPS (23.80.89.116) do JOHB Café & Salgados, incluindo backend Docker (johb-api), Caddy reverse proxy, Asaas e PostgreSQL.
---

# 🛠️ JOHB — Skill de Infraestrutura & Deploy na VPS

Este guia operacional documenta a topologia de servidores, portas, containers Docker, rotas de proxy reverso e os procedimentos automatizados de deploy para o **JOHB Café & Salgados**.

---

## 🌐 1. Topologia da VPS & Domínios

| Recurso | Detalhe / Valor |
|---|---|
| **Host IP da VPS** | `23.80.89.116` |
| **Acesso SSH** | `ssh root@23.80.89.116` com chave Ed25519 (`~/.ssh/id_ed25519`) |
| **Diretório do Backend na VPS** | `/srv/johb` |
| **Domínio Público da API** | `https://johb-api.hljdev.com.br` |
| **Porta Interna Docker** | `127.0.0.1:8060` -> Container `8000` |
| **Reverse Proxy / SSL** | Caddy Server (`/etc/caddy/Caddyfile`) com certificados automáticos Let's Encrypt |

---

## 🐳 2. Containers Docker

No diretório `/srv/johb/docker-compose.yml`:
* **`johb-api`**: Container Python/FastAPI (`uvicorn server:app --host 0.0.0.0 --port 8000`).
  * Volume montado: `/srv/johb/backend:/app` (permite hot-reload e deploy sem downtime longo).
  * Arquivo de variáveis: `/srv/johb/env/backend.env`.
* **`johb-redis`**: Cache Redis (`redis:alpine`) na rede interna `johb-network`.

---

## 🚀 3. Como Fazer Deploy do Backend

### Método 1: Script Automatizado (Recomendado)
Basta executar na raiz do projeto local:
```powershell
py -u scripts/deploy_backend.py
```
O script executa automaticamente:
1. Conexão SSH segura via Paramiko (`~/.ssh/id_ed25519`).
2. Criação de snapshot de backup do `server.py` anterior na VPS (`server.py.bak_YYYYMMDD_HHMMSS`).
3. Upload SFTP do novo `backend/server.py` e dependências.
4. Reinicialização do container `johb-api`.
5. Validação dos logs e teste de saúde da API.

> [!IMPORTANT]
> **Preservação de Dados:** O script de deploy nunca executa arquivos de `seed` ou limpezas no banco de dados. Os produtos, pedidos, clientes e cupons cadastrados em produção permanecem 100% intactos.

---

## 🔍 4. Comandos de Diagnóstico & Monitoramento

Para verificar a saúde do servidor e da API diretamente na VPS:

```bash
# Ver status do container johb-api
docker ps --filter "name=johb-api"

# Ver logs em tempo real do backend
docker logs -f --tail 100 johb-api

# Reiniciar o serviço do backend
docker restart johb-api

# Testar endpoint localmente na VPS
curl -s http://127.0.0.1:8060/api/reviews/summary

# Ver status do Caddy (Proxy Reverso)
systemctl status caddy
```

---

## 🔒 5. Configuração do Proxy Reverso (Caddy)

No arquivo `/etc/caddy/Caddyfile`:
```caddy
johb-api.hljdev.com.br, api.hljdev.com.br {
	encode gzip zstd
	reverse_proxy localhost:8060 {
		header_up Host {host}
		header_up X-Real-IP {remote_host}
	}
}
```
Para recarregar o Caddy após qualquer alteração:
```bash
systemctl reload caddy
```

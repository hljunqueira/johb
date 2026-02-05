# Salada Soul - PRD (Product Requirements Document)

## Problem Statement
Plataforma de Pedidos Online para o restaurante Salada Soul, com foco em simplicidade, velocidade e identidade de marca (alimentacao saudavel, leveza, bem-estar).

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI (port 3000)
- **Backend**: FastAPI (port 8001, routes prefixed with /api)
- **Database**: MongoDB
- **Auth**: JWT + Google OAuth (Emergent-managed)
- **File Storage**: Local uploads served via /api/uploads

## User Personas
1. **Cliente**: Acessa cardapio via QR/link, faz pedidos, acompanha status
2. **Admin**: Gerencia pedidos, produtos, clientes, relatorios
3. **Atendente**: Visualiza e atualiza status de pedidos

## Core Requirements
- Cardapio publico com categorias, tags, busca
- Carrinho com ajuste de quantidade e observacoes
- Checkout em etapa unica (retirada/entrega)
- Pagamento Pix (modal com chave copiavel)
- Rastreamento de pedidos em tempo real
- Historico e repeticao de pedidos por telefone
- Admin: gestao de pedidos com status (aguardando/preparando/entregue)
- Admin: CRUD de produtos com upload de imagem, estoque, tags, clone
- Admin: gestao de clientes com tags automaticas (novo/frequente/VIP)
- Admin: relatorios com graficos (vendas, ticket medio, pico, CSV export)
- Admin: config de entregas por bairro e Pix

## What's Been Implemented (2026-02-05)
- [x] Backend completo com todas as rotas (public, orders, auth, admin)
- [x] Seed data (4 categorias, 9 produtos, admin padrao, areas de entrega)
- [x] Frontend: Menu com layout 3 colunas (categorias, produtos, carrinho)
- [x] Frontend: Checkout com selecao entrega/retirada + modal Pix
- [x] Frontend: Confirmacao de pedido com status em tempo real
- [x] Frontend: Historico de pedidos com repeticao
- [x] Frontend: Login admin (JWT + Google OAuth)
- [x] Frontend: Dashboard de pedidos admin com filtros e destaque de atrasados
- [x] Frontend: Gestao de produtos com CRUD, toggle, clone
- [x] Frontend: Gestao de clientes com tags e notas
- [x] Frontend: Relatorios com graficos (Recharts) e export CSV
- [x] Frontend: Config de entrega e Pix
- [x] Modo escuro (kitchen mode) no admin
- [x] Mobile responsive
- [x] 100% dos testes passando (backend + frontend + integracao)

## Prioritized Backlog
### P0 (Done)
- Fluxo completo cliente: cardapio -> carrinho -> checkout -> confirmacao
- Fluxo admin: login -> pedidos -> produtos -> clientes -> relatorios

### P1 (Next)
- Adicionar numero WhatsApp da loja (usuario vai fornecer)
- Adicionar chave Pix real (usuario vai fornecer QR Code)
- Observacao por item no carrinho (UI)
- Salvar pedido favorito

### P2
- Agendamento de entrega
- Programa de fidelidade simples
- Cupons manuais
- Avaliacao media visivel no cardapio
- Auditoria de acoes admin
- Perfis de acesso (admin vs atendente)
- Backup automatico

## Next Tasks
1. Configurar numero WhatsApp real
2. Configurar chave Pix e QR Code
3. Adicionar campo de observacao por item na UI do carrinho
4. Implementar pedido favorito
5. Adicionar drag-and-drop para reordenar produtos

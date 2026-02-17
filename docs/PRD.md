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

## Real Menu Structure (2026-02-06)

### 1. Monte sua Salada (Base R$ 28,50)
Produto personalizavel com 35 complementos organizados por categoria:
- **Base de Folhas**: Mix de folhas (R$ 5), Alface americana (R$ 3), Rucula (R$ 3), Repolho roxo (R$ 3)
- **Proteina**: Frango (R$ 9), Atum (R$ 8,50), Carne moida patinho (R$ 9), Carne em cubos (R$ 9)
- **Legumes & Verduras**: Cenoura (R$ 3), Tomate (R$ 2,50), Tomate cereja (R$ 3,50), Pepino (R$ 3), Beterraba (R$ 3,50), Cebola roxa (R$ 2,50), Salsa (R$ 2), Milho (R$ 3), Brocolis (R$ 3,50)
- **Frutas**: Manga (R$ 3,50), Maca (R$ 3), Morango (R$ 4)
- **Extras & Crocancia**: Batata palha (R$ 3,50), Croutons (R$ 4,50), Queijo parmesao (R$ 3), Castanha do Para (R$ 8), Amendoas laminadas (R$ 6), Castanha de caju (R$ 7), Queijo (R$ 4)
- **Molhos & Cremes**: Creme de abacate (R$ 5), Molho verde (R$ 5), Molho especial tipo MC (R$ 5), Mostarda e mel (R$ 5), Molho da casa (R$ 5)
- **Temperos**: Azeite (R$ 2), Sal (Gratis), Oregano (R$ 1)

### 2. Saladas Prontas (nao podem ser alteradas)
- Salada Harmonia (R$ 35,50): Mix de folhas, Frango, Cenoura + Milho + Tomate, Manga, Queijo
- Salada Aura Verde (R$ 35,50): Mix de folhas, Frango, Tomate cereja + Pepino + Beterraba, Maca, Croutons, Molho da casa
- Salada Essencia (R$ 35,90): Mix de folhas, Atum, Cenoura + Cebola roxa + Milho, Maca, Croutons, Molho especial
- Salada Zen (R$ 37,50): Mix de folhas, Patinho moido, Cenoura + Brocolis + Beterraba, Morango, Batata palha, Mostarda e mel
- Salada Prana (R$ 38,50): Mix de folhas, Carne em cubos, Tomate cereja + Cenoura + Brocolis, Manga, Castanha de caju, Mostarda e mel

### 3. Lanches Frios
- Sanduiche Alma Verde (R$ 26,90): Pao integral, Pate artesanal de frango 70g, Cenoura, Alface
- Sanduiche Brisa do Mar (R$ 25,90): Pao integral, Pate artesanal de atum 40g, sem oleo, Cenoura, Alface

### 4. Bebidas
- Guarana Antarctica Zero 269ml (R$ 5,90)
- Coca-Cola Zero 250ml (R$ 5,90)
- Suco de Laranja 500ml (R$ 7,50)
- Agua com Gas 500ml (R$ 5,00)
- Agua Mineral sem Gas 500ml (R$ 5,00)

## What's Been Implemented

### Phase 1 (2026-02-05) - MVP
- [x] Backend completo com todas as rotas (public, orders, auth, admin)
- [x] Seed data inicial
- [x] Frontend: Menu com layout 3 colunas (categorias, produtos, carrinho)
- [x] Frontend: Checkout com selecao entrega/retirada + modal Pix
- [x] Frontend: Confirmacao de pedido com status em tempo real
- [x] Frontend: Historico de pedidos com repeticao
- [x] Frontend: Login admin (JWT + Google OAuth)
- [x] Frontend: Dashboard de pedidos admin com filtros
- [x] Frontend: Gestao de produtos com CRUD, toggle, clone
- [x] Frontend: Gestao de clientes com tags e notas
- [x] Frontend: Relatorios com graficos (Recharts) e export CSV
- [x] Frontend: Config de entrega e Pix
- [x] Mobile responsive

### Phase 2 (2026-02-06) - Real Menu Data
- [x] Seed data com cardapio real do Salada Soul
- [x] Sistema de complementos agrupados por categoria
- [x] Modal de produto com selecao de adicionais organizados
- [x] Navegacao hierarquica: Categorias -> Produtos -> Complementos
- [x] Icones e labels para categorias de complementos
- [x] 100% testes passando (23/23 backend + frontend)

## Prioritized Backlog

### P0 (Done)
- [x] Fluxo completo cliente: cardapio -> carrinho -> checkout -> confirmacao
- [x] Fluxo admin: login -> pedidos -> produtos -> clientes -> relatorios
- [x] Dados reais do cardapio

### P1 (Next)
- [ ] Modal com QR Code (aguardando usuario enviar QR)
- [ ] Configurar numero WhatsApp da loja
- [ ] Configurar chave Pix real
- [ ] Observacao por item no carrinho (UI)
- [ ] Salvar pedido favorito

### P2 (Future)
- [ ] Agendamento de entrega
- [ ] Programa de fidelidade simples
- [ ] Cupons manuais
- [ ] Avaliacao media visivel no cardapio
- [ ] Auditoria de acoes admin
- [ ] Perfis de acesso (admin vs atendente)
- [ ] Backup automatico

## Key API Endpoints

### Public
- `GET /api/categories` - Lista categorias ativas
- `GET /api/products` - Lista produtos (filtro por category_id, search)
- `GET /api/products/{id}` - Produto com complementos resolvidos
- `GET /api/complements` - Lista todos complementos
- `GET /api/menus` - Lista menus ativos
- `POST /api/orders` - Criar pedido
- `GET /api/orders/{id}` - Buscar pedido
- `GET /api/orders/phone/{phone}` - Historico por telefone

### Admin (requer JWT)
- `POST /api/auth/login` - Login admin
- `GET /api/admin/orders` - Lista pedidos
- `PUT /api/admin/orders/{id}/status` - Atualizar status
- `GET /api/admin/products` - Lista produtos
- `POST /api/admin/products` - Criar produto
- `PUT /api/admin/products/{id}` - Atualizar produto
- `DELETE /api/admin/products/{id}` - Excluir produto
- `GET /api/admin/categories` - Lista categorias
- `GET /api/admin/complements` - Lista complementos
- `GET /api/admin/customers` - Lista clientes
- `GET /api/admin/reports/sales` - Relatorio vendas

## Test Credentials
- **Admin Email**: admin@saladasoul.com
- **Admin Password**: admin123

## Test Reports
- `/app/test_reports/iteration_1.json` - Initial MVP testing
- `/app/test_reports/iteration_2.json` - Real menu data testing (100% pass)

## Key Files
- `backend/server.py` - FastAPI server (800+ lines)
- `frontend/src/pages/MenuPage.js` - Public menu page
- `frontend/src/pages/CheckoutPage.js` - Checkout flow
- `frontend/src/context/CartContext.js` - Cart state
- `frontend/src/pages/admin/` - Admin panel pages

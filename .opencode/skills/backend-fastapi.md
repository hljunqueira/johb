# Salada Soul - Backend FastAPI Development

## Project Structure
- **Backend**: FastAPI (Python) running on port 8001
- **Database**: MongoDB
- **Location**: `backend/`

## Key Files
- `backend/server.py` - Main FastAPI server (800+ lines)
- `backend/requirements.txt` - Python dependencies
- `backend/migrations/` - Database migrations (SQL files)

## API Routes Structure
All routes prefixed with `/api`:

### Public Routes
- `GET /api/categories` - List active categories
- `GET /api/products` - List products (filter by category_id, search)
- `GET /api/products/{id}` - Product with resolved complements
- `GET /api/complements` - List all complements
- `GET /api/menus` - List active menus
- `POST /api/orders` - Create order
- `GET /api/orders/{id}` - Get order
- `GET /api/orders/phone/{phone}` - Order history by phone

### Admin Routes (require JWT)
- `POST /api/auth/login` - Admin login
- `GET /api/admin/orders` - List orders
- `PUT /api/admin/orders/{id}/status` - Update order status
- `GET /api/admin/products` - List products
- `POST /api/admin/products` - Create product
- `PUT /api/admin/products/{id}` - Update product
- `DELETE /api/admin/products/{id}` - Delete product
- `GET /api/admin/customers` - List customers
- `GET /api/admin/reports/sales` - Sales report

## Common Commands
```bash
cd backend
# Install dependencies
pip install -r requirements.txt

# Run server
python server.py

# Run tests
python -m pytest

# Reset admin password
python reset_admin.py
```

## Test Credentials
- **Admin Email**: admin@saladasoul.com
- **Admin Password**: admin123

## Menu Structure (Real Data)
- **Monte sua Salada** (Base R$ 28,50) - Customizable with 35 complements
- **Saladas Prontas** - Fixed recipes (Harmonia, Aura Verde, Essencia, Zen, Prana)
- **Lanches Frios** - Sandwiches (Alma Verde, Brisa do Mar)
- **Bebidas** - Drinks (Guarana, Coca-Cola, Sucos, Agua)

## Database Migrations
Located in `backend/migrations/`:
- `001_restructure_menu_hierarchy.sql`
- `002_create_customers_table.sql`
- `003_add_icons_and_required_complements.sql`
- `004_create_complement_categories.sql`
- `005_add_required_to_categories.sql`
- `006_ensure_complement_categories_columns.sql`
- `007_add_business_hours_to_delivery_settings.sql`
- `008_add_delivery_settings_columns.sql`
- `009_add_pix_settings_columns.sql`
- `010_add_distance_config.sql`
- `011_add_store_status_flags.sql`

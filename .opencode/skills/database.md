# Salada Soul - Database & Data Management

## Database
- **Type**: MongoDB
- **Schema**: `supabase_schema.sql` (reference)
- **Migrations**: `backend/migrations/*.sql`

## Key Collections
- `categories` - Product categories
- `products` - Menu items
- `complements` - Customization options (Monte sua Salada)
- `complement_categories` - Grouping for complements
- `orders` - Customer orders
- `customers` - Customer profiles
- `settings` - Store configuration (delivery, PIX, hours)
- `admins` - Admin users

## Maintenance Scripts
```bash
# Seed menu data
python scripts/seed_real_menu.py

# Seed cardapio
python scripts/seed_monte_sua_salada.py

# Apply migrations
python scripts/apply_migration.py

# Reset admin password
python backend/reset_admin.py

# Check table structure
python backend/check_table.py

# Backup database
python scripts/backup_database.py

# Auto backup
python scripts/backup_auto.py
```

## Database Backup
- Location: `scripts/` for backup scripts
- Cron example: `scripts/crontab.example`

## Seed Data
- `scripts/seed_real_menu.py` - Real menu items
- `scripts/seed_monte_sua_salada.py` - "Monte sua Salada" complements
- `scripts/seed_supabase.sql` - Initial data

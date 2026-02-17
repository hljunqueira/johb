#!/bin/bash

# ============================================
# SALADA SOUL - Deploy Script for VPS
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="saladasoul"
PROJECT_DIR="/opt/$PROJECT_NAME"
REPO_URL=""  # Add your git repo URL here
BRANCH="main"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root or with sudo"
    exit 1
fi

# ============================================
# STEP 1: Install Dependencies
# ============================================
log_info "Installing dependencies..."

# Update system
apt-get update

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    log_info "Installing Docker..."
    apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io
    log_success "Docker installed"
else
    log_info "Docker already installed"
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    log_info "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    log_success "Docker Compose installed"
else
    log_info "Docker Compose already installed"
fi

# ============================================
# STEP 2: Setup Project Directory
# ============================================
log_info "Setting up project directory..."

mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# ============================================
# STEP 3: Create Environment File
# ============================================
log_info "Creating environment file..."

if [ ! -f .env ]; then
    cat > .env << EOF
# Database
POSTGRES_PASSWORD=$(openssl rand -base64 32)

# JWT Secret (change this!)
JWT_SECRET=$(openssl rand -base64 32)

# CORS Origins (adjust for your domain)
CORS_ORIGINS=http://localhost:3000,https://your-domain.com
EOF
    log_success "Environment file created"
    log_warning "Please review and update the .env file with your actual values"
else
    log_info "Environment file already exists"
fi

# ============================================
# STEP 4: Create Docker Compose Override for Production
# ============================================
log_info "Creating production configuration..."

cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  backend:
    restart: always
    environment:
      - ENV=production
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  frontend:
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  db:
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
EOF

log_success "Production configuration created"

# ============================================
# STEP 5: Setup Backup Script
# ============================================
log_info "Creating backup script..."

mkdir -p /opt/backups

cat > /opt/backups/backup-saladasoul.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="saladasoul_db"
DB_NAME="saladasoul"
DB_USER="postgres"

# Create backup
docker exec $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME > $BACKUP_DIR/saladasoul_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/saladasoul_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "saladasoul_*.sql.gz" -mtime +7 -delete

echo "Backup completed: saladasoul_$DATE.sql.gz"
EOF

chmod +x /opt/backups/backup-saladasoul.sh

# Add cron job for daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/backups/backup-saladasoul.sh >> /var/log/saladasoul-backup.log 2>&1") | crontab -

log_success "Backup script created and scheduled (daily at 2 AM)"

# ============================================
# STEP 6: Build and Start Services
# ============================================
log_info "Building and starting services..."

docker-compose down 2>/dev/null || true
docker-compose build --no-cache
docker-compose up -d

# Wait for database to be ready
log_info "Waiting for database to be ready..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    log_success "Services are running!"
else
    log_error "Services failed to start. Check logs with: docker-compose logs"
    exit 1
fi

# ============================================
# STEP 7: Create Management Scripts
# ============================================
log_info "Creating management scripts..."

cat > /usr/local/bin/saladasoul-logs << 'EOF'
#!/bin/bash
cd /opt/saladasoul && docker-compose logs -f
EOF
chmod +x /usr/local/bin/saladasoul-logs

cat > /usr/local/bin/saladasoul-restart << 'EOF'
#!/bin/bash
cd /opt/saladasoul && docker-compose restart
EOF
chmod +x /usr/local/bin/saladasoul-restart

cat > /usr/local/bin/saladasoul-update << 'EOF'
#!/bin/bash
cd /opt/saladasoul
docker-compose pull
docker-compose build --no-cache
docker-compose up -d
EOF
chmod +x /usr/local/bin/saladasoul-update

cat > /usr/local/bin/saladasoul-backup << 'EOF'
#!/bin/bash
/opt/backups/backup-saladasoul.sh
EOF
chmod +x /usr/local/bin/saladasoul-backup

log_success "Management scripts created:"
echo "  - saladasoul-logs     : View logs"
echo "  - saladasoul-restart  : Restart services"
echo "  - saladasoul-update   : Update and rebuild"
echo "  - saladasoul-backup   : Manual backup"

# ============================================
# STEP 8: Display Information
# ============================================
echo ""
echo "==========================================="
echo -e "${GREEN}DEPLOYMENT COMPLETED!${NC}"
echo "==========================================="
echo ""
echo "Services running on:"
echo "  - Frontend: http://YOUR_SERVER_IP:3000"
echo "  - Backend API: http://YOUR_SERVER_IP:8001"
echo "  - Database: localhost:5432"
echo ""
echo "Admin credentials:"
echo "  - Email: admin@saladasoul.com"
echo "  - Password: admin123"
echo ""
echo "IMPORTANT: Change the admin password after first login!"
echo ""
echo "Useful commands:"
echo "  - View logs:    saladasoul-logs"
echo "  - Restart:      saladasoul-restart"
echo "  - Update:       saladasoul-update"
echo "  - Backup:       saladasoul-backup"
echo ""
echo "==========================================="

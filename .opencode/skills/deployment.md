# Salada Soul - Deployment Guide

## Project Architecture
- **Frontend**: Deployed to Vercel
- **Backend**: Deployed to Railway (or Docker)
- **Database**: MongoDB (Supabase hosted)

## Environment Files
- `.env` - Root environment (shared config)
- `frontend/.env` - Frontend environment
- `frontend/.env.local` - Local overrides
- `frontend/.env.production` - Production overrides
- `backend/.env` - Backend environment

## Deployment Commands

### Frontend (Vercel)
```bash
cd frontend
vercel --prod
# Or use deployment scripts:
./scripts/deploy-cliente.bat
```

### Backend (Railway)
```bash
# Check railway.toml for config
railway up

# Or use deployment scripts:
./scripts/deploy-admin.bat
```

### Docker
```bash
# Full stack with Docker Compose
docker-compose -f docker-compose.local.yml up

# Admin only
docker-compose -f docker-compose.admin.local.yml up

# Client only
docker-compose -f docker-compose.client.local.yml up
```

## Local Development
```bash
# Start all services locally
./start-local.bat

# Or use PowerShell
./start-dev.ps1
```

## Environment Variables Required
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `VITE_API_URL` - API URL for frontend
- `PIX_KEY` - PIX payment key (production)

## CI/CD
- GitHub Actions: `.github/workflows/ci-cd.yml`
- Automatic deployment on push to main branch

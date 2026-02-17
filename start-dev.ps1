# ============================================
# SALADA SOUL - Start Development Environment
# ============================================

Write-Host "========================================" -ForegroundColor Green
Write-Host "  SALADA SOUL - Ambiente de Desenvolvimento" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Verificar se estamos na pasta correta
if (-not (Test-Path "frontend")) {
    Write-Host "[ERRO] Execute este script na pasta raiz do projeto!" -ForegroundColor Red
    exit 1
}

# Criar arquivo .env.local para o frontend
Write-Host "[1/4] Configurando frontend..." -ForegroundColor Yellow
$frontendEnv = @"
REACT_APP_BACKEND_URL=http://localhost:8001
"@
$frontendEnv | Out-File -FilePath "frontend\.env.local" -Encoding UTF8

# Criar arquivo .env para o backend
Write-Host "[2/4] Configurando backend..." -ForegroundColor Yellow
$backendEnv = @"
DB_HOST=localhost
DB_PORT=5432
DB_NAME=saladasoul
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=dev-secret-key
CORS_ORIGINS=http://localhost:3000
"@
$backendEnv | Out-File -FilePath "backend\.env" -Encoding UTF8

# Iniciar backend em uma nova janela
Write-Host "[3/4] Iniciando backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\venv\Scripts\activate; uvicorn server:app --reload --port 8001"

# Aguardar backend iniciar
Start-Sleep -Seconds 3

# Iniciar frontend em uma nova janela
Write-Host "[4/4] Iniciando frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm install --legacy-peer-deps 2>$null; npm start"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ SERVIÇOS INICIADOS!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Acesse:" -ForegroundColor Cyan
Write-Host "   Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "   Backend:   http://localhost:8001/api/" -ForegroundColor White
Write-Host "   Docs API:  http://localhost:8001/docs" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANTE:" -ForegroundColor Yellow
Write-Host "   - O backend está usando a VPS como banco de dados" -ForegroundColor White
Write-Host "   - Certifique-se de que a VPS está acessível" -ForegroundColor White
Write-Host ""
Write-Host "🛑 Para parar, feche as janelas do PowerShell" -ForegroundColor Red
Write-Host ""

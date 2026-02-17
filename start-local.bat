@echo off
chcp 65001 >nul
echo ============================================
echo  SALADA SOUL - Iniciando Localmente
echo ============================================
echo.

REM Verificar se Docker está rodando
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Docker não está rodando!
    echo Por favor, inicie o Docker Desktop primeiro.
    pause
    exit /b 1
)

echo [1/3] Parando containers antigos...
docker-compose down 2>nul

echo [2/3] Build e iniciando serviços...
docker-compose up -d --build

echo [3/3] Aguardando banco de dados...
timeout /t 5 /nobreak >nul

echo.
echo ============================================
echo  ✅ SERVIÇOS INICIADOS!
echo ============================================
echo.
echo 🌐 Acesse:
echo    Frontend:  http://localhost:3000
echo    Backend:   http://localhost:8001/api/
echo    Database:  localhost:5432
echo.
echo 👤 Admin Login:
echo    Email: admin@saladasoul.com
echo    Senha: admin123
echo.
echo 📝 Comandos úteis:
echo    Ver logs:   docker-compose logs -f
echo    Parar:      docker-compose down
echo    Reiniciar:  docker-compose restart
echo.
pause

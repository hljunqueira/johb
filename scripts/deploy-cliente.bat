@echo off
echo Deploying Salada Soul - Cliente to Vercel...
cd "%~dp0\..\frontend"
copy vercel.client.json vercel.json /Y
vercel --prod

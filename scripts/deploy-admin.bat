@echo off
echo Deploying Salada Soul - Admin to Vercel...
cd "%~dp0\..\frontend"
copy vercel.admin.json vercel.json /Y
vercel --prod

@echo off
echo ================================
echo   SOFIN CMS - Strapi Admin
echo ================================
echo.
echo Starting CMS server...
echo Admin panel: http://localhost:1337/admin
echo.
cd /d "%~dp0"
npm run develop

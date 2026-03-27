@echo off
chcp 65001 > nul
echo ==========================================
echo   启动后端服务
echo ==========================================
echo.

cd /d %~dp0\server

echo 正在检查依赖...
if not exist "node_modules" (
    echo 安装后端依赖...
    call npm install
)

echo.
echo 启动后端服务 (端口: 3001)...
echo.
start "CRM Backend" cmd /k "node index.js"

echo 后端服务已启动！
echo API 地址: http://localhost:3001
echo.
pause

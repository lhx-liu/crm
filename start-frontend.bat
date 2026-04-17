@echo off
chcp 65001 > nul
echo ==========================================
echo   启动前端服务
echo ==========================================
echo.

cd /d %~dp0\client

echo 正在检查依赖...
if not exist "node_modules" (
    echo 安装前端依赖...
    call npm install
)

echo.
echo 启动前端服务 (端口: 3000)...
echo 请确保后端服务已在端口 3001 运行
echo.
start "CRM Frontend" cmd /k "npm run dev"

echo 前端服务已启动！
echo 访问地址: http://localhost:3000
echo.
pause

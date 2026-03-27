@echo off
chcp 65001 > nul
echo ==========================================
echo   CRM 系统 - 本地开发环境启动
echo ==========================================
echo.

cd /d %~dp0

echo [1/4] 安装后端依赖...
cd server
if not exist "node_modules" (
    call npm install
)
cd ..

echo.
echo [2/4] 安装前端依赖...
cd client
if not exist "node_modules" (
    call npm install
)
cd ..

echo.
echo [3/4] 启动后端服务 (端口: 3001)...
cd server
start "CRM Backend" cmd /k "node index.js"
cd ..

echo 等待后端启动...
timeout /t 3 /nobreak > nul

echo.
echo [4/4] 启动前端服务 (端口: 3000)...
cd client
start "CRM Frontend" cmd /k "npm start"
cd ..

echo.
echo ==========================================
echo   启动完成！
echo ==========================================
echo.
echo 前端地址: http://localhost:3000
echo 后端API: http://localhost:3001
echo.
echo 提示: 请在新打开的窗口中查看服务日志
echo.
pause

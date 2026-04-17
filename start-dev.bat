@echo off
chcp 65001 >nul
echo ==========================================
echo   CRM 系统 - 本地开发环境启动
echo ==========================================
echo.

cd /d %~dp0

REM 读取 .env 文件
if not exist ".env" (
    echo ❌ 找不到 .env 文件，请复制 .env.example 为 .env 并填写配置
    echo    copy .env.example .env
    pause
    exit /b 1
)

REM 从 .env 读取配置
for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
    if not "%%a"=="" if not "%%a:~0,1%"=="#" (
        set "%%a=%%b"
    )
)

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
start "CRM Backend" cmd /k "set MYSQL_HOST=%MYSQL_HOST%&& set MYSQL_PORT=%MYSQL_PORT%&& set MYSQL_USER=%MYSQL_USER%&& set MYSQL_PASSWORD=%MYSQL_PASSWORD%&& set MYSQL_DATABASE=%MYSQL_DATABASE%&& set JWT_SECRET=%JWT_SECRET%&& node index.js"
cd ..

echo 等待后端启动...
timeout /t 3 /nobreak > nul

echo.
echo [4/4] 启动前端服务 (端口: 3000)...
cd client
start "CRM Frontend" cmd /k "npm run dev"
cd ..

echo.
echo ==========================================
echo   启动完成！
echo ==========================================
echo.
echo 前端地址: http://localhost:3000
echo 后端API:  http://localhost:3001
echo 数据库:   %MYSQL_HOST%:%MYSQL_PORT%
echo.
echo 提示: 请在新打开的窗口中查看服务日志
echo.
pause

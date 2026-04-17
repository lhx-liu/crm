@echo off
chcp 65001 >nul
echo ==========================================
echo   启动后端服务 (连接远程开发MySQL)
echo ==========================================
echo.

cd /d %~dp0

REM 读取 .env 文件
if not exist ".env" (
    echo ❌ 找不到 .env 文件，请复制 .env.example 为 .env 并填写配置
    pause
    exit /b 1
)

REM 从 .env 读取配置
for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
    if not "%%a"=="" if not "%%a:~0,1%"=="#" (
        set "%%a=%%b"
    )
)

cd server

echo 正在检查依赖...
if not exist "node_modules" (
    echo 安装后端依赖...
    call npm install
)

echo.
echo 启动后端服务 (端口: 3001)...
echo 数据库: %MYSQL_HOST%:%MYSQL_PORT%
echo.

set MYSQL_HOST=%MYSQL_HOST%
set MYSQL_PORT=%MYSQL_PORT%
set MYSQL_USER=%MYSQL_USER%
set MYSQL_PASSWORD=%MYSQL_PASSWORD%
set MYSQL_DATABASE=%MYSQL_DATABASE%
set JWT_SECRET=%JWT_SECRET%

start "CRM Backend" cmd /k "node index.js"

echo 后端服务已启动！
echo API 地址: http://localhost:3001
echo.
pause

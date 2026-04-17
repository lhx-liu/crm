@echo off
chcp 65001 >nul
echo ========================================
echo    CRM 系统依赖安装脚本
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] 检查 Node.js 版本...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未检测到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)
node --version

echo.
echo [2/2] 安装依赖...
echo.
call npm install

if errorlevel 1 (
    echo.
    echo ❌ 依赖安装失败！
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ 安装完成！
echo ========================================
echo.
echo 启动开发服务器: npm run dev
echo 启动生产服务器: npm start
echo.
echo 注意：需要先启动 MySQL 数据库
echo Docker 方式: docker-compose up -d mysql
echo.
pause

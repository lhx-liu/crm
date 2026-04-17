# 本地开发环境安装指南

## 快速开始

### 前置条件

1. **Node.js** (推荐 v18 LTS 或更高版本)
2. **MySQL 8.0** (本地安装或使用 Docker)

### 方式一：自动安装（Windows）

```powershell
cd server
install.bat
```

### 方式二：手动安装

```powershell
cd server
npm install
```

### 启动 MySQL（Docker 方式）

```bash
# 启动 MySQL 容器
docker run -d --name crm-mysql \
  -e MYSQL_ROOT_PASSWORD=crm_root_password_2024 \
  -e MYSQL_DATABASE=crm_db \
  -e MYSQL_USER=crm_user \
  -e MYSQL_PASSWORD=crm_password_2024 \
  -p 3306:3306 \
  mysql:8.0 --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci --default-authentication-plugin=mysql_native_password
```

### 启动开发服务器

```powershell
cd server

# 设置环境变量（或使用默认值 localhost）
set MYSQL_HOST=localhost
set MYSQL_PORT=3306
set MYSQL_USER=crm_user
set MYSQL_PASSWORD=crm_password_2024
set MYSQL_DATABASE=crm_db

# 启动
npm run dev
```

---

## Docker 环境部署

### 部署命令

```bash
# 构建并启动（包含 MySQL + Backend + Frontend）
docker-compose up -d --build

# 查看日志
docker-compose logs -f backend

# 检查健康状态
curl http://localhost:3001/api/health
```

### Docker 环境特点

- ✅ 无需编译原生模块（mysql2 是纯 JS）
- ✅ 自动启动 MySQL 容器
- ✅ 数据库数据持久化存储
- ✅ 使用 Alpine Linux（轻量级）

---

## 系统要求

### 本地开发环境

1. **Node.js** (推荐 v18 LTS 或更高版本)
2. **MySQL 8.0** (本地安装或 Docker)

### Docker 环境

- Docker + Docker Compose
- 无需额外配置

---

## 常见问题

### 1. 连接 MySQL 失败

**解决方案**：
- 确认 MySQL 服务已启动
- 确认环境变量配置正确（MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE）
- 确认 MySQL 用户权限

### 2. Docker 中后端无法连接 MySQL

**解决方案**：
- 确认 `depends_on: mysql` 配置正确
- 确认 `MYSQL_HOST=mysql`（使用 Docker 内部网络的服务名）
- 等待 MySQL 完全启动（约 30 秒）

### 3. 字符编码问题

**解决方案**：
- 确认 MySQL 使用 utf8mb4 字符集
- 确认连接配置中 `charset: 'utf8mb4'`

---

## 数据库配置

系统使用环境变量配置数据库连接，默认值如下：

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| MYSQL_HOST | localhost | MySQL 主机地址 |
| MYSQL_PORT | 3306 | MySQL 端口 |
| MYSQL_USER | crm_user | 数据库用户名 |
| MYSQL_PASSWORD | crm_password_2024 | 数据库密码 |
| MYSQL_DATABASE | crm_db | 数据库名称 |

> 首次启动时会自动创建数据库和表，以及默认管理员账户（admin / admin123）

---

## 更新日志

- **2026-04-17**: 从 better-sqlite3 迁移到 MySQL，移除原生模块编译依赖
- **2026-04-16**: 创建自动安装脚本，解决 better-sqlite3 编译问题

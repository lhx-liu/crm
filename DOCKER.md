# CRM 系统 Docker 部署指南

## 项目结构

```
1.0crm/
├── client/              # 前端 React 应用
│   ├── Dockerfile       # 前端 Docker 配置（多阶段构建 + nginx）
│   └── nginx.conf       # Nginx 配置（HTTPS + 反向代理）
├── server/              # 后端 Node.js 应用
│   ├── Dockerfile       # 后端 Docker 配置（纯 JS，无需编译）
│   └── db/              # 数据库相关脚本
├── docker-compose.yml   # Docker Compose 配置（MySQL + Backend + Frontend）
└── .dockerignore        # Docker 忽略文件
```

## 架构说明

系统由三个 Docker 容器组成：

| 服务 | 镜像 | 端口 | 说明 |
|------|------|------|------|
| mysql | mysql:8.0 | 3306 | MySQL 数据库，数据持久化 |
| backend | node:18-alpine | 3001 | Node.js API 服务 |
| frontend | nginx:alpine | 80/443 | React 静态文件 + 反向代理 |

## 部署步骤

### 1. 构建并启动服务

```bash
# 构建并启动所有服务
docker-compose up -d --build

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 2. 访问应用

- 前端访问地址: https://crm.crmly.cc.cd （或 http://localhost）
- 后端 API 地址: http://localhost:3001
- 健康检查: http://localhost:3001/api/health

### 3. 停止服务

```bash
docker-compose down
# 注意：这不会删除 MySQL 数据卷
```

### 4. 数据持久化

MySQL 数据存储在 Docker 数据卷 `mysql-data` 中，即使容器删除数据也不会丢失。

查看数据卷位置：
```bash
docker volume inspect 1.0crm_mysql-data
```

### 5. 备份数据

```bash
# 使用 mysqldump 备份
docker exec crm-mysql mysqldump -ucrm_user -pcrm_password_2024 crm_db > backup.sql

# 恢复备份
docker exec -i crm-mysql mysql -ucrm_user -pcrm_password_2024 crm_db < backup.sql
```

### 6. 更新应用

```bash
# 停止服务
docker-compose down

# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build
```

### 7. 仅重启后端

```bash
# 仅重新构建后端
docker-compose up -d --build backend
```

## 环境变量

后端服务通过环境变量配置 MySQL 连接，在 `docker-compose.yml` 中设置：

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| MYSQL_HOST | mysql | MySQL 主机（Docker 内部网络使用服务名） |
| MYSQL_PORT | 3306 | MySQL 端口 |
| MYSQL_USER | crm_user | 数据库用户名 |
| MYSQL_PASSWORD | crm_password_2024 | 数据库密码 |
| MYSQL_DATABASE | crm_db | 数据库名称 |
| NODE_ENV | production | 运行环境 |

## 常见问题

### 1. 端口冲突

如果 80 或 3001 端口被占用，可以修改 `docker-compose.yml` 中的端口映射：

```yaml
services:
  frontend:
    ports:
      - "8080:80"  # 改为其他端口
  backend:
    ports:
      - "3002:3001"  # 改为其他端口
```

### 2. MySQL 启动慢

MySQL 首次启动需要初始化，可能需要 30-60 秒。后端会自动等待 MySQL 就绪。

如果后端启动失败，等待 MySQL 完全启动后重启后端：
```bash
docker-compose restart backend
```

### 3. 查看容器日志

```bash
# 查看所有日志
docker-compose logs

# 实时查看日志
docker-compose logs -f

# 只查看后端日志
docker-compose logs -f backend

# 只查看 MySQL 日志
docker-compose logs -f mysql
```

### 4. 连接 MySQL 调试

```bash
# 使用 mysql 客户端连接
docker exec -it crm-mysql mysql -ucrm_user -pcrm_password_2024 crm_db

# 查看表结构
docker exec -it crm-mysql mysql -ucrm_user -pcrm_password_2024 crm_db -e "SHOW TABLES;"
```

### 5. 完全重置（删除所有数据）

```bash
# 停止服务并删除数据卷
docker-compose down -v

# 重新构建
docker-compose up -d --build
```

## 生产环境建议

1. **修改默认密码**: 修改 `docker-compose.yml` 中的 MySQL 密码
2. **定期备份**: 系统已配置每天凌晨2点自动备份，也可手动执行 `mysqldump`
3. **监控日志**: 使用日志收集工具监控应用运行状态
4. **资源限制**: 在 docker-compose.yml 中设置资源限制

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
  mysql:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
```

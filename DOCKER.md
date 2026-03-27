# CRM 系统 Docker 部署指南

## 项目结构

```
Claw/
├── client/              # 前端 React 应用
│   ├── Dockerfile       # 前端 Docker 配置
│   └── nginx.conf       # Nginx 配置
├── server/              # 后端 Node.js 应用
│   ├── Dockerfile       # 后端 Docker 配置
│   └── db/              # SQLite 数据库
├── docker-compose.yml   # Docker Compose 配置
└── .dockerignore        # Docker 忽略文件
```

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

- 前端访问地址: http://localhost
- 后端 API 地址: http://localhost:3001

### 3. 停止服务

```bash
docker-compose down
```

### 4. 数据持久化

数据库文件存储在 Docker 数据卷 `crm-data` 中，即使容器删除数据也不会丢失。

查看数据卷位置：
```bash
docker volume inspect crm-data
```

### 5. 备份数据

```bash
# 备份数据库文件
docker cp crm-backend:/app/db/crm.db ./backup/

# 恢复数据库文件
docker cp ./backup/crm.db crm-backend:/app/db/
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

### 2. 数据库权限问题

如果遇到数据库写入权限问题，可以修改数据卷权限：

```bash
docker exec -it crm-backend sh
chmod 777 /app/db
```

### 3. 查看容器日志

```bash
# 查看所有日志
docker-compose logs

# 实时查看日志
docker-compose logs -f

# 只查看后端日志
docker-compose logs -f backend
```

## 生产环境建议

1. **使用 HTTPS**: 配置 SSL 证书，使用 nginx 反向代理
2. **定期备份**: 设置定时任务备份数据库
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
```

## 环境变量

可以在 `docker-compose.yml` 中添加环境变量：

```yaml
services:
  backend:
    environment:
      - NODE_ENV=production
      - PORT=3001
```

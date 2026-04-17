# 后端 Dockerfile
FROM node:18.18.0-alpine

WORKDIR /app

# 使用国内镜像源加速
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 使用淘宝镜像源加速 npm 安装
RUN npm config set registry https://registry.npmmirror.com

# 安装依赖（mysql2 是纯 JS，无需编译工具）
RUN npm ci --only=production

# 复制服务器代码
COPY . .

# 暴露端口
EXPOSE 3001

# 健康检查（使用 HTTP 请求）
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

# 启动服务器
CMD ["node", "index.js"]

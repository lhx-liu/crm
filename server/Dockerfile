# 后端 Dockerfile
FROM node:18.18.0-alpine

WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制服务器代码
COPY . .

# 创建数据库目录
RUN mkdir -p db

# 暴露端口
EXPOSE 3001

# 启动服务器
CMD ["node", "index.js"]

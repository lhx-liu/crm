# 前端 Dockerfile - 多阶段构建

# 阶段1: 构建 React 应用
FROM node:18.18.0-alpine as build

WORKDIR /app

# 使用国内镜像源加速
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 复制 package.json
COPY package*.json ./

# 使用淘宝镜像源加速 npm 安装
RUN npm config set registry https://registry.npmmirror.com

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 增大 Node.js 内存限制，避免构建 OOM
ENV NODE_OPTIONS=--max-old-space-size=4096

# 构建应用
RUN npm run build

# 阶段2: 使用 nginx 服务静态文件
FROM nginx:alpine

# 复制构建产物到 nginx
COPY --from=build /app/build /usr/share/nginx/html

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制 SSL 证书
COPY crm_crmly_cc_cd_integrated.pem /etc/nginx/ssl/
COPY crm_crmly_cc_cd.key /etc/nginx/ssl/

# 暴露端口
EXPOSE 80 443

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]

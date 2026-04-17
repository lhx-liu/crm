# CRM 客户管理系统

面向中小型外贸企业的客户关系管理系统,帮助企业高效管理客户信息、订单数据和销售流程,通过数据统计分析功能辅助决策,提升销售效率和客户满意度。

## 功能特性

### 核心功能模块

- **产品管理**: 管理产品信息,包括产品名称、型号、单价等
- **客户管理**: 管理客户基础信息及联系人,支持多维度筛选查询
- **订单管理**: 管理销售订单,支持订单全流程跟踪和多条件筛选
- **订单统计**: 提供多维度订单数据可视化分析,包括大洲分布、到款趋势等
- **客户分析**: 深度分析客户购买行为,了解客户价值和下单规律

### 业务特色

- 支持客户等级分类 (A/B/C)
- 支持客户来源、性质、商机等信息管理
- 支持订单付款跟踪,包含采购单号、Lead号等外贸业务字段
- 提供多维度数据分析,包括大洲分布、产品销售排行、客户贡献度等
- 支持客户下单时间轴和偏向产品分析

## 技术栈

### 前端技术

- **React 19.2.4** - 前端框架
- **Ant Design 6.3.3** - UI 组件库
- **ECharts 6.0.0** - 数据可视化
- **React Router 6.30.3** - 路由管理
- **Axios 1.13.6** - HTTP 请求
- **Day.js 1.11.20** - 日期处理

### 后端技术

- **Node.js** - 运行时环境
- **Express 5.2.1** - Web 框架
- **better-sqlite3 11.7.0** - SQLite 数据库引擎（高性能同步 API）
- **bcryptjs 3.0.3** - 密码加密
- **jsonwebtoken 9.0.3** - JWT 身份认证
- **CORS 2.8.6** - 跨域处理

### 部署技术

- **Docker** - 容器化部署
- **Docker Compose** - 多容器编排
- **Nginx** - 前端静态资源服务、反向代理

## 项目结构

```
Claw/
├── client/                    # 前端项目
│   ├── src/
│   │   ├── api/               # API 请求封装
│   │   ├── components/        # 公共组件
│   │   ├── pages/             # 页面组件
│   │   │   ├── Analysis/      # 客户分析
│   │   │   ├── Customers/     # 客户管理
│   │   │   ├── Orders/        # 订单管理
│   │   │   ├── Products/      # 产品管理
│   │   │   └── Statistics/    # 订单统计
│   │   ├── App.js             # 应用入口
│   │   └── index.js           # 渲染入口
│   ├── Dockerfile             # 前端 Docker 配置
│   ├── nginx.conf             # Nginx 配置
│   └── package.json
├── server/                    # 后端项目
│   ├── db/
│   │   ├── crm.db             # SQLite 数据库文件
│   │   └── database.js        # 数据库初始化
│   ├── routes/
│   │   ├── analysis.js        # 客户分析路由
│   │   ├── customers.js       # 客户管理路由
│   │   ├── orders.js          # 订单管理路由
│   │   ├── products.js        # 产品管理路由
│   │   └── statistics.js      # 统计分析路由
│   ├── index.js               # 服务入口
│   ├── Dockerfile             # 后端 Docker 配置
│   └── package.json
├── docker-compose.yml         # Docker 编排配置
├── DOCKER.md                  # Docker 部署文档
├── package.json               # 根项目配置
├── start-backend.bat          # Windows 启动后端脚本
├── start-frontend.bat         # Windows 启动前端脚本
└── start-dev.bat              # Windows 同时启动前后端脚本
```

## 快速开始

### 环境要求

- **Node.js** >= 18.0.0（推荐 v20 LTS）
- **Python** >= 3.6（better-sqlite3 编译需要）
- **Visual Studio Build Tools** 2022+（Windows 用户需要，包含 "Desktop development with C++" 工作负载）
- **Docker & Docker Compose**（生产环境）

### 开发环境运行

#### 方式一: 自动安装脚本（推荐，Windows）

```bash
# 进入后端目录
cd server

# 运行自动安装脚本（会自动处理 better-sqlite3 编译）
install.bat

# 或使用 Node.js 脚本
node install.js
```

#### 方式二: 使用启动脚本 (Windows)

```bash
# 同时启动前端和后端
start-dev.bat

# 或分别启动
start-backend.bat    # 启动后端 (端口 3001)
start-frontend.bat   # 启动前端 (端口 3000)
```

#### 方式二: 手动启动

```bash
# 1. 安装所有依赖
npm run install:all

# 2. 启动后端 (终端1)
cd server
npm install  # 会自动运行 postinstall 脚本编译 better-sqlite3
npm start
# 后端服务运行在 http://localhost:3001

# 3. 启动前端 (终端2)
cd client
npm start
# 前端应用运行在 http://localhost:3000
```

> **注意**: 如果后端安装过程中遇到 `better-sqlite3` 编译错误，请参考 `server/INSTALL.md` 文档。

### 生产环境部署

使用 Docker Compose 一键部署:

```bash
# 构建并启动所有服务
docker-compose up -d --build

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

**访问地址:**
- 前端: http://localhost
- 后端 API: http://localhost:3001

详细部署说明请参考 [DOCKER.md](./DOCKER.md)

## API 接口

### RESTful API 规范

| 模块 | 路由前缀 | 说明 |
|------|----------|------|
| 产品管理 | `/api/products` | 产品 CRUD 操作 |
| 客户管理 | `/api/customers` | 客户 CRUD 操作 |
| 订单管理 | `/api/orders` | 订单 CRUD 操作 |
| 订单统计 | `/api/statistics` | 数据统计分析 |
| 客户分析 | `/api/analysis` | 客户行为分析 |
| 健康检查 | `/api/health` | 服务状态检查 |

## 数据库设计

系统使用 SQLite 数据库,包含以下核心数据表:

- **products** - 产品表
- **customers** - 客户表
- **contacts** - 联系人表
- **orders** - 订单表
- **order_items** - 订单明细表

数据库文件位于 `server/db/crm.db`,支持持久化存储和数据备份。

## 主要功能截图

(建议添加系统主要功能界面的截图)

## 开发指南

### 代码规范

- 遵循 ESLint 规范
- 关键业务逻辑需有注释说明
- 统一的错误处理机制

### 数据备份

```bash
# 开发环境备份
cp server/db/crm.db backup/crm_$(date +%Y%m%d).db

# Docker 环境备份
docker cp crm-backend:/app/db/crm.db ./backup/
```

## 后续优化计划

### 功能优化

- [ ] 增加用户认证与权限管理
- [ ] 增加数据导入导出功能 (Excel/CSV)
- [ ] 增加操作日志审计
- [ ] 增加消息通知功能
- [ ] 增加移动端适配

### 技术优化

- [ ] 引入 TypeScript 增强代码可维护性
- [ ] 数据库升级为 MySQL/PostgreSQL
- [ ] 增加单元测试和集成测试
- [ ] 引入 Redis 缓存提升性能
- [ ] 配置 CI/CD 自动化部署

### 安全优化

- [ ] 增加 JWT 身份认证
- [ ] 敏感数据加密存储
- [ ] API 接口限流保护
- [ ] 配置 HTTPS 安全传输

## 许可证

MIT License

## 联系方式

如有问题或建议,请提交 Issue 或 Pull Request。

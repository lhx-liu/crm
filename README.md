# CRM 智能客户管理系统

面向中小型外贸企业的客户关系管理系统，集成 AI 大模型能力，帮助企业高效管理客户信息、订单数据和销售流程，通过数据统计分析与 AI 智能分析辅助决策，提升销售效率和客户满意度。

## 功能特性

### 核心功能模块

- **产品管理**: 管理产品信息，包括产品大类、型号、单价等
- **客户管理**: 管理客户基础信息及联系人，支持多维度筛选查询，一键 AI 分析客户画像
- **订单管理**: 管理销售订单，支持订单全流程跟踪、多条件筛选、Excel 导出，详情页可 AI 分析
- **订单统计**: 提供多维度订单数据可视化分析，包括大洲分布、到款趋势等
- **客户分析**: 深度分析客户购买行为，了解客户价值和下单规律
- **AI 助手**: 基于大模型的智能对话与分析，支持自然语言查询业务数据

### AI 智能分析

- **智能对话**: 用自然语言提问，AI 自动查询数据库并给出基于真实数据的回答
  - 例："A级客户有哪些？他们的主要购买产品是什么？"
  - 例："分析最近3个月的订单趋势"
- **快捷分析**: 一键生成订单总结、客户洞察、趋势预测
- **上下文感知**: 从客户/订单页面跳转时自动带入上下文，AI 针对性分析
- **数据脱敏**: 所有发给 AI 的数据自动脱敏（邮箱、手机号、地址等），AI 回答也保持脱敏
- **流式响应**: AI 回复逐字展示，无需等待完整生成

### 业务特色

- 支持客户等级分类 (A/B/C)，客户来源、性质、商机等信息管理
- 支持订单付款跟踪，包含采购单号、Lead 号等外贸业务字段
- 提供多维度数据分析，包括大洲分布、产品销售排行、客户贡献度等
- 支持客户下单时间轴和偏向产品分析
- 支持订单数据 Excel 导出
- JWT 身份认证，首次登录强制修改密码
- AI 数据安全脱敏，敏感信息不出域

## 技术栈

### 前端技术

- **React 19** - 前端框架
- **Ant Design 6** - UI 组件库
- **ECharts 6** - 数据可视化
- **React Router 6** - 路由管理
- **Axios** - HTTP 请求
- **Day.js** - 日期处理
- **Vite** - 构建工具

### 后端技术

- **Node.js** - 运行时环境
- **Express 5** - Web 框架
- **MySQL 2** - MySQL 数据库驱动（连接池模式）
- **OpenAI SDK** - AI 大模型调用（兼容智谱 GLM API）
- **bcryptjs** - 密码加密
- **jsonwebtoken** - JWT 身份认证
- **dotenv** - 环境变量管理
- **CORS** - 跨域处理

### AI 技术方案

- **模型**: 智谱 GLM-4-Flash-250414（免费，无 Token 上限）
- **协议**: 兼容 OpenAI API 格式
- **传输**: SSE (Server-Sent Events) 流式响应

### 部署技术

- **Docker** - 容器化部署
- **Docker Compose** - 多容器编排
- **Nginx** - 前端静态资源服务、反向代理

## 项目结构

```
crm-ai/
├── client/                        # 前端项目
│   ├── src/
│   │   ├── api/                   # API 请求封装
│   │   │   ├── index.js           # Axios 实例 + 拦截器
│   │   │   └── ai.js              # AI 流式接口封装 (SSE)
│   │   ├── components/            # 公共组件
│   │   ├── pages/                 # 页面组件
│   │   │   ├── AIAssistant/       # AI 助手（对话式 UI）
│   │   │   ├── Analysis/          # 客户分析
│   │   │   ├── Customers/         # 客户管理
│   │   │   ├── Orders/            # 订单管理
│   │   │   ├── Products/          # 产品管理
│   │   │   ├── Statistics/        # 订单统计
│   │   │   ├── Login.jsx          # 登录页
│   │   │   └── ChangePassword.jsx # 修改密码页
│   │   ├── App.jsx                # 应用入口 + 路由 + 菜单
│   │   └── index.js               # 渲染入口
│   ├── vite.config.js             # Vite 配置（含 API 代理）
│   └── package.json
├── server/                        # 后端项目
│   ├── db/
│   │   └── database.js            # MySQL 初始化 + 建表
│   ├── routes/
│   │   ├── ai.js                  # AI 助手路由（chat/analyze + 智能数据注入 + 脱敏）
│   │   ├── analysis.js            # 客户分析路由
│   │   ├── auth.js                # 认证路由（登录/改密码）
│   │   ├── customers.js           # 客户管理路由
│   │   ├── orders.js              # 订单管理路由
│   │   ├── products.js            # 产品管理路由
│   │   └── statistics.js          # 统计分析路由
│   ├── index.js                   # 服务入口
│   └── package.json
├── .env.example                   # 环境变量模板
├── .env                           # 环境变量（不入 Git）
├── docker-compose.yml             # Docker 编排配置
├── DOCKER.md                      # Docker 部署文档
├── AI_INTEGRATION_PLAN.md         # AI 接入计划文档
├── start-backend.bat              # Windows 启动后端脚本
├── start-frontend.bat             # Windows 启动前端脚本
└── start-dev.bat                  # Windows 同时启动前后端脚本
```

## 快速开始

### 环境要求

- **Node.js** >= 18.0.0（推荐 v20 LTS）
- **MySQL** >= 5.7（需提前安装并运行）
- **Docker & Docker Compose**（生产环境可选）

### 配置环境变量

复制 `.env.example` 为 `.env`，填入实际配置：

```bash
cp .env.example .env
```

必须配置的变量：

```env
# MySQL 数据库
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=crm_user
MYSQL_PASSWORD=你的MySQL密码
MYSQL_DATABASE=crm_db

# JWT 密钥
JWT_SECRET=你的JWT密钥

# AI 大模型（智谱 GLM-4-Flash）
AI_API_KEY=你的智谱API_Key
AI_API_URL=https://open.bigmodel.cn/api/paas/v4
AI_MODEL=glm-4-flash-250414
```

> 智谱 API Key 免费获取：[https://open.bigmodel.cn](https://open.bigmodel.cn) 注册后创建即可，GLM-4-Flash 模型永久免费。

### 开发环境运行

#### 方式一: 使用启动脚本 (Windows)

```bash
# 同时启动前端和后端
start-dev.bat

# 或分别启动
start-backend.bat    # 启动后端 (端口 3001)
start-frontend.bat   # 启动前端 (端口 3000)
```

#### 方式二: 手动启动

```bash
# 1. 安装后端依赖
cd server
npm install

# 2. 启动后端 (终端1)
npm start
# 后端服务运行在 http://localhost:3001
# 首次启动会自动建表并创建管理员账户 admin / admin123

# 3. 安装前端依赖 (终端2)
cd client
npm install

# 4. 启动前端
npm run dev
# 前端应用运行在 http://localhost:3000
```

### 生产环境部署

使用 Docker Compose 一键部署：

```bash
# 构建并启动所有服务
docker-compose up -d --build

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

**访问地址：**
- 前端: http://localhost
- 后端 API: http://localhost:3001

详细部署说明请参考 [DOCKER.md](./DOCKER.md)

## API 接口

### RESTful API 规范

| 模块 | 路由前缀 | 说明 |
|------|----------|------|
| 认证管理 | `/api/auth` | 登录、修改密码 |
| 产品管理 | `/api/products` | 产品 CRUD 操作 |
| 客户管理 | `/api/customers` | 客户 CRUD 操作 |
| 订单管理 | `/api/orders` | 订单 CRUD + Excel 导出 |
| 订单统计 | `/api/statistics` | 数据统计分析 |
| 客户分析 | `/api/analysis` | 客户行为分析 |
| **AI 助手** | **`/api/ai`** | **AI 对话 + 数据分析** |
| 健康检查 | `/api/health` | 服务状态检查 |

### AI 接口详情

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/ai/chat` | POST | 通用对话 — 接收用户问题，智能注入业务数据，AI 基于真实数据回答（SSE 流式） |
| `/api/ai/analyze` | POST | 数据分析 — 接收分析类型，后端自动取数据 + 拼 prompt + 调 AI（SSE 流式） |

**chat 请求体：**
```json
{
  "message": "A级客户有哪些？",
  "context": { "customer_id": 1, "order_id": null },
  "history": [{ "role": "user", "content": "你好" }, { "role": "assistant", "content": "你好！" }]
}
```

**analyze 请求体：**
```json
{
  "type": "order_summary",  // 可选: order_summary / customer_insight / trend_predict
  "params": { "customer_id": 1 }
}
```

## 数据库设计

系统使用 MySQL 数据库，包含以下数据表：

| 表名 | 说明 |
|------|------|
| `product_categories` | 产品大类表 |
| `product_models` | 产品型号表 |
| `customers` | 客户表 |
| `contacts` | 联系人表 |
| `orders` | 订单表 |
| `order_items` | 订单明细表 |
| `users` | 用户表（管理员/普通用户） |
| `ai_conversations` | AI 对话会话表 |
| `ai_messages` | AI 对话消息表 |

首次启动时自动建表，并创建默认管理员账户 `admin / admin123`（首次登录需修改密码）。

## AI 数据安全

系统对发给 AI 的数据实施多重保护：

1. **字段级脱敏**: 自动识别 20+ 敏感字段名（email、phone、address、id_card 等）
2. **规则脱敏**:
   - 邮箱: `zhang@example.com` → `z***@example.com`
   - 手机号: `13812345678` → `138****5678`
   - 其他敏感字段: 取首尾字符，中间 `***`
3. **AI 回答约束**: 系统提示词要求 AI 保持脱敏，不得猜测还原原始数据
4. **最小化数据**: 仅根据用户问题关键词注入相关数据，不发送全量数据

## 开发指南

### 代码规范

- 遵循 ESLint 规范
- 关键业务逻辑需有注释说明
- 统一的错误处理机制
- API 接口统一返回 `{ success, data, message }` 格式

### 数据备份

```bash
# MySQL 备份
mysqldump -u crm_user -p crm_db > backup_$(date +%Y%m%d).sql

# 恢复
mysql -u crm_user -p crm_db < backup_20260417.sql
```

## 后续优化计划

### 功能优化

- [ ] AI 对话历史持久化（前端会话管理）
- [ ] AI 分析结果导出为 PDF/Word 报告
- [ ] 支持 AI 自动生成客户跟进建议
- [ ] 增加操作日志审计
- [ ] 增加消息通知功能
- [ ] 增加移动端适配

### 技术优化

- [ ] 引入 TypeScript 增强代码可维护性
- [ ] 增加单元测试和集成测试
- [ ] 引入 Redis 缓存提升性能
- [ ] 配置 CI/CD 自动化部署
- [ ] AI 请求限流与排队机制
- [ ] 支持更多大模型（DeepSeek、通义千问等）

## 许可证

MIT License

## 联系方式

如有问题或建议，请提交 Issue 或 Pull Request。

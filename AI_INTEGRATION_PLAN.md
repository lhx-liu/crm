# CRM AI 助手接入计划

> 版本：v1.0 | 日期：2026-04-17 | 状态：规划中

---

## 一、项目现状分析

### 1.1 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端 | React + Ant Design + Vite | 19.2.4 / 6.3.3 / 6.0.7 |
| 路由 | React Router DOM | 6.30.3 |
| 图表 | ECharts + echarts-for-react | 6.0.0 |
| 后端 | Express | 5.2.1 |
| 数据库 | MySQL (mysql2/promise) | 8.0 |
| 认证 | JWT (jsonwebtoken + bcryptjs) | 24h 过期 |
| 部署 | Docker Compose + Nginx | - |

### 1.2 现有数据模型

```
product_categories (产品大类)
├── id, name, description, created_at, updated_at

product_models (产品型号)
├── id, category_id, model, price, description, created_at, updated_at

customers (客户)
├── id, company_name, level(A/B/C), opportunity, background,
│   country, nature, source, continent, potential_inquiry,
│   created_at, updated_at
└── contacts (联系人)
    ├── id, customer_id, name, email, phone, created_at

orders (订单)
├── id, customer_id, customer_type(新客户/老客户),
│   order_date, payment_date, purchase_order_no, lead_no,
│   payment_amount, invoice_amount, exw_value, total_amount,
│   created_at, updated_at
└── order_items (订单明细)
    ├── id, order_id, model_id, quantity, unit_price, created_at

users (用户)
├── id, username, password, role, must_change_password, last_login, created_at
```

### 1.3 现有路由与页面

| 菜单 | 路由 | 组件 |
|------|------|------|
| 订单管理 | `/orders` | `pages/Orders/index.jsx` (630行，最复杂) |
| 客户管理 | `/customers` | `pages/Customers/index.jsx` |
| 产品管理 | `/products` | `pages/Products/index.jsx` |
| 订单统计 | `/statistics` | `pages/Statistics/index.jsx` |
| 客户分析 | `/analysis` | `pages/Analysis/index.jsx` |
| 客户分析详情 | `/analysis/:id` | `pages/Analysis/detail.jsx` |

### 1.4 关键约定

- API 统一前缀 `/api`，Vite 代理到 `localhost:3001`
- 需认证的路由使用 `authMiddleware` 中间件
- 响应格式：`{ success: boolean, data?: any, message?: string }`
- 前端 API 封装在 `client/src/api/index.js`（axios 实例，自动附加 token）

---

## 二、AI 接入方案设计

### 2.1 大模型选型

| 方案 | 模型 | 月费用 | API 兼容性 | 推荐度 |
|------|------|--------|-----------|--------|
| **首选** | 智谱 GLM-4-Flash | 免费 | OpenAI 兼容 | ★★★★★ |
| 备选 | 腾讯混元 Lite | 免费 | 自有协议 | ★★★★ |
| 付费升级 | DeepSeek-V3 | 极低价 | OpenAI 兼容 | ★★★★ |
| 付费升级 | GLM-4-Plus | 低价 | OpenAI 兼容 | ★★★ |

**推荐策略**：先用 GLM-4-Flash 零成本验证，跑通全流程后再按需升级。

### 2.2 核心流程

```
┌─────────┐     ┌─────────────┐     ┌──────────┐     ┌──────────┐
│  前端    │────>│  后端 API    │────>│  数据库   │     │          │
│ (React)  │     │  (Express)   │     │  (MySQL)  │     │  大模型   │
│          │<────│              │<────│          │<────│  API     │
└─────────┘     └─────────────┘     └──────────┘     └──────────┘
                      │                                    │
                      │  1. 接收用户消息 + 上下文            │
                      │  2. 查询数据库获取相关数据            │
                      │  3. 组装 prompt (系统提示+数据+问题)  │
                      │  4. 调用大模型 API (流式)            │
                      │  5. 流式返回 AI 响应                 │
                      └────────────────────────────────────┘
```

### 2.3 环境变量配置

在 `.env` 中新增：

```env
# AI 大模型配置
AI_PROVIDER=glm4flash          # glm4flash / hunyuan / deepseek / glm4plus
AI_API_KEY=your_api_key_here   # 大模型 API Key
AI_API_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions  # API 地址
AI_MODEL=glm-4-flash           # 模型名称
AI_MAX_TOKENS=4096             # 最大输出 token 数
AI_TEMPERATURE=0.7             # 温度参数
```

---

## 三、后端改动详细设计

### 3.1 新增依赖

```bash
cd server
npm install openai  # OpenAI SDK（智谱/DeepSeek 兼容）
```

> 智谱 GLM-4-Flash 完全兼容 OpenAI SDK，只需修改 baseURL 和 model 参数。

### 3.2 新增文件：`server/routes/ai.js`

#### 3.2.1 接口设计

| 接口 | 方法 | 说明 | 请求体 |
|------|------|------|--------|
| `/api/ai/chat` | POST | 通用对话 | `{ message, context?: { customer_id?, order_id? }, history?: [{role, content}] }` |
| `/api/ai/analyze` | POST | 数据分析 | `{ type: "order_summary" \| "customer_insight" \| "trend_predict", params?: { customer_id?, date_range? } }` |
| `/api/ai/conversations` | GET | 获取历史会话列表 | - |
| `/api/ai/conversations/:id` | GET | 获取会话详情 | - |
| `/api/ai/conversations` | POST | 新建会话 | `{ title? }` |
| `/api/ai/conversations/:id/messages` | POST | 向会话发消息 | `{ message, context? }` |

#### 3.2.2 核心代码结构

```javascript
// server/routes/ai.js
const express = require('express');
const router = express.Router();
const { getPool } = require('../db/database');
const OpenAI = require('openai');

// 初始化 AI 客户端
const aiClient = new OpenAI({
  apiKey: process.env.AI_API_KEY,
  baseURL: process.env.AI_API_URL || 'https://open.bigmodel.cn/api/paas/v4',
});

// ==================== 系统提示词 ====================

const SYSTEM_PROMPT = `你是 CRM 系统的 AI 助手，专门帮助用户分析外贸业务数据。
你可以：
- 总结订单数据，提供业务洞察
- 分析客户画像、购买行为和偏好
- 预测趋势，给出业务建议
- 回答关于客户、订单、产品的问题

当前可查询的数据表：
- customers: 客户信息（公司名、等级A/B/C、国家、大洲、商机、来源等）
- orders: 订单信息（日期、到款金额、新老客户等）
- order_items: 订单产品明细
- product_categories / product_models: 产品大类和型号
- contacts: 客户联系人

回答要求：
1. 基于提供的数据客观分析
2. 给出具体数字和百分比
3. 如有建议，按优先级排列
4. 使用中文回答
`;

// ==================== 数据查询函数 ====================

async function getCustomerContext(customerId) {
  const db = getPool();
  const [[customer]] = await db.execute('SELECT * FROM customers WHERE id = ?', [customerId]);
  if (!customer) return null;
  const [contacts] = await db.execute('SELECT * FROM contacts WHERE customer_id = ?', [customerId]);
  const [orders] = await db.execute(`
    SELECT o.*, 
      (SELECT GROUP_CONCAT(CONCAT(pc.name, '(', pm.model, ') x', oi.quantity) SEPARATOR ', ')
       FROM order_items oi 
       LEFT JOIN product_models pm ON oi.model_id = pm.id
       LEFT JOIN product_categories pc ON pm.category_id = pc.id
       WHERE oi.order_id = o.id) as products
    FROM orders o WHERE o.customer_id = ? ORDER BY o.order_date DESC
  `, [customerId]);
  return { customer, contacts, orders };
}

async function getOrderContext(orderId) {
  const db = getPool();
  const [orders] = await db.execute(`
    SELECT o.*, c.company_name, c.level, c.country, c.continent
    FROM orders o LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.id = ?
  `, [orderId]);
  if (!orders.length) return null;
  const [items] = await db.execute(`
    SELECT oi.*, pm.model, pc.name as category_name
    FROM order_items oi
    LEFT JOIN product_models pm ON oi.model_id = pm.id
    LEFT JOIN product_categories pc ON pm.category_id = pc.id
    WHERE oi.order_id = ?
  `, [orderId]);
  return { order: orders[0], items };
}

async function getOrderSummary() {
  const db = getPool();
  const [[stats]] = await db.execute(`
    SELECT 
      COUNT(*) as total_orders,
      SUM(payment_amount) as total_payment,
      AVG(payment_amount) as avg_payment,
      COUNT(DISTINCT customer_id) as total_customers
    FROM orders
  `);
  const [byContinent] = await db.execute(`
    SELECT c.continent, COUNT(*) as order_count, SUM(o.payment_amount) as total_amount
    FROM orders o LEFT JOIN customers c ON o.customer_id = c.id
    GROUP BY c.continent ORDER BY total_amount DESC
  `);
  const [byLevel] = await db.execute(`
    SELECT c.level, COUNT(*) as order_count, SUM(o.payment_amount) as total_amount
    FROM orders o LEFT JOIN customers c ON o.customer_id = c.id
    GROUP BY c.level
  `);
  const [monthly] = await db.execute(`
    SELECT DATE_FORMAT(order_date, '%Y-%m') as month, 
      COUNT(*) as count, SUM(payment_amount) as amount
    FROM orders WHERE order_date IS NOT NULL
    GROUP BY month ORDER BY month DESC LIMIT 12
  `);
  return { stats, byContinent, byLevel, monthly };
}

async function getCustomerInsight(customerId) {
  const db = getPool();
  const customerCtx = await getCustomerContext(customerId);
  if (!customerCtx) return null;
  
  const [[productPreference]] = await db.execute(`
    SELECT pc.name as category_name, 
      SUM(oi.quantity) as total_qty, 
      SUM(oi.quantity * oi.unit_price) as total_amount
    FROM order_items oi
    LEFT JOIN product_models pm ON oi.model_id = pm.id
    LEFT JOIN product_categories pc ON pm.category_id = pc.id
    LEFT JOIN orders o ON oi.order_id = o.id
    WHERE o.customer_id = ?
    GROUP BY pc.id ORDER BY total_amount DESC
  `, [customerId]);
  
  // 复购间隔计算
  const [dates] = await db.execute(
    'SELECT order_date FROM orders WHERE customer_id = ? AND order_date IS NOT NULL ORDER BY order_date ASC',
    [customerId]
  );
  let avgDays = null;
  if (dates.length > 1) {
    let totalDiff = 0;
    for (let i = 1; i < dates.length; i++) {
      totalDiff += (new Date(dates[i].order_date) - new Date(dates[i-1].order_date)) / (1000*60*60*24);
    }
    avgDays = Math.round(totalDiff / (dates.length - 1));
  }
  
  return { ...customerCtx, productPreference, avgRepurchaseDays: avgDays };
}

async function getTrendPrediction() {
  const db = getPool();
  const [quarterly] = await db.execute(`
    SELECT CONCAT(YEAR(order_date), '-Q', QUARTER(order_date)) as quarter,
      COUNT(*) as order_count, SUM(payment_amount) as total_amount
    FROM orders WHERE order_date IS NOT NULL
    GROUP BY quarter ORDER BY quarter DESC LIMIT 8
  `);
  const [topProducts] = await db.execute(`
    SELECT pc.name, SUM(oi.quantity) as qty, SUM(oi.quantity * oi.unit_price) as amount
    FROM order_items oi
    LEFT JOIN product_models pm ON oi.model_id = pm.id
    LEFT JOIN product_categories pc ON pm.category_id = pc.id
    LEFT JOIN orders o ON oi.order_id = o.id
    GROUP BY pc.id ORDER BY amount DESC LIMIT 10
  `);
  const [continentGrowth] = await db.execute(`
    SELECT c.continent,
      SUM(CASE WHEN o.order_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) THEN o.payment_amount ELSE 0 END) as recent_6m,
      SUM(CASE WHEN o.order_date < DATE_SUB(CURDATE(), INTERVAL 6 MONTH) AND o.order_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) THEN o.payment_amount ELSE 0 END) as prev_6m
    FROM orders o LEFT JOIN customers c ON o.customer_id = c.id
    GROUP BY c.continent
  `);
  return { quarterly, topProducts, continentGrowth };
}

// ==================== AI 调用核心函数 ====================

async function callAI(messages, stream = true) {
  const response = await aiClient.chat.completions.create({
    model: process.env.AI_MODEL || 'glm-4-flash',
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 4096,
    temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7,
    stream,
  });
  return response;
}

// ==================== API 路由 ====================

// POST /api/ai/chat - 通用对话（支持流式）
router.post('/chat', async (req, res) => {
  try {
    const { message, context, history = [] } = req.body;
    if (!message) return res.status(400).json({ success: false, message: '消息不能为空' });

    // 根据上下文获取数据
    let contextData = '';
    if (context?.customer_id) {
      const data = await getCustomerContext(context.customer_id);
      if (data) contextData += `\n\n[当前客户上下文]\n${JSON.stringify(data, null, 2)}`;
    }
    if (context?.order_id) {
      const data = await getOrderContext(context.order_id);
      if (data) contextData += `\n\n[当前订单上下文]\n${JSON.stringify(data, null, 2)}`;
    }

    const messages = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message + (contextData ? contextData : '') }
    ];

    // 流式返回
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await callAI(messages, true);
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('AI Chat Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'AI 服务异常：' + err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
});

// POST /api/ai/analyze - 数据分析
router.post('/analyze', async (req, res) => {
  try {
    const { type, params = {} } = req.body;
    
    let data, prompt;
    
    switch (type) {
      case 'order_summary':
        data = await getOrderSummary();
        prompt = '请基于以下订单数据，做一份全面的业务总结分析，包括：总体概况、大洲分布洞察、客户等级分析、月度趋势变化，并给出 actionable 建议。';
        break;
        
      case 'customer_insight':
        if (!params.customer_id) {
          return res.status(400).json({ success: false, message: '客户洞察需要提供 customer_id' });
        }
        data = await getCustomerInsight(params.customer_id);
        if (!data) return res.status(404).json({ success: false, message: '客户不存在' });
        prompt = `请分析客户 "${data.customer.company_name}" 的画像和购买行为，包括：客户价值评估、购买偏好、复购规律、潜在需求，并给出跟进建议。`;
        break;
        
      case 'trend_predict':
        data = await getTrendPrediction();
        prompt = '请基于以下季度趋势、产品排行和大洲增长数据，预测下一季度可能的业务走向，指出增长机会和风险区域，给出具体建议。';
        break;
        
      default:
        return res.status(400).json({ success: false, message: '不支持的分析类型' });
    }

    const messages = [
      { role: 'user', content: `${prompt}\n\n[数据]\n${JSON.stringify(data, null, 2)}` }
    ];

    // 流式返回
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await callAI(messages, true);
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('AI Analyze Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'AI 分析服务异常：' + err.message });
    }
  }
});

module.exports = router;
```

### 3.3 注册路由：修改 `server/index.js`

```javascript
// 在现有路由下方新增（需要登录后访问）
app.use('/api/ai', authMiddleware, require('./routes/ai'));
```

### 3.4 新增数据库表（可选，用于会话持久化）

```sql
-- AI 对话会话表
CREATE TABLE IF NOT EXISTS ai_conversations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(255),
  context_type VARCHAR(50),     -- 'general' / 'customer' / 'order'
  context_id INT,               -- customer_id 或 order_id
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- AI 对话消息表
CREATE TABLE IF NOT EXISTS ai_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  conversation_id INT NOT NULL,
  role ENUM('user', 'assistant', 'system') NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.5 修改 `server/db/database.js`

在 `createTables()` 函数中追加上述建表 SQL。

---

## 四、前端改动详细设计

### 4.1 新增文件清单

| 文件 | 说明 |
|------|------|
| `client/src/pages/AIAssistant/index.jsx` | AI 助手主页面 |
| `client/src/api/ai.js` | AI 接口封装 |

### 4.2 修改 `client/src/App.jsx`

```diff
  import {
-   ShopOutlined, TeamOutlined, FileTextOutlined,
+   ShopOutlined, TeamOutlined, FileTextOutlined, RobotOutlined,
    BarChartOutlined, LineChartOutlined, UserOutlined, LogoutOutlined, KeyOutlined
  } from '@ant-design/icons';

+ import AIAssistant from './pages/AIAssistant';

  const menuItems = [
    { key: '/orders', icon: <FileTextOutlined />, label: '订单管理' },
    { key: '/customers', icon: <TeamOutlined />, label: '客户管理' },
    { key: '/products', icon: <ShopOutlined />, label: '产品管理' },
    { key: '/statistics', icon: <BarChartOutlined />, label: '订单统计' },
    { key: '/analysis', icon: <LineChartOutlined />, label: '客户分析' },
+   { key: '/ai-assistant', icon: <RobotOutlined />, label: 'AI 助手' },
  ];

  // 在 Routes 中新增
+ <Route path="/ai-assistant" element={<AIAssistant />} />
+ <Route path="/ai-assistant/:contextType/:contextId" element={<AIAssistant />} />
```

### 4.3 新增 `client/src/api/ai.js`

```javascript
import api from './index';

/**
 * 通用对话（非流式，用于简单场景）
 */
export async function chatWithAI(message, context = {}, history = []) {
  return api.post('/ai/chat', { message, context, history });
}

/**
 * 通用对话（流式）
 * 返回 ReadableStream，需手动处理 SSE
 */
export function chatWithAIStream(message, context = {}, history = []) {
  const token = localStorage.getItem('token');
  return fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ message, context, history }),
  });
}

/**
 * 数据分析（流式）
 */
export function analyzeWithAIStream(type, params = {}) {
  const token = localStorage.getItem('token');
  return fetch('/api/ai/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ type, params }),
  });
}

/**
 * 解析 SSE 流
 * 用法：streamSSE(response, (content) => { ... }, () => { ... })
 */
export async function streamSSE(response, onContent, onDone) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          onDone?.();
          return;
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) onContent(parsed.content);
          if (parsed.error) onContent(`\n\n❌ 错误：${parsed.error}`);
        } catch {}
      }
    }
  }
  onDone?.();
}
```

### 4.4 新增 `client/src/pages/AIAssistant/index.jsx`

页面结构设计：

```
┌─────────────────────────────────────────────────────────┐
│ AI 助手                                     [新对话]   │
├────────────┬────────────────────────────────────────────┤
│            │                                            │
│ 快捷分析   │  对话区域（消息列表）                        │
│            │                                            │
│ 📊 订单总结 │  🤖 你好！我是 CRM AI 助手...              │
│ 👤 客户洞察 │                                            │
│ 📈 趋势预测 │  👍 帮我分析一下最近的订单趋势              │
│            │                                            │
│ ───────── │  🤖 根据数据分析，最近3个月...              │
│ 上下文信息  │                                            │
│            │                                            │
│ 当前客户： │ ────────────────────────────────────────── │
│ XXX公司    │  [输入框]                          [发送]   │
│            │                                            │
└────────────┴────────────────────────────────────────────┘
```

核心 UI 组件：

```jsx
// 使用 Ant Design 组件
import { Card, Input, Button, List, Avatar, Typography, Space, Tag, Spin, Empty, Tooltip } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, ThunderboltOutlined, BarChartOutlined, TeamOutlined, LineChartOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useParams, useSearchParams } from 'react-router-dom';
import { streamSSE, chatWithAIStream, analyzeWithAIStream } from '../../api/ai';
import api from '../../api';

// 关键功能：
// 1. 支持从 URL 参数带入上下文 (?context_type=customer&context_id=123)
// 2. 流式显示 AI 回复（打字机效果）
// 3. 快捷分析按钮（订单总结/客户洞察/趋势预测）
// 4. 对话历史记录
// 5. 上下文信息展示（当从客户/订单页跳入时）
```

### 4.5 修改现有页面（上下文快捷入口）

#### 4.5.1 修改 `client/src/pages/Customers/index.jsx`

在客户操作列新增"AI 分析"按钮：

```diff
  import {
-   PlusOutlined, EditOutlined, DeleteOutlined, LineChartOutlined, MinusCircleOutlined
+   PlusOutlined, EditOutlined, DeleteOutlined, LineChartOutlined, MinusCircleOutlined,
+   RobotOutlined
  } from '@ant-design/icons';

  // 操作列
  <Space>
+   <Tooltip title="让AI分析">
+     <Button size="small" icon={<RobotOutlined />} 
+       onClick={() => navigate(`/ai-assistant/customer/${record.id}`)}
+       style={{ color: '#722ed1', borderColor: '#722ed1' }}
+     />
+   </Tooltip>
    <Button size="small" icon={<LineChartOutlined />} onClick={() => navigate(`/analysis/${record.id}`)}>分析</Button>
    <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
    ...
  </Space>
```

#### 4.5.2 修改 `client/src/pages/Orders/index.jsx`

在订单详情 Drawer 中新增"AI 分析此订单"按钮：

```diff
+ import { RobotOutlined } from '@ant-design/icons';

  // 在订单详情 Drawer 中，产品明细表格下方新增
  <Divider />
  <Button 
    type="dashed" 
    icon={<RobotOutlined />} 
    onClick={() => navigate(`/ai-assistant/order/${detailRecord.id}`)}
    style={{ width: '100%' }}
  >
    让 AI 分析此订单
  </Button>
```

---

## 五、开发计划与里程碑

### Phase 1：MVP 基础版（3-5 天）

**目标**：跑通 AI 对话全流程，验证可行性

| 步骤 | 任务 | 涉及文件 | 预估工时 |
|------|------|---------|---------|
| 1.1 | 注册智谱 API，获取 Key | 外部 | 0.5h |
| 1.2 | 后端安装 openai 依赖，新增 ai.js 路由 | `server/routes/ai.js`, `server/index.js` | 4h |
| 1.3 | 实现 POST /api/ai/chat 基础版（非流式先跑通） | `server/routes/ai.js` | 2h |
| 1.4 | 前端新增 AI 助手页面和路由 | `App.jsx`, `pages/AIAssistant/index.jsx` | 4h |
| 1.5 | 实现基础对话 UI（发消息+显示回复） | `pages/AIAssistant/index.jsx`, `api/ai.js` | 4h |
| 1.6 | 升级为流式返回（SSE） | 前后端 | 3h |

**验收标准**：在 AI 助手页面输入问题，能流式获得 AI 回复。

### Phase 2：数据上下文（2-3 天）

**目标**：让 AI 能"看到"业务数据，给出有价值的回答

| 步骤 | 任务 | 涉及文件 | 预估工时 |
|------|------|---------|---------|
| 2.1 | 实现数据查询函数（客户/订单/汇总） | `server/routes/ai.js` | 3h |
| 2.2 | 实现 POST /api/ai/analyze 接口 | `server/routes/ai.js` | 3h |
| 2.3 | 客户详情页加"让AI分析"按钮 | `pages/Customers/index.jsx` | 1h |
| 2.4 | 订单详情页加"让AI分析"按钮 | `pages/Orders/index.jsx` | 1h |
| 2.5 | AI 助手页支持上下文显示和快捷分析 | `pages/AIAssistant/index.jsx` | 3h |

**验收标准**：
- 从客户页点"AI分析"跳转，AI 能说出该客户的基本信息和购买概况
- 点击"订单总结"，AI 能给出全量订单分析报告

### Phase 3：体验优化（2-3 天）

**目标**：提升交互体验，让 AI 助手真正好用

| 步骤 | 任务 | 涉及文件 | 预估工时 |
|------|------|---------|---------|
| 3.1 | 对话历史持久化（数据库表） | `server/routes/ai.js`, `server/db/database.js` | 3h |
| 3.2 | 对话历史列表和切换 | `pages/AIAssistant/index.jsx` | 3h |
| 3.3 | Markdown 渲染 AI 回复 | `pages/AIAssistant/index.jsx` | 2h |
| 3.4 | 快捷提问模板 | `pages/AIAssistant/index.jsx` | 1h |
| 3.5 | AI 回复复制功能 | `pages/AIAssistant/index.jsx` | 0.5h |
| 3.6 | 环境变量完善 + .env.example 更新 | `.env.example` | 0.5h |

**验收标准**：
- 对话关闭后再打开能看到历史
- AI 回复中表格、列表正确渲染
- 支持一键复制 AI 回复

### Phase 4：进阶功能（可选，3-5 天）

| 步骤 | 任务 | 说明 |
|------|------|------|
| 4.1 | 多轮对话上下文保持 | history 参数传递，AI 理解之前的问题 |
| 4.2 | 智能推荐 | 根据当前页面自动推荐分析类型 |
| 4.3 | 导出分析报告 | 将 AI 分析结果导出为 PDF/Markdown |
| 4.4 | 多模型切换 | 支持在设置中切换 GLM-4-Flash / DeepSeek 等 |
| 4.5 | Token 用量统计 | 记录每次调用的 token 消耗 |

---

## 六、AI 提示词（Prompt）设计

### 6.1 系统提示词

```
你是 CRM 系统的 AI 助手，专门帮助用户分析外贸业务数据。

你的能力范围：
1. 总结订单数据，提供业务洞察和趋势分析
2. 分析客户画像、购买行为和偏好
3. 预测趋势，给出业务建议
4. 回答关于客户、订单、产品的问题

数据说明：
- 客户等级：A级（最高）、B级、C级
- payment_amount 为到款金额（美元）
- customer_type：新客户/老客户
- continent 为客户所在大洲

回答要求：
1. 基于提供的数据客观分析，不编造数据
2. 给出具体数字和百分比
3. 建议按优先级排列，具有可操作性
4. 如果数据不足以得出结论，明确说明
5. 使用中文回答，专业且易懂
```

### 6.2 分析类型对应提示词

| 分析类型 | 提示词 |
|---------|--------|
| 订单总结 | "请基于以下订单数据，做一份全面的业务总结分析，包括：总体概况、大洲分布洞察、客户等级分析、月度趋势变化，并给出 actionable 建议。" |
| 客户洞察 | "请分析客户的画像和购买行为，包括：客户价值评估、购买偏好分析、复购规律、潜在需求预测，并给出具体的跟进建议。" |
| 趋势预测 | "请基于以下季度趋势、产品排行和大洲增长数据，预测下一季度可能的业务走向，指出增长机会和风险区域，给出具体建议。" |

---

## 七、风险与注意事项

### 7.1 数据安全

| 风险 | 应对 |
|------|------|
| 客户数据发送给第三方 API | 提示词中不发送敏感联系方式（邮箱/电话），仅发送业务分析所需数据 |
| API Key 泄露 | Key 仅存后端环境变量，前端无法接触 |
| 数据量过大超 token 限制 | 后端做数据截断/摘要，控制 prompt 长度 |

### 7.2 服务稳定性

| 风险 | 应对 |
|------|------|
| 大模型 API 不可用 | 前端做好错误提示，后端设置超时（30s） |
| 流式响应中断 | 前端监听连接关闭，显示"回复中断"提示 |
| 高并发导致 API 限流 | 后端实现请求队列，前端加防抖 |

### 7.3 成本控制

| 场景 | Token 消耗 | 应对 |
|------|-----------|------|
| 一次对话（含上下文） | ~2000-5000 tokens | GLM-4-Flash 免费，暂不担心 |
| 一次全量分析 | ~3000-8000 tokens | 控制传入数据量，按需查询 |
| 每日 100 次对话 | ~500K tokens | GLM-4-Flash 免费额度充足 |

---

## 八、测试验收清单

### 功能测试

- [ ] AI 助手页面正常加载，侧边栏图标和文字正确
- [ ] 输入问题后 AI 流式回复正常显示
- [ ] 从客户页点击"AI分析"跳转到 AI 助手，上下文正确
- [ ] 从订单详情点击"AI分析"跳转到 AI 助手，上下文正确
- [ ] "订单总结"快捷分析返回有意义的分析报告
- [ ] "客户洞察"快捷分析返回客户画像
- [ ] "趋势预测"快捷分析返回趋势预测
- [ ] AI 不编造数据，回答基于实际查询结果
- [ ] 未登录时 AI 接口返回 401

### 体验测试

- [ ] AI 回复的 Markdown 格式正确渲染
- [ ] 流式回复打字机效果流畅
- [ ] 网络错误时前端有友好提示
- [ ] AI 助手页面在手机端可正常使用
- [ ] 侧边栏折叠时 AI 助手图标正常显示

### 安全测试

- [ ] 前端无法直接获取 AI API Key
- [ ] 客户敏感信息（邮箱/电话）不发送给 AI
- [ ] AI 无法执行数据库写操作
- [ ] 未认证请求被正确拦截

---

## 九、快速开始（MVP 验证步骤）

```bash
# 1. 注册智谱 AI 开放平台，获取 API Key
#    https://open.bigmodel.cn/

# 2. 配置环境变量
cd server
cp ../.env.example ../.env
# 编辑 .env，添加：
# AI_API_KEY=your_glm4flash_key
# AI_API_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions
# AI_MODEL=glm-4-flash

# 3. 安装依赖
npm install openai

# 4. 创建 ai.js 路由文件（见上方代码）

# 5. 修改 server/index.js 注册路由

# 6. 前端新增页面和路由

# 7. 启动开发服务器
cd ..
start-dev.bat
```

---

## 十、文件改动汇总

### 后端改动

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/routes/ai.js` | **新增** | AI 接口路由（chat + analyze） |
| `server/index.js` | 修改 | 注册 `/api/ai` 路由 |
| `server/db/database.js` | 修改 | 新增 `ai_conversations` 和 `ai_messages` 建表 |
| `server/package.json` | 修改 | 新增 `openai` 依赖 |
| `.env.example` | 修改 | 新增 AI 相关环境变量 |

### 前端改动

| 文件 | 操作 | 说明 |
|------|------|------|
| `client/src/pages/AIAssistant/index.jsx` | **新增** | AI 助手主页面 |
| `client/src/api/ai.js` | **新增** | AI 接口封装（含 SSE 解析） |
| `client/src/App.jsx` | 修改 | 新增菜单项 + 路由 |
| `client/src/pages/Customers/index.jsx` | 修改 | 新增"AI分析"按钮 |
| `client/src/pages/Orders/index.jsx` | 修改 | 新增"让AI分析此订单"按钮 |

---

> **结论**：方案完全可执行。核心工作量在后端数据查询 + prompt 组装（约 1 天），前端聊天 UI（约 1 天），联调优化（约 1 天）。MVP 版本 3 天可完成。

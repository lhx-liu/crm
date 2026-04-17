const express = require('express');
const router = express.Router();
const { getPool } = require('../db/database');
const OpenAI = require('openai');

// 初始化 AI 客户端（智谱 GLM 兼容 OpenAI 协议）
const aiClient = new OpenAI({
  apiKey: process.env.AI_API_KEY,
  baseURL: process.env.AI_API_URL || 'https://open.bigmodel.cn/api/paas/v4',
});

const AI_MODEL = process.env.AI_MODEL || 'glm-4-flash';
const AI_MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS) || 4096;
const AI_TEMPERATURE = parseFloat(process.env.AI_TEMPERATURE) || 0.7;

// ==================== 系统提示词 ====================

const SYSTEM_PROMPT = `你是 CRM 系统的 AI 助手，专门帮助用户分析外贸业务数据。

你的能力范围：
1. 总结订单数据，提供业务洞察和趋势分析
2. 分析客户画像、购买行为和偏好
3. 预测趋势，给出业务建议
4. 回答关于客户、订单、产品的问题

数据说明：
- 客户等级：A级（最高/核心客户）、B级（中等）、C级（一般）
- payment_amount 为到款金额（美元）
- customer_type：新客户/老客户
- continent 为客户所在大洲
- level 为客户等级

⚠️ 核心规则：
1. 系统会在消息中附带 [系统自动查询的相关业务数据]，你必须严格基于这些数据回答
2. 回答时必须引用具体数字、客户名称、产品名称等，不要给出空洞的建议
3. 如果用户问"A级客户有哪些"，你必须列出数据中每个A级客户的公司名、国家、订单数、金额
4. 如果用户问"产品"，你必须列出数据中具体的产品名称和销量/金额
5. 不编造任何不在数据中的信息
6. 使用中文回答，专业且易懂
7. 适当使用 Markdown 格式，让回答更易读（标题、列表、加粗、表格等）
8. 如果附带的数据不足以回答，明确说明"当前查询到的数据中未包含..."，不要猜
9. 数据中的敏感信息已脱敏（如 z***@xxx.com、138****5678），你在回答中也必须保持脱敏，不要猜测或还原原始数据`;

// ==================== 数据脱敏 ====================

// 需要脱敏的字段名（不区分大小写）
const SENSITIVE_FIELDS = new Set([
  'email', 'mail', 'phone', 'tel', 'mobile', 'telephone',
  'address', 'addr', 'street', 'zip', 'zipcode', 'postal',
  'id_card', 'idcard', 'id_number', 'passport', 'ssn',
  'bank_account', 'bank_card', 'credit_card',
  'password', 'secret', 'token', 'api_key',
  'wechat', 'whatsapp', 'linkedin', 'facebook',
]);

/**
 * 脱敏单个值
 * - 邮箱：zhang@example.com → z***@example.com
 * - 手机号：13812345678 → 138****5678
 * - 其他敏感字段：取前1后1，中间用 *** 替代
 */
function maskValue(value) {
  if (value == null) return value;
  const str = String(value);

  // 邮箱
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(str)) {
    const [local, domain] = str.split('@');
    const masked = local.length <= 1 ? '***' : local[0] + '***';
    return masked + '@' + domain;
  }

  // 手机号（中国/国际格式）
  if (/^(\+?\d{1,3}[-\s]?)?\d{7,15}$/.test(str.replace(/[\s-]/g, ''))) {
    const digits = str.replace(/[\s-]/g, '');
    if (digits.length >= 7) {
      const start = digits.slice(0, 3);
      const end = digits.slice(-4);
      return start + '****' + end;
    }
  }

  // 通用：长度>2时取首尾，中间 ***
  if (str.length > 2) {
    return str[0] + '***' + str.slice(-1);
  }
  return '***';
}

/**
 * 递归脱敏对象/数组中的敏感字段
 * 对象中的敏感字段名匹配时脱敏值，数组则递归处理每个元素
 */
function maskSensitive(obj) {
  if (obj == null) return obj;
  if (Array.isArray(obj)) return obj.map(item => maskSensitive(item));
  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const keyLower = key.toLowerCase();
      // 判断字段名是否敏感（包含或等于敏感关键词）
      const isSensitive = [...SENSITIVE_FIELDS].some(s => keyLower === s || keyLower.includes(s + '_') || keyLower.includes(s));
      if (isSensitive && value != null && value !== '') {
        result[key] = maskValue(value);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = maskSensitive(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  return obj;
}

// ==================== 智能数据查询 ====================

/**
 * 根据用户问题关键词，智能查询相关业务数据
 * 返回与问题最相关的数据库结果，注入到 prompt 中
 */
async function getSmartContext(message) {
  const db = getPool();
  const parts = [];
  const msg = message.toLowerCase();

  // ---- 客户相关 ----
  // 匹配：A级/B级/C级客户、客户列表、哪些客户、客户有哪些
  const levelMatch = msg.match(/([abc])级客户/);
  if (levelMatch || /客户有|哪些客户|客户列表|客户概况|所有客户/.test(msg)) {
    const level = levelMatch ? levelMatch[1].toUpperCase() : null;
    let sql, params;
    if (level) {
      sql = `SELECT c.id, c.company_name, c.level, c.country, c.continent, c.source, c.opportunity,
              COUNT(o.id) as order_count, COALESCE(SUM(o.payment_amount), 0) as total_payment
             FROM customers c LEFT JOIN orders o ON c.id = o.customer_id
             WHERE c.level = ? GROUP BY c.id ORDER BY total_payment DESC`;
      params = [level];
    } else {
      sql = `SELECT c.id, c.company_name, c.level, c.country, c.continent, c.source, c.opportunity,
              COUNT(o.id) as order_count, COALESCE(SUM(o.payment_amount), 0) as total_payment
             FROM customers c LEFT JOIN orders o ON c.id = o.customer_id
             GROUP BY c.id ORDER BY total_payment DESC LIMIT 30`;
      params = [];
    }
    const [customers] = await db.execute(sql, params);
    parts.push({ label: '客户数据（含订单统计）', data: customers });
  }

  // 匹配：某客户购买产品/偏好、客户的产品
  if (/购买.*产品|产品.*偏好|主要产品|买了.*什么|买过/.test(msg) && !levelMatch) {
    const [products] = await db.execute(`
      SELECT c.company_name, c.level, pc.name as product_category, pm.model,
             SUM(oi.quantity) as total_qty, SUM(oi.quantity * oi.unit_price) as total_amount
      FROM order_items oi
      LEFT JOIN product_models pm ON oi.model_id = pm.id
      LEFT JOIN product_categories pc ON pm.category_id = pc.id
      LEFT JOIN orders o ON oi.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      GROUP BY c.id, pc.id ORDER BY total_amount DESC LIMIT 30
    `);
    parts.push({ label: '客户-产品购买明细', data: products });
  }

  // A级客户产品
  if (levelMatch) {
    const level = levelMatch[1].toUpperCase();
    const [products] = await db.execute(`
      SELECT c.company_name, pc.name as product_category, pm.model,
             SUM(oi.quantity) as total_qty, SUM(oi.quantity * oi.unit_price) as total_amount
      FROM order_items oi
      LEFT JOIN product_models pm ON oi.model_id = pm.id
      LEFT JOIN product_categories pc ON pm.category_id = pc.id
      LEFT JOIN orders o ON oi.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE c.level = ?
      GROUP BY c.id, pc.id ORDER BY total_amount DESC LIMIT 30
    `, [level]);
    parts.push({ label: `${level}级客户-产品购买明细`, data: products });
  }

  // ---- 订单相关 ----
  // 匹配：订单/今年订单/最近订单/订单总结/订单情况
  if (/订单|order/.test(msg) && !/客户/.test(msg)) {
    // 总体统计
    const [[stats]] = await db.execute(`
      SELECT COUNT(*) as total_orders, COALESCE(SUM(payment_amount), 0) as total_payment,
             COALESCE(AVG(payment_amount), 0) as avg_payment, COUNT(DISTINCT customer_id) as total_customers
      FROM orders
    `);
    parts.push({ label: '订单总体统计', data: stats });

    // 月度趋势
    if (/趋势|总结|情况|分析|今年|最近/.test(msg)) {
      const [monthly] = await db.execute(`
        SELECT DATE_FORMAT(order_date, '%Y-%m') as month, COUNT(*) as count, COALESCE(SUM(payment_amount), 0) as amount
        FROM orders WHERE order_date IS NOT NULL GROUP BY month ORDER BY month DESC LIMIT 12
      `);
      parts.push({ label: '月度订单趋势', data: monthly });
    }

    // 大洲分布
    if (/大洲|洲|地区|区域|分布/.test(msg) || /趋势|总结|分析/.test(msg)) {
      const [byContinent] = await db.execute(`
        SELECT c.continent, COUNT(*) as order_count, COALESCE(SUM(o.payment_amount), 0) as total_amount
        FROM orders o LEFT JOIN customers c ON o.customer_id = c.id
        GROUP BY c.continent ORDER BY total_amount DESC
      `);
      parts.push({ label: '按大洲分布', data: byContinent });
    }
  }

  // ---- 产品相关 ----
  // 匹配：产品/热门产品/热销/产品排行/产品组合
  if (/产品|product|热销|热门|排行/.test(msg) && !/客户.*产品/.test(msg)) {
    const [products] = await db.execute(`
      SELECT pc.name as category, pm.model,
             SUM(oi.quantity) as total_qty, SUM(oi.quantity * oi.unit_price) as total_amount,
             COUNT(DISTINCT o.customer_id) as buyer_count
      FROM order_items oi
      LEFT JOIN product_models pm ON oi.model_id = pm.id
      LEFT JOIN product_categories pc ON pm.category_id = pc.id
      LEFT JOIN orders o ON oi.order_id = o.id
      GROUP BY pc.id, pm.id ORDER BY total_amount DESC LIMIT 20
    `);
    parts.push({ label: '产品销售排行', data: products });

    // 产品组合
    if (/组合|搭配|一起/.test(msg)) {
      const [combos] = await db.execute(`
        SELECT o.id as order_id, GROUP_CONCAT(DISTINCT pc.name ORDER BY pc.name SEPARATOR ' + ') as product_combo,
               o.payment_amount
        FROM order_items oi
        LEFT JOIN product_models pm ON oi.model_id = pm.id
        LEFT JOIN product_categories pc ON pm.category_id = pc.id
        LEFT JOIN orders o ON oi.order_id = o.id
        GROUP BY o.id HAVING COUNT(DISTINCT pc.id) > 1
        ORDER BY o.payment_amount DESC LIMIT 15
      `);
      parts.push({ label: '产品组合（多品类订单）', data: combos });
    }
  }

  // ---- 趋势/预测 ----
  if (/趋势|预测|增长|下一.*季度|未来/.test(msg)) {
    const [quarterly] = await db.execute(`
      SELECT CONCAT(YEAR(order_date), '-Q', QUARTER(order_date)) as quarter,
             COUNT(*) as order_count, COALESCE(SUM(payment_amount), 0) as total_amount
      FROM orders WHERE order_date IS NOT NULL
      GROUP BY quarter ORDER BY quarter DESC LIMIT 8
    `);
    parts.push({ label: '季度趋势数据', data: quarterly });

    const [newVsOld] = await db.execute(`
      SELECT customer_type, COUNT(*) as count, COALESCE(SUM(payment_amount), 0) as amount
      FROM orders WHERE customer_type IS NOT NULL GROUP BY customer_type
    `);
    parts.push({ label: '新老客户对比', data: newVsOld });
  }

  // ---- 大洲/地区 ----
  if (/大洲|洲|地区|区域/.test(msg) && !/订单/.test(msg)) {
    const [continentData] = await db.execute(`
      SELECT c.continent, COUNT(DISTINCT c.id) as customer_count,
             COUNT(o.id) as order_count, COALESCE(SUM(o.payment_amount), 0) as total_amount
      FROM customers c LEFT JOIN orders o ON c.id = o.customer_id
      GROUP BY c.continent ORDER BY total_amount DESC
    `);
    parts.push({ label: '大洲业务数据', data: continentData });
  }

  // ---- 新老客户 ----
  if (/新客户|老客户|复购|留存/.test(msg)) {
    const [data] = await db.execute(`
      SELECT customer_type, COUNT(*) as order_count, COALESCE(SUM(payment_amount), 0) as total_amount
      FROM orders WHERE customer_type IS NOT NULL GROUP BY customer_type
    `);
    parts.push({ label: '新老客户统计', data: data });

    if (/复购|留存/.test(msg)) {
      const [repeat] = await db.execute(`
        SELECT c.company_name, c.level, COUNT(o.id) as order_count,
               MIN(o.order_date) as first_order, MAX(o.order_date) as last_order,
               COALESCE(SUM(o.payment_amount), 0) as total_payment
        FROM customers c LEFT JOIN orders o ON c.id = o.customer_id
        GROUP BY c.id HAVING order_count > 1 ORDER BY order_count DESC LIMIT 20
      `);
      parts.push({ label: '复购客户列表', data: repeat });
    }
  }

  return parts;
}

// ==================== 数据查询函数 ====================

/**
 * 获取客户上下文数据
 */
async function getCustomerContext(customerId) {
  const db = getPool();
  const [[customer]] = await db.execute('SELECT * FROM customers WHERE id = ?', [customerId]);
  if (!customer) return null;

  const [contacts] = await db.execute('SELECT name, phone FROM contacts WHERE customer_id = ?', [customerId]);

  const [orders] = await db.execute(`
    SELECT o.id, o.order_date, o.payment_amount, o.customer_type,
      (SELECT GROUP_CONCAT(CONCAT(pc.name, '(', pm.model, ') x', oi.quantity) SEPARATOR ', ')
       FROM order_items oi 
       LEFT JOIN product_models pm ON oi.model_id = pm.id
       LEFT JOIN product_categories pc ON pm.category_id = pc.id
       WHERE oi.order_id = o.id) as products
    FROM orders o WHERE o.customer_id = ? ORDER BY o.order_date DESC
  `, [customerId]);

  const [[stats]] = await db.execute(`
    SELECT COUNT(*) as total_orders, COALESCE(SUM(payment_amount), 0) as total_payment
    FROM orders WHERE customer_id = ?
  `, [customerId]);

  return { customer, contacts, orders, stats };
}

/**
 * 获取订单上下文数据
 */
async function getOrderContext(orderId) {
  const db = getPool();
  const [orders] = await db.execute(`
    SELECT o.*, c.company_name, c.level, c.country, c.continent, c.source, c.opportunity
    FROM orders o LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.id = ?
  `, [orderId]);
  if (!orders.length) return null;

  const [items] = await db.execute(`
    SELECT oi.quantity, oi.unit_price, pm.model, pc.name as category_name
    FROM order_items oi
    LEFT JOIN product_models pm ON oi.model_id = pm.id
    LEFT JOIN product_categories pc ON pm.category_id = pc.id
    WHERE oi.order_id = ?
  `, [orderId]);

  const [contacts] = await db.execute(`
    SELECT ct.name, ct.phone FROM contacts ct
    LEFT JOIN orders o ON o.customer_id = ct.customer_id
    WHERE o.id = ? LIMIT 3
  `, [orderId]);

  return { order: orders[0], items, contacts };
}

/**
 * 获取订单汇总数据
 */
async function getOrderSummary() {
  const db = getPool();
  const [[stats]] = await db.execute(`
    SELECT 
      COUNT(*) as total_orders,
      COALESCE(SUM(payment_amount), 0) as total_payment,
      COALESCE(AVG(payment_amount), 0) as avg_payment,
      COUNT(DISTINCT customer_id) as total_customers
    FROM orders
  `);

  const [byContinent] = await db.execute(`
    SELECT c.continent, COUNT(*) as order_count, COALESCE(SUM(o.payment_amount), 0) as total_amount
    FROM orders o LEFT JOIN customers c ON o.customer_id = c.id
    GROUP BY c.continent ORDER BY total_amount DESC
  `);

  const [byLevel] = await db.execute(`
    SELECT c.level, COUNT(*) as order_count, COALESCE(SUM(o.payment_amount), 0) as total_amount
    FROM orders o LEFT JOIN customers c ON o.customer_id = c.id
    WHERE c.level IS NOT NULL
    GROUP BY c.level
  `);

  const [monthly] = await db.execute(`
    SELECT DATE_FORMAT(order_date, '%Y-%m') as month, 
      COUNT(*) as count, COALESCE(SUM(payment_amount), 0) as amount
    FROM orders WHERE order_date IS NOT NULL
    GROUP BY month ORDER BY month DESC LIMIT 12
  `);

  const [topCustomers] = await db.execute(`
    SELECT c.company_name, c.level, c.country, 
      COUNT(o.id) as order_count, COALESCE(SUM(o.payment_amount), 0) as total_payment
    FROM orders o LEFT JOIN customers c ON o.customer_id = c.id
    GROUP BY c.id ORDER BY total_payment DESC LIMIT 10
  `);

  return { stats, byContinent, byLevel, monthly, topCustomers };
}

/**
 * 获取客户洞察数据
 */
async function getCustomerInsight(customerId) {
  const db = getPool();
  const customerCtx = await getCustomerContext(customerId);
  if (!customerCtx) return null;

  const [productPreference] = await db.execute(`
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
      totalDiff += (new Date(dates[i].order_date) - new Date(dates[i - 1].order_date)) / (1000 * 60 * 60 * 24);
    }
    avgDays = Math.round(totalDiff / (dates.length - 1));
  }

  return { ...customerCtx, productPreference, avgRepurchaseDays: avgDays };
}

/**
 * 获取趋势预测数据
 */
async function getTrendPrediction() {
  const db = getPool();
  const [quarterly] = await db.execute(`
    SELECT CONCAT(YEAR(order_date), '-Q', QUARTER(order_date)) as quarter,
      COUNT(*) as order_count, COALESCE(SUM(payment_amount), 0) as total_amount
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
      COALESCE(SUM(CASE WHEN o.order_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) THEN o.payment_amount ELSE 0 END), 0) as recent_6m,
      COALESCE(SUM(CASE WHEN o.order_date < DATE_SUB(CURDATE(), INTERVAL 6 MONTH) AND o.order_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) THEN o.payment_amount ELSE 0 END), 0) as prev_6m
    FROM orders o LEFT JOIN customers c ON o.customer_id = c.id
    GROUP BY c.continent
  `);

  const [newVsOld] = await db.execute(`
    SELECT customer_type, COUNT(*) as count, COALESCE(SUM(payment_amount), 0) as amount
    FROM orders WHERE customer_type IS NOT NULL
    GROUP BY customer_type
  `);

  return { quarterly, topProducts, continentGrowth, newVsOld };
}

// ==================== AI 调用核心函数 ====================

async function callAI(messages, stream = true) {
  return await aiClient.chat.completions.create({
    model: AI_MODEL,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    max_tokens: AI_MAX_TOKENS,
    temperature: AI_TEMPERATURE,
    stream,
  });
}

// ==================== SSE 流式响应辅助 ====================

function setupSSEResponse(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Nginx 不缓冲
}

async function streamResponse(res, stream) {
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }
  res.write('data: [DONE]\n\n');
  res.end();
}

function handleAIError(err, res) {
  console.error('AI Error:', err.message);
  if (!res.headersSent) {
    res.status(500).json({ success: false, message: 'AI 服务异常：' + err.message });
  } else {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
}

// ==================== API 路由 ====================

/**
 * POST /api/ai/chat - 通用对话（流式 SSE）
 * Body: { message, context?: { customer_id?, order_id? }, history?: [{role, content}] }
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, context = {}, history = [] } = req.body;
    if (!message) return res.status(400).json({ success: false, message: '消息不能为空' });

    // 根据上下文获取相关数据
    let contextData = '';

    // 1. 显式上下文（从客户/订单详情页跳转过来的）
    if (context.customer_id) {
      const data = await getCustomerContext(context.customer_id);
      if (data) {
        const safeData = maskSensitive({ ...data, contacts: data.contacts.map(c => ({ name: c.name })) });
        contextData += `\n\n[当前客户上下文数据]\n${JSON.stringify(safeData, null, 2)}`;
      }
    }
    if (context.order_id) {
      const data = await getOrderContext(context.order_id);
      if (data) {
        contextData += `\n\n[当前订单上下文数据]\n${JSON.stringify(maskSensitive(data), null, 2)}`;
      }
    }

    // 2. 智能数据注入 — 根据问题关键词自动查询业务数据
    const smartData = await getSmartContext(message);
    if (smartData.length > 0) {
      contextData += '\n\n[系统自动查询的相关业务数据]';
      for (const part of smartData) {
        contextData += `\n\n## ${part.label}\n${JSON.stringify(maskSensitive(part.data), null, 2)}`;
      }
      contextData += '\n\n请严格基于以上数据回答用户的问题，给出具体的数字、名称和分析，不要编造数据。';
    }

    const messages = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message + (contextData ? contextData : '') }
    ];

    setupSSEResponse(res);
    const stream = await callAI(messages, true);
    await streamResponse(res, stream);
  } catch (err) {
    handleAIError(err, res);
  }
});

/**
 * POST /api/ai/analyze - 数据分析（流式 SSE）
 * Body: { type: "order_summary" | "customer_insight" | "trend_predict", params?: { customer_id?, date_range? } }
 */
router.post('/analyze', async (req, res) => {
  try {
    const { type, params = {} } = req.body;

    let data, prompt;

    switch (type) {
      case 'order_summary':
        data = await getOrderSummary();
        prompt = '请基于以下订单数据，做一份全面的业务总结分析。包括：\n1. 总体概况（总订单数、总金额、客户数等）\n2. 大洲分布洞察\n3. 客户等级分析\n4. 月度趋势变化\n5. Top 10 客户贡献\n6. 具体的业务改进建议（按优先级排列）';
        break;

      case 'customer_insight':
        if (!params.customer_id) {
          return res.status(400).json({ success: false, message: '客户洞察需要提供 customer_id' });
        }
        data = await getCustomerInsight(params.customer_id);
        if (!data) return res.status(404).json({ success: false, message: '客户不存在' });
        prompt = `请深入分析客户 "${data.customer.company_name}" 的画像和购买行为。包括：\n1. 客户基本信息概览\n2. 客户价值评估（等级、贡献金额）\n3. 购买偏好分析（偏好产品、购买模式）\n4. 复购规律（平均间隔${data.avgRepurchaseDays ? data.avgRepurchaseDays + '天' : '数据不足'}）\n5. 潜在需求预测\n6. 具体的跟进建议（下一步行动）`;
        break;

      case 'trend_predict':
        data = await getTrendPrediction();
        prompt = '请基于以下季度趋势、产品排行和大洲增长数据，做趋势预测分析。包括：\n1. 季度趋势分析\n2. 热门产品排行及变化\n3. 各大洲增长对比（近6月 vs 前6月）\n4. 新老客户比例分析\n5. 下一季度预测\n6. 具体的业务建议（增长机会和风险区域）';
        break;

      default:
        return res.status(400).json({ success: false, message: '不支持的分析类型，可选：order_summary / customer_insight / trend_predict' });
    }

    const messages = [
      { role: 'user', content: `${prompt}\n\n[数据]\n${JSON.stringify(maskSensitive(data), null, 2)}` }
    ];

    setupSSEResponse(res);
    const stream = await callAI(messages, true);
    await streamResponse(res, stream);
  } catch (err) {
    handleAIError(err, res);
  }
});

module.exports = router;

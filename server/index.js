require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cron = require('node-cron');
const { initDb, getPool } = require('./db/database');
const { performBackup } = require('./db/backup');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = 3001;

// I2: CORS 限制 — 生产环境只允许已知前端域名
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// M5: 请求日志中间件（生产环境用 combined，开发环境用 dev）
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// C6: 简易输入净化 — 去除字符串首尾空格，转义 HTML 特殊字符
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  next();
});

function sanitizeObject(obj) {
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string') {
      obj[key] = sanitizeHtml(val.trim());
    } else if (Array.isArray(val)) {
      for (const item of val) {
        if (item && typeof item === 'object') sanitizeObject(item);
        else if (typeof item === 'string') obj[key] = sanitizeHtml(item.trim());
      }
    } else if (val && typeof val === 'object') {
      sanitizeObject(val);
    }
  }
}

function sanitizeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// 公开路由（不需要登录）
app.use('/api/auth', require('./routes/auth'));
app.get('/api/health', async (req, res) => {
  try {
    const db = getPool();
    await db.execute('SELECT 1');
    res.json({ success: true, message: 'CRM Server is running!', db: 'connected' });
  } catch (err) {
    res.status(503).json({ success: false, message: 'Database unavailable', db: 'disconnected' });
  }
});

// 以下路由需要登录后才能访问
app.use('/api/products', authMiddleware, require('./routes/products'));
app.use('/api/customers', authMiddleware, require('./routes/customers'));
app.use('/api/orders', authMiddleware, require('./routes/orders'));
app.use('/api/statistics', authMiddleware, require('./routes/statistics'));
app.use('/api/analysis', authMiddleware, require('./routes/analysis'));
app.use('/api/ai', authMiddleware, require('./routes/ai'));

// I1: 全局错误处理兜底
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const msg = process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message;
  res.status(500).json({ success: false, message: msg });
});

// 异步启动
async function start() {
  try {
    await initDb();
    console.log('✅ 数据库初始化完成');
  } catch (err) {
    console.error('DB init failed:', err);
    process.exit(1);
  }

  // 设置定时备份任务 - 每天凌晨2点执行
  cron.schedule('0 2 * * *', async () => {
    console.log('\n🔄 执行定时备份任务...');
    await performBackup();
  }, {
    scheduled: true,
    timezone: "Asia/Shanghai"
  });
  console.log('✅ 定时备份已启用: 每天凌晨2点自动备份');

  app.listen(PORT, () => {
    console.log(`CRM Backend started: http://localhost:${PORT}`);
  });
}

start();

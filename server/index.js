const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { initDb } = require('./db/database');
const { performBackup } = require('./db/backup');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 公开路由（不需要登录）
app.use('/api/auth', require('./routes/auth'));
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'CRM Server is running!' });
});

// 以下路由需要登录后才能访问
app.use('/api/products', authMiddleware, require('./routes/products'));
app.use('/api/customers', authMiddleware, require('./routes/customers'));
app.use('/api/orders', authMiddleware, require('./routes/orders'));
app.use('/api/statistics', authMiddleware, require('./routes/statistics'));
app.use('/api/analysis', authMiddleware, require('./routes/analysis'));

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

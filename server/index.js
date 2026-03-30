const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { getDb } = require('./db/database');
const { performBackup } = require('./db/backup');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use('/api/products', require('./routes/products'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/statistics', require('./routes/statistics'));
app.use('/api/analysis', require('./routes/analysis'));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'CRM Server is running!' });
});

// 启动时初始化数据库
getDb().then(() => {
  // 设置定时备份任务 - 每天凌晨2点执行
  cron.schedule('0 2 * * *', () => {
    console.log('\n🔄 执行定时备份任务...');
    performBackup();
  }, {
    scheduled: true,
    timezone: "Asia/Shanghai"
  });

  console.log('✅ 定时备份已启用: 每天凌晨2点自动备份');

  app.listen(PORT, () => {
    console.log(`CRM Backend started: http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});

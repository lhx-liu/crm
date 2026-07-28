const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// MySQL 连接配置（必须通过环境变量提供，无默认密码）
const DB_CONFIG = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'crm_user',
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE || 'crm_db',
  waitForConnections: true,
  connectionLimit: 30,
  queueLimit: 100,
  charset: 'utf8mb4',
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000,
};

let pool = null;

/**
 * 获取连接池（同步）
 */
function getPool() {
  if (!pool) {
    throw new Error('数据库未初始化，请先调用 initDb()');
  }
  return pool;
}

/**
 * 初始化数据库（异步）
 * 创建连接池 + 建表 + 创建默认管理员
 */
async function initDb() {
  if (pool) return pool;

  // 先创建数据库（如果不存在）
  const rootConfig = { ...DB_CONFIG };
  delete rootConfig.database;
  const rootConn = await mysql.createConnection(rootConfig);
  await rootConn.execute(
    `CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await rootConn.end();

  // 创建连接池
  pool = mysql.createPool(DB_CONFIG);

  // M9: 监听连接池错误，防止未处理的连接错误导致进程崩溃
  pool.on('connection', (connection) => {
    connection.on('error', (err) => {
      console.error('⚠️ MySQL 连接错误:', err.message);
    });
  });

  // 验证连接池可用
  try {
    const conn = await pool.getConnection();
    conn.release();
  } catch (err) {
    console.error('❌ 数据库连接池初始化失败:', err.message);
    throw err;
  }

  // 建表
  await createTables();

  // 创建默认管理员
  await createDefaultAdmin();

  console.log('✅ MySQL 数据库初始化完成');
  return pool;
}

async function createTables() {
  const conn = await pool.getConnection();
  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS product_categories (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS product_models (
        id INT PRIMARY KEY AUTO_INCREMENT,
        category_id INT NOT NULL,
        model VARCHAR(255) NOT NULL,
        price DOUBLE NOT NULL DEFAULT 0,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES product_categories(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        company_name VARCHAR(255) NOT NULL,
        lead_no VARCHAR(255) NOT NULL DEFAULT '',
        level ENUM('A','B','C'),
        opportunity TEXT,
        background TEXT,
        country VARCHAR(255),
        nature VARCHAR(255),
        source VARCHAR(255),
        continent VARCHAR(255),
        potential_inquiry TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_id INT NOT NULL,
        name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_id INT NOT NULL,
        customer_type ENUM('新客户','老客户'),
        order_date VARCHAR(255),
        payment_date VARCHAR(255),
        purchase_order_no VARCHAR(255),
        lead_no VARCHAR(255),
        payment_amount DOUBLE DEFAULT 0,
        invoice_amount DOUBLE DEFAULT 0,
        exw_value DOUBLE DEFAULT 0,
        total_amount DOUBLE DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        order_id INT NOT NULL,
        model_id INT NOT NULL,
        quantity DOUBLE DEFAULT 1,
        unit_price DOUBLE DEFAULT 0,
        amount DOUBLE DEFAULT 0 COMMENT '实际金额(可手动修改)',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (model_id) REFERENCES product_models(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        must_change_password TINYINT DEFAULT 0,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // AI 对话会话表
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        title VARCHAR(255),
        context_type VARCHAR(50),
        context_id INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // AI 对话消息表
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ai_messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        conversation_id INT NOT NULL,
        role ENUM('user', 'assistant', 'system') NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

	// 创建索引（使用 IF NOT EXISTS 兼容重复执行）
    const indexes = [
      'CREATE INDEX idx_contacts_customer_id ON contacts(customer_id)',
      'CREATE INDEX idx_order_items_order_id ON order_items(order_id)',
      'CREATE INDEX idx_order_items_model_id ON order_items(model_id)',
      'CREATE INDEX idx_orders_customer_id ON orders(customer_id)',
      'CREATE INDEX idx_orders_order_date ON orders(order_date)',
      'CREATE INDEX idx_product_models_category_id ON product_models(category_id)',
    ];
    for (const idxSql of indexes) {
      try { await conn.execute(idxSql); } catch (e) { /* 索引已存在则忽略 */ }
    }

    // 兼容旧表：添加 lead_no 列（如果不存在）
    try {
      const [cols] = await conn.execute("SHOW COLUMNS FROM customers LIKE 'lead_no'");
      if (cols.length === 0) {
        await conn.execute("ALTER TABLE customers ADD COLUMN lead_no VARCHAR(255) NOT NULL DEFAULT '' AFTER company_name");
      }
    } catch (e) { /* 忽略 */ }

    // 兼容旧表：添加 order_items.amount 列（如果不存在）+ 回填老数据
    try {
      const [cols] = await conn.execute("SHOW COLUMNS FROM order_items LIKE 'amount'");
      if (cols.length === 0) {
        await conn.execute("ALTER TABLE order_items ADD COLUMN amount DOUBLE DEFAULT 0 COMMENT '实际金额(可手动修改)'");
      }
      // 回填老数据：amount = quantity * unit_price（对 amount=0 的行执行，避免覆盖已修改的值）
      await conn.execute("UPDATE order_items SET amount = IFNULL(quantity, 0) * IFNULL(unit_price, 0) WHERE amount = 0");
    } catch (e) { /* 忽略 */ }

  } finally {
    conn.release();
  }
}

async function createDefaultAdmin() {
  const [rows] = await pool.execute("SELECT COUNT(*) as cnt FROM users WHERE username = 'admin'");
  if (rows[0].cnt === 0) {
    // M4: 默认密码从环境变量读取，未设置时生成随机密码
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || generateRandomPassword(12);
    const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
    await pool.execute(
      "INSERT INTO users (username, password, role, must_change_password) VALUES ('admin', ?, 'admin', 1)",
      [hashedPassword]
    );
    console.log('✅ 已创建默认管理员账户: admin / ' + defaultPassword);
    console.log('⚠️  请登录后立即修改默认密码！');
    if (!process.env.ADMIN_DEFAULT_PASSWORD) {
      console.log('💡 提示: 可通过 ADMIN_DEFAULT_PASSWORD 环境变量指定初始密码，否则每次随机生成');
    }
  }
}

function generateRandomPassword(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let pwd = '';
  for (let i = 0; i < length; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
}

module.exports = { getPool, initDb };

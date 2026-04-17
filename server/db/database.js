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
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+08:00'
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

  } finally {
    conn.release();
  }
}

async function createDefaultAdmin() {
  const [rows] = await pool.execute("SELECT COUNT(*) as cnt FROM users WHERE username = 'admin'");
  if (rows[0].cnt === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    await pool.execute(
      "INSERT INTO users (username, password, role, must_change_password) VALUES ('admin', ?, 'admin', 1)",
      [hashedPassword]
    );
    console.log('✅ 已创建默认管理员账户: admin / admin123');
    console.log('⚠️  请登录后立即修改默认密码！');
  }
}

module.exports = { getPool, initDb };

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getPool } = require('../db/database');
const { generateToken, authMiddleware } = require('../middleware/auth');

/**
 * 简易登录速率限制（内存存储，单进程有效）
 */
const loginAttempts = new Map();
const LOGIN_WINDOW = 15 * 60 * 1000; // 15分钟
const LOGIN_MAX_ATTEMPTS = 5;

function checkLoginRateLimit(username) {
  const now = Date.now();
  const record = loginAttempts.get(username);
  if (!record || now - record.firstAttempt > LOGIN_WINDOW) {
    loginAttempts.set(username, { count: 1, firstAttempt: now });
    return true;
  }
  if (record.count >= LOGIN_MAX_ATTEMPTS) {
    return false;
  }
  record.count++;
  return true;
}

/**
 * 登录
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '请输入用户名和密码' });
    }

    // I10: 登录速率限制
    if (!checkLoginRateLimit(username)) {
      return res.status(429).json({ success: false, message: '登录尝试次数过多，请15分钟后再试' });
    }

    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    // 登录成功，清除速率限制计数
    loginAttempts.delete(username);

    // 更新最后登录时间
    await db.execute('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    const token = generateToken({ id: user.id, username: user.username, role: user.role });
    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, username: user.username, role: user.role, mustChangePassword: !!user.must_change_password }
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 修改密码 — C1: 需要认证，从 token 获取 userId
 */
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    // C1: 从认证中间件获取用户ID，不从请求体获取
    const userId = req.user.id;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: '请输入原密码和新密码' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: '新密码长度不能少于6位' });
    }

    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const isMatch = bcrypt.compareSync(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: '原密码错误' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await db.execute('UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?', [hashedPassword, userId]);

    res.json({ success: true, message: '密码修改成功' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

/**
 * 获取当前用户信息 — I8: 使用 authMiddleware
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const db = getPool();
    const [rows] = await db.execute('SELECT id, username, role, must_change_password, last_login FROM users WHERE id = ?', [userId]);
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    res.json({ success: true, data: { ...user, mustChangePassword: !!user.must_change_password } });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

module.exports = router;

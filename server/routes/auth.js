const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getPool } = require('../db/database');
const { generateToken } = require('../middleware/auth');

/**
 * 登录
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '请输入用户名和密码' });
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
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 修改密码
 */
router.put('/password', async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;
    if (!userId || !oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: '参数不完整' });
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
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 获取当前用户信息
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../middleware/auth');
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      const db = getPool();
      const [rows] = await db.execute('SELECT id, username, role, must_change_password, last_login FROM users WHERE id = ?', [decoded.id]);
      const user = rows[0];
      if (!user) {
        return res.status(404).json({ success: false, message: '用户不存在' });
      }
      res.json({ success: true, data: { ...user, mustChangePassword: !!user.must_change_password } });
    } catch (err) {
      return res.status(401).json({ success: false, message: '登录已过期' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

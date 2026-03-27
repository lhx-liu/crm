const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db/database');

// 获取所有产品
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const { search } = req.query;
    let sql = 'SELECT * FROM products';
    const params = [];
    if (search) {
      sql += ' WHERE name LIKE ? OR model LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY created_at DESC';
    const stmt = db.prepare(sql);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 新增产品
router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const { name, model, price } = req.body;
    if (!name || !model) return res.status(400).json({ success: false, message: '产品名称和型号为必填项' });
    db.run('INSERT INTO products (name, model, price) VALUES (?, ?, ?)', [name, model, price || 0]);
    saveDb();
    const stmt = db.prepare('SELECT * FROM products ORDER BY id DESC LIMIT 1');
    stmt.step();
    const row = stmt.getAsObject();
    stmt.free();
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 更新产品
router.put('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { name, model, price } = req.body;
    const { id } = req.params;
    db.run('UPDATE products SET name=?, model=?, price=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [name, model, price || 0, id]);
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 删除产品
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    db.run('DELETE FROM products WHERE id=?', [id]);
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

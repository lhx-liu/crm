const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db/database');

// ==================== 产品大类 API ====================

// 获取所有大类
router.get('/categories', async (req, res) => {
  try {
    const db = await getDb();
    const { search } = req.query;
    let sql = 'SELECT * FROM product_categories';
    const params = [];
    if (search) {
      sql += ' WHERE name LIKE ?';
      params.push(`%${search}%`);
    }
    sql += ' ORDER BY created_at DESC';
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 获取大类及其型号（用于前端下拉）
router.get('/categories-with-models', async (req, res) => {
  try {
    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM product_categories ORDER BY created_at DESC');
    const categories = [];
    while (stmt.step()) categories.push(stmt.getAsObject());
    stmt.free();

    for (const cat of categories) {
      const mstmt = db.prepare('SELECT * FROM product_models WHERE category_id = ? ORDER BY created_at DESC');
      mstmt.bind([cat.id]);
      const models = [];
      while (mstmt.step()) models.push(mstmt.getAsObject());
      mstmt.free();
      cat.models = models;
    }

    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 新增大类
router.post('/categories', async (req, res) => {
  try {
    const db = await getDb();
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: '大类名称为必填项' });
    db.run('INSERT INTO product_categories (name, description) VALUES (?, ?)', [name, description || null]);
    saveDb();
    const stmt = db.prepare('SELECT * FROM product_categories ORDER BY id DESC LIMIT 1');
    stmt.step();
    const row = stmt.getAsObject();
    stmt.free();
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 更新大类
router.put('/categories/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { name, description } = req.body;
    db.run('UPDATE product_categories SET name=?, description=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [name, description || null, id]);
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 删除大类（需检查是否有关联型号）
router.delete('/categories/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    
    // 检查是否有关联型号
    const stmt = db.prepare('SELECT COUNT(*) as count FROM product_models WHERE category_id = ?');
    stmt.bind([id]);
    stmt.step();
    const { count } = stmt.getAsObject();
    stmt.free();
    
    if (count > 0) {
      return res.status(400).json({ success: false, message: '该大类下存在型号，无法删除' });
    }
    
    db.run('DELETE FROM product_categories WHERE id=?', [id]);
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== 产品型号 API ====================

// 获取所有型号
router.get('/models', async (req, res) => {
  try {
    const db = await getDb();
    const { category_id, search } = req.query;
    let sql = `
      SELECT pm.*, pc.name as category_name
      FROM product_models pm
      LEFT JOIN product_categories pc ON pm.category_id = pc.id
      WHERE 1=1
    `;
    const params = [];
    if (category_id) {
      sql += ' AND pm.category_id = ?';
      params.push(category_id);
    }
    if (search) {
      sql += ' AND pm.model LIKE ?';
      params.push(`%${search}%`);
    }
    sql += ' ORDER BY pm.created_at DESC';
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 新增型号
router.post('/models', async (req, res) => {
  try {
    const db = await getDb();
    const { category_id, model, price, description } = req.body;
    if (!category_id || !model) return res.status(400).json({ success: false, message: '所属大类和型号名称为必填项' });
    db.run('INSERT INTO product_models (category_id, model, price, description) VALUES (?, ?, ?, ?)', [category_id, model, price || 0, description || null]);
    saveDb();
    const stmt = db.prepare(`
      SELECT pm.*, pc.name as category_name
      FROM product_models pm
      LEFT JOIN product_categories pc ON pm.category_id = pc.id
      ORDER BY pm.id DESC LIMIT 1
    `);
    stmt.step();
    const row = stmt.getAsObject();
    stmt.free();
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 更新型号
router.put('/models/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { category_id, model, price, description } = req.body;
    db.run('UPDATE product_models SET category_id=?, model=?, price=?, description=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [category_id, model, price || 0, description || null, id]);
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 删除型号（需检查是否有关联订单）
router.delete('/models/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    
    // 检查是否有关联订单
    const stmt = db.prepare('SELECT COUNT(*) as count FROM order_items WHERE model_id = ?');
    stmt.bind([id]);
    stmt.step();
    const { count } = stmt.getAsObject();
    stmt.free();
    
    if (count > 0) {
      return res.status(400).json({ success: false, message: '该型号已关联订单，无法删除' });
    }
    
    db.run('DELETE FROM product_models WHERE id=?', [id]);
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

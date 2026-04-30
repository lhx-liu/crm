const express = require('express');
const router = express.Router();
const { getPool } = require('../db/database');

// ==================== 产品大类 API ====================

// 获取所有大类
router.get('/', async (req, res) => {
  try {
    const db = getPool();
    const { search } = req.query;
    let sql = 'SELECT * FROM product_categories';
    const params = [];
    if (search) {
      sql += ' WHERE name LIKE ?';
      params.push(`%${search}%`);
    }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await db.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 获取大类及其型号（用于前端下拉）
router.get('/categories-with-models', async (req, res) => {
  try {
    const db = getPool();
    const [categories] = await db.execute('SELECT * FROM product_categories ORDER BY created_at DESC');
    // 批量查询型号（消除 N+1）
    if (categories.length > 0) {
      const catIds = categories.map(c => c.id);
      const [allModels] = await db.execute(
        `SELECT * FROM product_models WHERE category_id IN (${catIds.map(() => '?').join(',')}) ORDER BY created_at DESC`,
        catIds
      );
      const modelMap = {};
      for (const m of allModels) {
        (modelMap[m.category_id] ??= []).push(m);
      }
      for (const cat of categories) {
        cat.models = modelMap[cat.id] || [];
      }
    }
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 新增大类
router.post('/', async (req, res) => {
  try {
    const db = getPool();
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: '大类名称为必填项' });
    // 校验名称唯一性
    const [existing] = await db.execute('SELECT id FROM product_categories WHERE name = ?', [name.trim()]);
    if (existing.length > 0) return res.status(400).json({ success: false, message: '该大类名称已存在' });
    const [result] = await db.execute('INSERT INTO product_categories (name, description) VALUES (?, ?)', [name.trim(), description || null]);
    const [rows] = await db.execute('SELECT * FROM product_categories WHERE id = ?', [result.insertId]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 更新大类
router.put('/categories/:id', async (req, res) => {
  try {
    const db = getPool();
    const { id } = req.params;
    const { name, description } = req.body;
    // 校验名称唯一性（排除自身）
    const [existing] = await db.execute('SELECT id FROM product_categories WHERE name = ? AND id != ?', [name.trim(), id]);
    if (existing.length > 0) return res.status(400).json({ success: false, message: '该大类名称已存在' });
    await db.execute('UPDATE product_categories SET name=?, description=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [name.trim(), description || null, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 删除大类（需检查是否有关联型号）
router.delete('/categories/:id', async (req, res) => {
  try {
    const db = getPool();
    const { id } = req.params;
    const [countRows] = await db.execute('SELECT COUNT(*) as count FROM product_models WHERE category_id = ?', [id]);
    if (countRows[0].count > 0) {
      return res.status(400).json({ success: false, message: '该大类下存在型号，无法删除' });
    }
    await db.execute('DELETE FROM product_categories WHERE id=?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== 产品型号 API ====================

// 获取所有型号
router.get('/models', async (req, res) => {
  try {
    const db = getPool();
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
    const [rows] = await db.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 新增型号
router.post('/models', async (req, res) => {
  try {
    const db = getPool();
    const { category_id, model, price, description } = req.body;
    if (!category_id || !model) return res.status(400).json({ success: false, message: '所属大类和型号名称为必填项' });
    const [result] = await db.execute('INSERT INTO product_models (category_id, model, price, description) VALUES (?, ?, ?, ?)', [category_id, model, price || 0, description || null]);
    const [rows] = await db.execute(`
      SELECT pm.*, pc.name as category_name
      FROM product_models pm
      LEFT JOIN product_categories pc ON pm.category_id = pc.id
      WHERE pm.id = ?
    `, [result.insertId]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 更新型号
router.put('/models/:id', async (req, res) => {
  try {
    const db = getPool();
    const { id } = req.params;
    const { category_id, model, price, description } = req.body;
    await db.execute('UPDATE product_models SET category_id=?, model=?, price=?, description=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [category_id, model, price || 0, description || null, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 删除型号（需检查是否有关联订单）
router.delete('/models/:id', async (req, res) => {
  try {
    const db = getPool();
    const { id } = req.params;
    const [countRows] = await db.execute('SELECT COUNT(*) as count FROM order_items WHERE model_id = ?', [id]);
    if (countRows[0].count > 0) {
      return res.status(400).json({ success: false, message: '该型号已关联订单，无法删除' });
    }
    await db.execute('DELETE FROM product_models WHERE id=?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

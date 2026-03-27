const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db/database');

// 获取所有客户（带联系人）
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const { search, level, country } = req.query;
    let sql = 'SELECT * FROM customers WHERE 1=1';
    const params = [];
    if (search) { sql += ' AND company_name LIKE ?'; params.push(`%${search}%`); }
    if (level) { sql += ' AND level = ?'; params.push(level); }
    if (country) { sql += ' AND country LIKE ?'; params.push(`%${country}%`); }
    sql += ' ORDER BY created_at DESC';

    const stmt = db.prepare(sql);
    stmt.bind(params);
    const customers = [];
    while (stmt.step()) customers.push(stmt.getAsObject());
    stmt.free();

    // 查询联系人
    for (const c of customers) {
      const cstmt = db.prepare('SELECT * FROM contacts WHERE customer_id = ?');
      cstmt.bind([c.id]);
      const contacts = [];
      while (cstmt.step()) contacts.push(cstmt.getAsObject());
      cstmt.free();
      c.contacts = contacts;
    }

    res.json({ success: true, data: customers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 获取单个客户
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const stmt = db.prepare('SELECT * FROM customers WHERE id = ?');
    stmt.bind([id]);
    if (!stmt.step()) return res.status(404).json({ success: false, message: '客户不存在' });
    const customer = stmt.getAsObject();
    stmt.free();

    const cstmt = db.prepare('SELECT * FROM contacts WHERE customer_id = ?');
    cstmt.bind([id]);
    const contacts = [];
    while (cstmt.step()) contacts.push(cstmt.getAsObject());
    cstmt.free();
    customer.contacts = contacts;

    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 新增客户
router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const { company_name, level, opportunity, background, country, nature, source, continent, potential_inquiry, contacts } = req.body;
    if (!company_name) return res.status(400).json({ success: false, message: '客户公司名称为必填项' });

    db.run(
      `INSERT INTO customers (company_name, level, opportunity, background, country, nature, source, continent, potential_inquiry) VALUES (?,?,?,?,?,?,?,?,?)`,
      [company_name, level || null, opportunity || null, background || null, country || null, nature || null, source || null, continent || null, potential_inquiry || null]
    );
    saveDb();

    const stmt = db.prepare('SELECT * FROM customers ORDER BY id DESC LIMIT 1');
    stmt.step();
    const customer = stmt.getAsObject();
    stmt.free();

    // 插入联系人
    if (contacts && contacts.length > 0) {
      for (const c of contacts) {
        db.run('INSERT INTO contacts (customer_id, name, email, phone) VALUES (?,?,?,?)', [customer.id, c.name || null, c.email || null, c.phone || null]);
      }
      saveDb();
    }

    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 更新客户
router.put('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { company_name, level, opportunity, background, country, nature, source, continent, potential_inquiry, contacts } = req.body;

    db.run(
      `UPDATE customers SET company_name=?, level=?, opportunity=?, background=?, country=?, nature=?, source=?, continent=?, potential_inquiry=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [company_name, level || null, opportunity || null, background || null, country || null, nature || null, source || null, continent || null, potential_inquiry || null, id]
    );

    // 删除旧联系人，重新插入
    db.run('DELETE FROM contacts WHERE customer_id = ?', [id]);
    if (contacts && contacts.length > 0) {
      for (const c of contacts) {
        db.run('INSERT INTO contacts (customer_id, name, email, phone) VALUES (?,?,?,?)', [id, c.name || null, c.email || null, c.phone || null]);
      }
    }
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 删除客户
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;

    // 检查是否有关联订单
    const stmt = db.prepare('SELECT COUNT(*) as cnt FROM orders WHERE customer_id = ?');
    stmt.bind([id]);
    stmt.step();
    const { cnt } = stmt.getAsObject();
    stmt.free();

    if (cnt > 0) {
      return res.status(400).json({ success: false, message: '该客户存在关联订单，无法删除' });
    }

    db.run('DELETE FROM contacts WHERE customer_id = ?', [id]);
    db.run('DELETE FROM customers WHERE id = ?', [id]);
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

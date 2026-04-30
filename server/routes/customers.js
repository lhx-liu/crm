const express = require('express');
const router = express.Router();
const { getPool } = require('../db/database');

// 获取所有客户（带联系人）
router.get('/', async (req, res) => {
  try {
    const db = getPool();
    const { search, level, country } = req.query;
    let sql = 'SELECT * FROM customers WHERE 1=1';
    const params = [];
    if (search) { sql += ' AND company_name LIKE ?'; params.push(`%${search}%`); }
    if (level) { sql += ' AND level = ?'; params.push(level); }
    if (country) { sql += ' AND country LIKE ?'; params.push(`%${country}%`); }
    sql += ' ORDER BY created_at DESC';

    const [customers] = await db.execute(sql, params);

    // 批量查询联系人（消除 N+1）
    if (customers.length > 0) {
      const customerIds = customers.map(c => c.id);
      const [allContacts] = await db.execute(
        `SELECT * FROM contacts WHERE customer_id IN (${customerIds.map(() => '?').join(',')})`,
        customerIds
      );
      const contactMap = {};
      for (const ct of allContacts) {
        (contactMap[ct.customer_id] ??= []).push(ct);
      }
      for (const c of customers) {
        c.contacts = contactMap[c.id] || [];
      }
    }

    res.json({ success: true, data: customers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 获取单个客户
router.get('/:id', async (req, res) => {
  try {
    const db = getPool();
    const { id } = req.params;
    const [customerRows] = await db.execute('SELECT * FROM customers WHERE id = ?', [id]);
    if (customerRows.length === 0) return res.status(404).json({ success: false, message: '客户不存在' });
    const [contacts] = await db.execute('SELECT * FROM contacts WHERE customer_id = ?', [id]);
    const customer = customerRows[0];
    customer.contacts = contacts;
    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 新增客户
router.post('/', async (req, res) => {
  try {
    const db = getPool();
    const { company_name, lead_no, level, opportunity, background, country, nature, source, continent, potential_inquiry, contacts } = req.body;
    if (!company_name) return res.status(400).json({ success: false, message: '客户公司名称为必填项' });
    if (!lead_no) return res.status(400).json({ success: false, message: '线索编号为必填项' });

    const [result] = await db.execute(
      `INSERT INTO customers (company_name, lead_no, level, opportunity, background, country, nature, source, continent, potential_inquiry) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [company_name, lead_no, level || null, opportunity || null, background || null, country || null, nature || null, source || null, continent || null, potential_inquiry || null]
    );

    const [customerRows] = await db.execute('SELECT * FROM customers WHERE id = ?', [result.insertId]);

    // 插入联系人
    if (contacts && contacts.length > 0) {
      for (const c of contacts) {
        await db.execute('INSERT INTO contacts (customer_id, name, email, phone) VALUES (?,?,?,?)', [result.insertId, c.name || null, c.email || null, c.phone || null]);
      }
    }

    res.json({ success: true, data: customerRows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 更新客户
router.put('/:id', async (req, res) => {
  try {
    const db = getPool();
    const { id } = req.params;
    const { company_name, lead_no, level, opportunity, background, country, nature, source, continent, potential_inquiry, contacts } = req.body;

    await db.execute(
      `UPDATE customers SET company_name=?, lead_no=?, level=?, opportunity=?, background=?, country=?, nature=?, source=?, continent=?, potential_inquiry=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [company_name, lead_no || null, level || null, opportunity || null, background || null, country || null, nature || null, source || null, continent || null, potential_inquiry || null, id]
    );

    // 删除旧联系人，重新插入
    await db.execute('DELETE FROM contacts WHERE customer_id = ?', [id]);
    if (contacts && contacts.length > 0) {
      for (const c of contacts) {
        await db.execute('INSERT INTO contacts (customer_id, name, email, phone) VALUES (?,?,?,?)', [id, c.name || null, c.email || null, c.phone || null]);
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 删除客户
router.delete('/:id', async (req, res) => {
  try {
    const db = getPool();
    const { id } = req.params;

    // 检查是否有关联订单
    const [countRows] = await db.execute('SELECT COUNT(*) as cnt FROM orders WHERE customer_id = ?', [id]);
    if (countRows[0].cnt > 0) {
      return res.status(400).json({ success: false, message: '该客户存在关联订单，无法删除' });
    }

    await db.execute('DELETE FROM contacts WHERE customer_id = ?', [id]);
    await db.execute('DELETE FROM customers WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

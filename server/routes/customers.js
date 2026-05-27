const express = require('express');
const router = express.Router();
const { getPool } = require('../db/database');

// I1: 生产环境错误信息脱敏
const safeMsg = (err) => process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message;

// 获取所有客户（带联系人，支持服务端分页 + I7: 导出模式）
router.get('/', async (req, res) => {
  try {
    const db = getPool();
    const { search, level, country } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const isExport = req.query.export === 'true';
    const maxPageSize = isExport ? 100000 : 200;
    const pageSize = Math.min(maxPageSize, Math.max(1, parseInt(req.query.pageSize) || 50));

    let whereSql = ' WHERE 1=1';
    const params = [];
    if (search) { whereSql += ' AND company_name LIKE ?'; params.push(`%${search}%`); }
    if (level) { whereSql += ' AND level = ?'; params.push(level); }
    if (country) { whereSql += ' AND country LIKE ?'; params.push(`%${country}%`); }

    // 查总数
    const countSql = `SELECT COUNT(*) as cnt FROM customers${whereSql}`;
    const [countRows] = await db.execute(countSql, params);
    const total = countRows[0].cnt;

    // 分页查询
    const offset = (page - 1) * pageSize;
    const dataSql = `SELECT * FROM customers${whereSql} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
    const [customers] = await db.execute(dataSql, params);

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

    res.json({ success: true, data: customers, total, page, pageSize });
  } catch (err) {
    console.error('Customers list error:', err);
    res.status(500).json({ success: false, message: safeMsg(err) });
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
    console.error('Customer detail error:', err);
    res.status(500).json({ success: false, message: safeMsg(err) });
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
    console.error('Create customer error:', err);
    res.status(500).json({ success: false, message: safeMsg(err) });
  }
});

// 更新客户 — C5: 使用事务保护 + I4: 返回完整数据
router.put('/:id', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    const { id } = req.params;
    const { company_name, lead_no, level, opportunity, background, country, nature, source, continent, potential_inquiry, contacts } = req.body;

    await conn.beginTransaction();

    await conn.execute(
      `UPDATE customers SET company_name=?, lead_no=?, level=?, opportunity=?, background=?, country=?, nature=?, source=?, continent=?, potential_inquiry=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [company_name, lead_no || null, level || null, opportunity || null, background || null, country || null, nature || null, source || null, continent || null, potential_inquiry || null, id]
    );

    // 删除旧联系人，重新插入
    await conn.execute('DELETE FROM contacts WHERE customer_id = ?', [id]);
    if (contacts && contacts.length > 0) {
      for (const c of contacts) {
        await conn.execute('INSERT INTO contacts (customer_id, name, email, phone) VALUES (?,?,?,?)', [id, c.name || null, c.email || null, c.phone || null]);
      }
    }

    await conn.commit();

    // I4: 返回更新后的完整数据
    const [customerRows] = await getPool().execute('SELECT * FROM customers WHERE id = ?', [id]);
    const [newContacts] = await getPool().execute('SELECT * FROM contacts WHERE customer_id = ?', [id]);
    const customer = customerRows[0];
    if (customer) customer.contacts = newContacts;

    res.json({ success: true, data: customer });
  } catch (err) {
    await conn.rollback();
    console.error('Update customer error:', err);
    res.status(500).json({ success: false, message: safeMsg(err) });
  } finally {
    conn.release();
  }
});

// 删除客户
router.delete('/:id', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    const { id } = req.params;

    // 检查是否有关联订单
    const [countRows] = await conn.execute('SELECT COUNT(*) as cnt FROM orders WHERE customer_id = ?', [id]);
    if (countRows[0].cnt > 0) {
      conn.release();
      return res.status(400).json({ success: false, message: '该客户存在关联订单，无法删除' });
    }

    await conn.beginTransaction();
    await conn.execute('DELETE FROM contacts WHERE customer_id = ?', [id]);
    await conn.execute('DELETE FROM customers WHERE id = ?', [id]);
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    console.error('Delete customer error:', err);
    res.status(500).json({ success: false, message: safeMsg(err) });
  } finally {
    conn.release();
  }
});

module.exports = router;

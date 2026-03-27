const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db/database');

function getOrderWithItems(db, orderId) {
  const stmt = db.prepare(`
    SELECT o.*, c.company_name, c.country, c.level, c.continent, c.source, c.opportunity
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.id = ?
  `);
  stmt.bind([orderId]);
  if (!stmt.step()) { stmt.free(); return null; }
  const order = stmt.getAsObject();
  stmt.free();

  const istmt = db.prepare(`
    SELECT oi.*, p.name as product_name, p.model as product_model
    FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `);
  istmt.bind([orderId]);
  const items = [];
  while (istmt.step()) items.push(istmt.getAsObject());
  istmt.free();
  order.items = items;
  return order;
}

// 获取订单列表
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const { company_name, order_date_start, order_date_end, country, level, continent, source, customer_type, customer_id } = req.query;

    let sql = `
      SELECT o.*, c.company_name, c.country, c.level, c.continent, c.source, c.opportunity
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (customer_id) { sql += ' AND o.customer_id = ?'; params.push(customer_id); }
    if (company_name) { sql += ' AND c.company_name LIKE ?'; params.push(`%${company_name}%`); }
    if (order_date_start) { sql += ' AND o.order_date >= ?'; params.push(order_date_start); }
    if (order_date_end) { sql += ' AND o.order_date <= ?'; params.push(order_date_end); }
    if (country) { sql += ' AND c.country LIKE ?'; params.push(`%${country}%`); }
    if (level) { sql += ' AND c.level = ?'; params.push(level); }
    if (continent) { sql += ' AND c.continent LIKE ?'; params.push(`%${continent}%`); }
    if (source) { sql += ' AND c.source LIKE ?'; params.push(`%${source}%`); }
    if (customer_type) { sql += ' AND o.customer_type = ?'; params.push(customer_type); }

    sql += ' ORDER BY o.order_date DESC, o.id DESC';

    const stmt = db.prepare(sql);
    stmt.bind(params);
    const orders = [];
    while (stmt.step()) orders.push(stmt.getAsObject());
    stmt.free();

    // 查询每个订单的产品明细
    for (const order of orders) {
      const istmt = db.prepare(`
        SELECT oi.*, p.name as product_name, p.model as product_model
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `);
      istmt.bind([order.id]);
      const items = [];
      while (istmt.step()) items.push(istmt.getAsObject());
      istmt.free();
      order.items = items;
    }

    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 获取单个订单详情
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const order = getOrderWithItems(db, req.params.id);
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 新增订单
router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const { customer_id, customer_type, order_date, payment_date, purchase_order_no, lead_no, payment_amount, invoice_amount, exw_value, total_amount, items } = req.body;
    if (!customer_id) return res.status(400).json({ success: false, message: '请选择关联客户' });

    db.run(
      `INSERT INTO orders (customer_id, customer_type, order_date, payment_date, purchase_order_no, lead_no, payment_amount, invoice_amount, exw_value, total_amount) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [customer_id, customer_type || null, order_date || null, payment_date || null, purchase_order_no || null, lead_no || null, payment_amount || 0, invoice_amount || 0, exw_value || 0, total_amount || 0]
    );
    saveDb();

    const stmt = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 1');
    stmt.step();
    const order = stmt.getAsObject();
    stmt.free();

    if (items && items.length > 0) {
      for (const item of items) {
        db.run('INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?,?,?,?)', [order.id, item.product_id, item.quantity || 1, item.unit_price || 0]);
      }
      saveDb();
    }

    res.json({ success: true, data: getOrderWithItems(db, order.id) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 更新订单
router.put('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { customer_id, customer_type, order_date, payment_date, purchase_order_no, lead_no, payment_amount, invoice_amount, exw_value, total_amount, items } = req.body;

    db.run(
      `UPDATE orders SET customer_id=?, customer_type=?, order_date=?, payment_date=?, purchase_order_no=?, lead_no=?, payment_amount=?, invoice_amount=?, exw_value=?, total_amount=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [customer_id, customer_type || null, order_date || null, payment_date || null, purchase_order_no || null, lead_no || null, payment_amount || 0, invoice_amount || 0, exw_value || 0, total_amount || 0, id]
    );

    db.run('DELETE FROM order_items WHERE order_id = ?', [id]);
    if (items && items.length > 0) {
      for (const item of items) {
        db.run('INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?,?,?,?)', [id, item.product_id, item.quantity || 1, item.unit_price || 0]);
      }
    }
    saveDb();
    res.json({ success: true, data: getOrderWithItems(db, id) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 删除订单
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    db.run('DELETE FROM order_items WHERE order_id = ?', [id]);
    db.run('DELETE FROM orders WHERE id = ?', [id]);
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

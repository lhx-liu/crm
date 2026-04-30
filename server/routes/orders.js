const express = require('express');
const router = express.Router();
const { getPool } = require('../db/database');

async function getOrderWithItems(db, orderId) {
  const [orderRows] = await db.execute(`
    SELECT o.*, c.company_name, c.country, c.level, c.continent, c.source, c.opportunity, c.lead_no
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.id = ?
  `, [orderId]);
  if (orderRows.length === 0) return null;

  const order = orderRows[0];
  const [items] = await db.execute(`
    SELECT oi.*, pm.model as product_model, pm.price as model_price, pm.category_id, pc.name as category_name
    FROM order_items oi
    LEFT JOIN product_models pm ON oi.model_id = pm.id
    LEFT JOIN product_categories pc ON pm.category_id = pc.id
    WHERE oi.order_id = ?
  `, [orderId]);
  order.items = items;
  return order;
}

// 获取订单列表
router.get('/', async (req, res) => {
  try {
    const db = getPool();
    const { company_name, order_date_start, order_date_end, country, level, continent, source, customer_type, customer_id } = req.query;

    let sql = `
      SELECT o.*, c.company_name, c.country, c.level, c.continent, c.source, c.opportunity, c.lead_no
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

    const [orders] = await db.execute(sql, params);

    // 批量查询产品明细和联系人（消除 N+1）
    if (orders.length > 0) {
      const orderIds = orders.map(o => o.id);
      const customerIds = [...new Set(orders.map(o => o.customer_id).filter(Boolean))];

      // 批量查 items
      const [allItems] = await db.execute(`
        SELECT oi.*, pm.model as product_model, pm.price as model_price, pm.category_id, pc.name as category_name
        FROM order_items oi
        LEFT JOIN product_models pm ON oi.model_id = pm.id
        LEFT JOIN product_categories pc ON pm.category_id = pc.id
        WHERE oi.order_id IN (${orderIds.map(() => '?').join(',')})
      `, orderIds);
      const itemMap = {};
      for (const item of allItems) {
        (itemMap[item.order_id] ??= []).push(item);
      }

      // 批量查 contacts
      const [allContacts] = await db.execute(`
        SELECT ct.customer_id, ct.name, ct.email, ct.phone
        FROM contacts ct
        WHERE ct.customer_id IN (${customerIds.map(() => '?').join(',')})
      `, customerIds);
      const contactMap = {};
      for (const ct of allContacts) {
        (contactMap[ct.customer_id] ??= []).push(ct);
      }

      for (const order of orders) {
        order.items = itemMap[order.id] || [];
        order.contacts = contactMap[order.customer_id] || [];
      }
    }

    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 获取单个订单详情
router.get('/:id', async (req, res) => {
  try {
    const db = getPool();
    const order = await getOrderWithItems(db, req.params.id);
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 新增订单
router.post('/', async (req, res) => {
  try {
    const db = getPool();
    const { customer_id, customer_type, order_date, payment_date, purchase_order_no, lead_no, payment_amount, invoice_amount, exw_value, total_amount, items } = req.body;
    if (!customer_id) return res.status(400).json({ success: false, message: '请选择关联客户' });

    const [result] = await db.execute(
      `INSERT INTO orders (customer_id, customer_type, order_date, payment_date, purchase_order_no, lead_no, payment_amount, invoice_amount, exw_value, total_amount) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [customer_id, customer_type || null, order_date || null, payment_date || null, purchase_order_no || null, lead_no || null, payment_amount || 0, invoice_amount || 0, exw_value || 0, total_amount || 0]
    );

    if (items && items.length > 0) {
      for (const item of items) {
        await db.execute('INSERT INTO order_items (order_id, model_id, quantity, unit_price) VALUES (?,?,?,?)', [result.insertId, item.model_id, item.quantity || 1, item.unit_price || 0]);
      }
    }

    res.json({ success: true, data: await getOrderWithItems(db, result.insertId) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 更新订单
router.put('/:id', async (req, res) => {
  try {
    const db = getPool();
    const { id } = req.params;
    const { customer_id, customer_type, order_date, payment_date, purchase_order_no, lead_no, payment_amount, invoice_amount, exw_value, total_amount, items } = req.body;

    await db.execute(
      `UPDATE orders SET customer_id=?, customer_type=?, order_date=?, payment_date=?, purchase_order_no=?, lead_no=?, payment_amount=?, invoice_amount=?, exw_value=?, total_amount=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [customer_id, customer_type || null, order_date || null, payment_date || null, purchase_order_no || null, lead_no || null, payment_amount || 0, invoice_amount || 0, exw_value || 0, total_amount || 0, id]
    );

    await db.execute('DELETE FROM order_items WHERE order_id = ?', [id]);
    if (items && items.length > 0) {
      for (const item of items) {
        await db.execute('INSERT INTO order_items (order_id, model_id, quantity, unit_price) VALUES (?,?,?,?)', [id, item.model_id, item.quantity || 1, item.unit_price || 0]);
      }
    }
    res.json({ success: true, data: await getOrderWithItems(db, Number(id)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 删除订单
router.delete('/:id', async (req, res) => {
  try {
    const db = getPool();
    const { id } = req.params;
    await db.execute('DELETE FROM order_items WHERE order_id = ?', [id]);
    await db.execute('DELETE FROM orders WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

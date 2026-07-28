const express = require('express');
const router = express.Router();
const { getPool } = require('../db/database');

// I1: 生产环境错误信息脱敏
const safeMsg = (err) => process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message;

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

// 获取订单列表（支持服务端分页 + I7: 导出模式允许更大 pageSize）
router.get('/', async (req, res) => {
  try {
    const db = getPool();
    const { company_name, order_date_start, order_date_end, country, level, continent, source, customer_type, customer_id } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const isExport = req.query.export === 'true';
    // I7: 导出模式允许最大 100000 条，普通模式最大 200
    const maxPageSize = isExport ? 100000 : 200;
    const pageSize = Math.min(maxPageSize, Math.max(1, parseInt(req.query.pageSize) || 50));

    let whereSql = ' WHERE 1=1';
    const params = [];

    if (customer_id) { whereSql += ' AND o.customer_id = ?'; params.push(customer_id); }
    if (company_name) { whereSql += ' AND c.company_name LIKE ?'; params.push(`%${company_name}%`); }
    if (order_date_start) { whereSql += ' AND o.order_date >= ?'; params.push(order_date_start); }
    if (order_date_end) { whereSql += ' AND o.order_date <= ?'; params.push(order_date_end); }
    if (country) { whereSql += ' AND c.country LIKE ?'; params.push(`%${country}%`); }
    if (level) { whereSql += ' AND c.level = ?'; params.push(level); }
    if (continent) { whereSql += ' AND c.continent LIKE ?'; params.push(`%${continent}%`); }
    if (source) { whereSql += ' AND c.source LIKE ?'; params.push(`%${source}%`); }
    if (customer_type) { whereSql += ' AND o.customer_type = ?'; params.push(customer_type); }

    // 先查总数
    const countSql = `SELECT COUNT(*) as cnt FROM orders o LEFT JOIN customers c ON o.customer_id = c.id${whereSql}`;
    const [countRows] = await db.execute(countSql, params);
    const total = countRows[0].cnt;

    // 分页查询（LIMIT/OFFSET 已做整数校验，直接内插避免 MySQL 预处理类型报错）
    const offset = (page - 1) * pageSize;
    const dataSql = `
      SELECT o.*, c.company_name, c.country, c.level, c.continent, c.source, c.opportunity, c.lead_no
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      ${whereSql}
      ORDER BY o.order_date DESC, o.id DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;
    const [orders] = await db.execute(dataSql, params);

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
      if (customerIds.length > 0) {
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
      } else {
        for (const order of orders) {
          order.items = itemMap[order.id] || [];
          order.contacts = [];
        }
      }
    }

    res.json({ success: true, data: orders, total, page, pageSize });
  } catch (err) {
    console.error('Orders list error:', err);
    res.status(500).json({ success: false, message: safeMsg(err) });
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
    console.error('Order detail error:', err);
    res.status(500).json({ success: false, message: safeMsg(err) });
  }
});

// 辅助函数：从产品表批量获取最新价格
async function getLatestPrices(db, modelIds) {
  if (!modelIds.length) return {};
  const [rows] = await db.execute(
    `SELECT id, price FROM product_models WHERE id IN (${modelIds.map(() => '?').join(',')})`,
    modelIds
  );
  const map = {};
  for (const row of rows) map[row.id] = row.price;
  return map;
}

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
      // 从产品表取最新价格，而非使用前端传入的旧快照
      const modelIds = [...new Set(items.map(i => i.model_id).filter(Boolean))];
      const priceMap = await getLatestPrices(db, modelIds);

      for (const item of items) {
        const latestPrice = priceMap[item.model_id] != null ? priceMap[item.model_id] : (item.unit_price || 0);
        await db.execute('INSERT INTO order_items (order_id, model_id, quantity, unit_price, amount) VALUES (?,?,?,?,?)', [result.insertId, item.model_id, item.quantity || 1, latestPrice, item.amount || 0]);
      }
    }

    res.json({ success: true, data: await getOrderWithItems(db, result.insertId) });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ success: false, message: safeMsg(err) });
  }
});

// 更新订单 — C5: 使用事务保护
router.put('/:id', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    const { id } = req.params;
    const { customer_id, customer_type, order_date, payment_date, purchase_order_no, lead_no, payment_amount, invoice_amount, exw_value, total_amount, items } = req.body;

    await conn.beginTransaction();

    await conn.execute(
      `UPDATE orders SET customer_id=?, customer_type=?, order_date=?, payment_date=?, purchase_order_no=?, lead_no=?, payment_amount=?, invoice_amount=?, exw_value=?, total_amount=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [customer_id, customer_type || null, order_date || null, payment_date || null, purchase_order_no || null, lead_no || null, payment_amount || 0, invoice_amount || 0, exw_value || 0, total_amount || 0, id]
    );

    await conn.execute('DELETE FROM order_items WHERE order_id = ?', [id]);
    if (items && items.length > 0) {
      const modelIds = [...new Set(items.map(i => i.model_id).filter(Boolean))];
      const priceMap = await getLatestPrices(conn, modelIds);

      for (const item of items) {
        const latestPrice = priceMap[item.model_id] != null ? priceMap[item.model_id] : (item.unit_price || 0);
        await conn.execute('INSERT INTO order_items (order_id, model_id, quantity, unit_price, amount) VALUES (?,?,?,?,?)', [id, item.model_id, item.quantity || 1, latestPrice, item.amount || 0]);
      }
    }

    await conn.commit();
    // 使用连接池查询返回数据
    const order = await getOrderWithItems(getPool(), Number(id));
    res.json({ success: true, data: order });
  } catch (err) {
    await conn.rollback();
    console.error('Update order error:', err);
    res.status(500).json({ success: false, message: safeMsg(err) });
  } finally {
    conn.release();
  }
});

// 删除订单 — 也使用事务保护
router.delete('/:id', async (req, res) => {
  const conn = await getPool().getConnection();
  try {
    const { id } = req.params;
    await conn.beginTransaction();
    await conn.execute('DELETE FROM order_items WHERE order_id = ?', [id]);
    await conn.execute('DELETE FROM orders WHERE id = ?', [id]);
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error('Delete order error:', err);
    res.status(500).json({ success: false, message: safeMsg(err) });
  } finally {
    conn.release();
  }
});

module.exports = router;

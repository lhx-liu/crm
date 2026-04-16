const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// 客户分析列表（按到款金额排序）
router.get('/list', async (req, res) => {
  try {
    const db = await getDb();
    const { search } = req.query;
    let sql = `
      SELECT c.id, c.company_name, c.level, c.country, c.continent,
        COALESCE(SUM(o.payment_amount), 0) as total_payment,
        COUNT(o.id) as order_count
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      WHERE 1=1
    `;
    const params = [];
    if (search) { sql += ' AND c.company_name LIKE ?'; params.push(`%${search}%`); }
    sql += ' GROUP BY c.id ORDER BY total_payment DESC';

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

// 客户下单频率
router.get('/:id/frequency', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;

    // 每月下单次数
    const stmt = db.prepare(`
      SELECT strftime('%Y-%m', order_date) as month, COUNT(*) as count
      FROM orders WHERE customer_id = ? AND order_date IS NOT NULL
      GROUP BY month ORDER BY month ASC
    `);
    stmt.bind([id]);
    const monthly = [];
    while (stmt.step()) monthly.push(stmt.getAsObject());
    stmt.free();

    // 计算平均间隔天数
    const dstmt = db.prepare(`SELECT order_date FROM orders WHERE customer_id = ? AND order_date IS NOT NULL ORDER BY order_date ASC`);
    dstmt.bind([id]);
    const dates = [];
    while (dstmt.step()) dates.push(dstmt.getAsObject().order_date);
    dstmt.free();

    let avgDays = null;
    if (dates.length > 1) {
      let totalDiff = 0;
      for (let i = 1; i < dates.length; i++) {
        const diff = (new Date(dates[i]) - new Date(dates[i - 1])) / (1000 * 60 * 60 * 24);
        totalDiff += diff;
      }
      avgDays = Math.round(totalDiff / (dates.length - 1));
    }

    res.json({ success: true, data: { monthly, avgDays, totalOrders: dates.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 客户偏向产品（按大类聚合）
router.get('/:id/products', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const stmt = db.prepare(`
      SELECT pc.id, pc.name as category_name,
        COUNT(DISTINCT oi.order_id) as purchase_count,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.quantity * oi.unit_price) as total_amount
      FROM order_items oi
      LEFT JOIN product_models pm ON oi.model_id = pm.id
      LEFT JOIN product_categories pc ON pm.category_id = pc.id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE o.customer_id = ?
      GROUP BY pc.id
      ORDER BY total_amount DESC
    `);
    stmt.bind([id]);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 客户下单时间轴
router.get('/:id/timeline', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;

    const stmt = db.prepare(`SELECT * FROM orders WHERE customer_id = ? ORDER BY order_date DESC`);
    stmt.bind([id]);
    const orders = [];
    while (stmt.step()) orders.push(stmt.getAsObject());
    stmt.free();

    for (const order of orders) {
      const istmt = db.prepare(`
        SELECT oi.quantity, oi.unit_price, pm.model as product_model, pc.name as category_name
        FROM order_items oi 
        LEFT JOIN product_models pm ON oi.model_id = pm.id
        LEFT JOIN product_categories pc ON pm.category_id = pc.id
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

module.exports = router;

const express = require('express');
const router = express.Router();
const { getPool } = require('../db/database');

// I1: 生产环境错误信息脱敏
const safeMsg = (err) => process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message;

// 客户分析列表（按到款金额排序，I9: 支持服务端分页）
router.get('/list', async (req, res) => {
  try {
    const db = getPool();
    const { search } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize) || 50));

    let whereSql = ' WHERE 1=1';
    const params = [];
    if (search) { whereSql += ' AND c.company_name LIKE ?'; params.push(`%${search}%`); }

    // 查总数
    const countSql = `SELECT COUNT(*) as cnt FROM customers c${whereSql}`;
    const [countRows] = await db.execute(countSql, params);
    const total = countRows[0].cnt;

    // 分页查询
    const offset = (page - 1) * pageSize;
    const dataSql = `
      SELECT c.id, c.company_name, c.level, c.country, c.continent,
        COALESCE(SUM(o.payment_amount), 0) as total_payment,
        COUNT(o.id) as order_count
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      ${whereSql}
      GROUP BY c.id ORDER BY total_payment DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;
    const [rows] = await db.execute(dataSql, params);
    res.json({ success: true, data: rows, total, page, pageSize });
  } catch (err) {
    console.error('Analysis list error:', err);
    res.status(500).json({ success: false, message: safeMsg(err) });
  }
});

// 客户下单频率
router.get('/:id/frequency', async (req, res) => {
  try {
    const db = getPool();
    const { id } = req.params;

    const [monthly] = await db.execute(`
      SELECT DATE_FORMAT(order_date, '%Y-%m') as month, COUNT(*) as count
      FROM orders WHERE customer_id = ? AND order_date IS NOT NULL
      GROUP BY month ORDER BY month ASC
    `, [id]);

    // 计算平均间隔天数
    const [dateRows] = await db.execute(`SELECT order_date FROM orders WHERE customer_id = ? AND order_date IS NOT NULL ORDER BY order_date ASC`, [id]);
    const dates = dateRows.map(r => r.order_date);

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
    console.error('Frequency error:', err);
    res.status(500).json({ success: false, message: safeMsg(err) });
  }
});

// 客户偏向产品（按大类聚合）
router.get('/:id/products', async (req, res) => {
  try {
    const db = getPool();
    const { id } = req.params;
    const [rows] = await db.execute(`
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
    `, [id]);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Products analysis error:', err);
    res.status(500).json({ success: false, message: safeMsg(err) });
  }
});

// 客户下单时间轴
router.get('/:id/timeline', async (req, res) => {
  try {
    const db = getPool();
    const { id } = req.params;
    const [orders] = await db.execute(`SELECT * FROM orders WHERE customer_id = ? ORDER BY order_date DESC`, [id]);

    // 批量查询产品明细（消除 N+1）
    if (orders.length > 0) {
      const orderIds = orders.map(o => o.id);
      const [allItems] = await db.execute(`
        SELECT oi.quantity, oi.unit_price, oi.order_id, pm.model as product_model, pc.name as category_name
        FROM order_items oi 
        LEFT JOIN product_models pm ON oi.model_id = pm.id
        LEFT JOIN product_categories pc ON pm.category_id = pc.id
        WHERE oi.order_id IN (${orderIds.map(() => '?').join(',')})
      `, orderIds);
      const itemMap = {};
      for (const item of allItems) {
        (itemMap[item.order_id] ??= []).push(item);
      }
      for (const order of orders) {
        order.items = itemMap[order.id] || [];
      }
    }

    res.json({ success: true, data: orders });
  } catch (err) {
    console.error('Timeline error:', err);
    res.status(500).json({ success: false, message: safeMsg(err) });
  }
});

module.exports = router;

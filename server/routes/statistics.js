const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// 大洲订单分布
router.get('/continent-distribution', async (req, res) => {
  try {
    const db = await getDb();
    const { start_date, end_date, type } = req.query; // type: count | amount
    let sql, params = [];

    if (type === 'amount') {
      sql = `SELECT c.continent, SUM(o.payment_amount) as value FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE 1=1`;
    } else {
      sql = `SELECT c.continent, COUNT(o.id) as value FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE 1=1`;
    }
    if (start_date) { sql += ' AND o.order_date >= ?'; params.push(start_date); }
    if (end_date) { sql += ' AND o.order_date <= ?'; params.push(end_date); }
    sql += ' GROUP BY c.continent';

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

// 到款金额趋势
router.get('/payment-trend', async (req, res) => {
  try {
    const db = await getDb();
    const { start_date, end_date, granularity } = req.query; // granularity: month | quarter | year
    let groupExpr;
    if (granularity === 'year') groupExpr = "strftime('%Y', o.order_date)";
    else if (granularity === 'quarter') groupExpr = "strftime('%Y', o.order_date) || '-Q' || CAST((CAST(strftime('%m', o.order_date) AS INTEGER) + 2) / 3 AS TEXT)";
    else groupExpr = "strftime('%Y-%m', o.order_date)";

    let sql = `SELECT ${groupExpr} as period, SUM(o.payment_amount) as amount FROM orders o WHERE 1=1`;
    const params = [];
    if (start_date) { sql += ' AND o.order_date >= ?'; params.push(start_date); }
    if (end_date) { sql += ' AND o.order_date <= ?'; params.push(end_date); }
    sql += ` GROUP BY ${groupExpr} ORDER BY period ASC`;

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

// 到款金额对比（多月/多年）
router.get('/payment-compare', async (req, res) => {
  try {
    const db = await getDb();
    const { periods, type } = req.query; // periods: ['2024','2025'] or ['2024-01','2024-02'], type: year|month
    const periodList = Array.isArray(periods) ? periods : (periods ? periods.split(',') : []);
    const result = {};

    for (const p of periodList) {
      let sql, params = [];
      if (type === 'year') {
        sql = `SELECT strftime('%m', order_date) as sub_period, SUM(payment_amount) as amount FROM orders WHERE strftime('%Y', order_date) = ? GROUP BY sub_period ORDER BY sub_period ASC`;
        params = [p];
      } else {
        sql = `SELECT strftime('%d', order_date) as sub_period, SUM(payment_amount) as amount FROM orders WHERE strftime('%Y-%m', order_date) = ? GROUP BY sub_period ORDER BY sub_period ASC`;
        params = [p];
      }
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      result[p] = rows;
    }

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 产品销售排行（按大类聚合）
router.get('/product-ranking', async (req, res) => {
  try {
    const db = await getDb();
    const { start_date, end_date, sort_by } = req.query; // sort_by: amount | quantity

    let sql = `
      SELECT pc.id, pc.name as category_name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.quantity * oi.unit_price) as total_amount
      FROM order_items oi
      LEFT JOIN product_models pm ON oi.model_id = pm.id
      LEFT JOIN product_categories pc ON pm.category_id = pc.id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE 1=1
    `;
    const params = [];
    if (start_date) { sql += ' AND o.order_date >= ?'; params.push(start_date); }
    if (end_date) { sql += ' AND o.order_date <= ?'; params.push(end_date); }
    sql += ' GROUP BY pc.id';
    sql += sort_by === 'quantity' ? ' ORDER BY total_quantity DESC' : ' ORDER BY total_amount DESC';

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

// 产品关联订单（按大类查询，点击大类查看买过的客户和订单）
router.get('/product-orders/:categoryId', async (req, res) => {
  try {
    const db = await getDb();
    const { categoryId } = req.params;
    const { start_date, end_date } = req.query;

    let sql = `
      SELECT o.*, c.company_name, c.country, oi.quantity, oi.unit_price, pm.model as product_model
      FROM order_items oi
      LEFT JOIN orders o ON oi.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN product_models pm ON oi.model_id = pm.id
      WHERE pm.category_id = ?
    `;
    const params = [categoryId];
    if (start_date) { sql += ' AND o.order_date >= ?'; params.push(start_date); }
    if (end_date) { sql += ' AND o.order_date <= ?'; params.push(end_date); }
    sql += ' ORDER BY o.order_date DESC';

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

module.exports = router;

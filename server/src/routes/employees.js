const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { requireRole } = require('../middleware/auth');
const { wrap, missing, emptyToNull, getEmployeeIdForUser } = require('../utils');

const FIELDS = ['emp_code', 'first_name', 'last_name', 'email', 'phone', 'designation', 'department',
  'skills', 'salary', 'join_date', 'status', 'address'];

router.get('/', requireRole('admin', 'manager'), wrap(async (req, res) => {
  const { q, status, department } = req.query;
  const where = [];
  const params = [];
  if (q) {
    where.push('(e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ? OR e.emp_code LIKE ? OR e.skills LIKE ?)');
    params.push(...Array(5).fill(`%${q}%`));
  }
  if (status) { where.push('e.status = ?'); params.push(status); }
  if (department) { where.push('e.department = ?'); params.push(department); }
  const [rows] = await db().query(
    `SELECT e.*,
       (SELECT c.company_name FROM assignments a JOIN clients c ON c.id = a.client_id
        WHERE a.employee_id = e.id AND a.status = 'active' ORDER BY a.start_date DESC LIMIT 1) AS current_client
     FROM employees e
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY e.id DESC`,
    params
  );
  res.json(rows);
}));

router.get('/departments', requireRole('admin', 'manager'), wrap(async (req, res) => {
  const [rows] = await db().query(
    "SELECT DISTINCT department FROM employees WHERE department IS NOT NULL AND department <> '' ORDER BY department"
  );
  res.json(rows.map((r) => r.department));
}));

router.get('/:id', wrap(async (req, res) => {
  if (req.user.role === 'employee') {
    const own = await getEmployeeIdForUser(req.user.id);
    if (own !== Number(req.params.id)) return res.status(403).json({ message: 'Access denied' });
  }
  const [rows] = await db().query('SELECT * FROM employees WHERE id = ?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Employee not found' });
  const [assignments] = await db().query(
    `SELECT a.*, c.company_name FROM assignments a JOIN clients c ON c.id = a.client_id
     WHERE a.employee_id = ? ORDER BY a.start_date DESC`,
    [req.params.id]
  );
  const [leaves] = await db().query('SELECT * FROM leaves WHERE employee_id = ? ORDER BY start_date DESC', [req.params.id]);
  res.json({ ...rows[0], assignments, leaves });
}));

router.post('/', requireRole('admin', 'manager'), wrap(async (req, res) => {
  const miss = missing(req.body, ['emp_code', 'first_name', 'last_name', 'email']);
  if (miss.length) return res.status(400).json({ message: `Missing: ${miss.join(', ')}` });

  const conn = await db().getConnection();
  try {
    await conn.beginTransaction();
    let userId = null;
    if (req.body.create_login) {
      if (!req.body.password || req.body.password.length < 6) {
        throw Object.assign(new Error('Login password must be at least 6 characters'), { status: 400 });
      }
      const [u] = await conn.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'employee')",
        [`${req.body.first_name} ${req.body.last_name}`, req.body.email, await bcrypt.hash(req.body.password, 10)]
      );
      userId = u.insertId;
    }
    const values = FIELDS.map((f) => emptyToNull(req.body[f]));
    values[FIELDS.indexOf('status')] = values[FIELDS.indexOf('status')] || 'active';
    const [r] = await conn.query(
      `INSERT INTO employees (user_id, ${FIELDS.join(', ')}) VALUES (?, ${FIELDS.map(() => '?').join(', ')})`,
      [userId, ...values]
    );
    await conn.commit();
    res.status(201).json({ id: r.insertId });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}));

router.put('/:id', requireRole('admin', 'manager'), wrap(async (req, res) => {
  const miss = missing(req.body, ['emp_code', 'first_name', 'last_name', 'email']);
  if (miss.length) return res.status(400).json({ message: `Missing: ${miss.join(', ')}` });
  const values = FIELDS.map((f) => emptyToNull(req.body[f]));
  values[FIELDS.indexOf('status')] = values[FIELDS.indexOf('status')] || 'active';
  await db().query(
    `UPDATE employees SET ${FIELDS.map((f) => `${f} = ?`).join(', ')} WHERE id = ?`,
    [...values, req.params.id]
  );
  res.json({ message: 'Employee updated' });
}));

router.delete('/:id', requireRole('admin', 'manager'), wrap(async (req, res) => {
  const [rows] = await db().query('SELECT user_id FROM employees WHERE id = ?', [req.params.id]);
  await db().query('DELETE FROM employees WHERE id = ?', [req.params.id]);
  if (rows[0] && rows[0].user_id) await db().query('DELETE FROM users WHERE id = ?', [rows[0].user_id]);
  res.json({ message: 'Employee deleted' });
}));

module.exports = router;

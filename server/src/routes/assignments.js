const router = require('express').Router();
const { db } = require('../db');
const { requireRole } = require('../middleware/auth');
const { wrap, missing, emptyToNull, getEmployeeIdForUser } = require('../utils');

const FIELDS = ['employee_id', 'client_id', 'role_title', 'start_date', 'end_date', 'bill_rate', 'status', 'notes'];

router.get('/', wrap(async (req, res) => {
  const where = [];
  const params = [];
  if (req.user.role === 'employee') {
    where.push('a.employee_id = ?');
    params.push(await getEmployeeIdForUser(req.user.id));
  } else {
    if (req.query.employee_id) { where.push('a.employee_id = ?'); params.push(req.query.employee_id); }
    if (req.query.client_id) { where.push('a.client_id = ?'); params.push(req.query.client_id); }
  }
  if (req.query.status) { where.push('a.status = ?'); params.push(req.query.status); }
  const [rows] = await db().query(
    `SELECT a.*, CONCAT(e.first_name, ' ', e.last_name) AS employee_name, e.emp_code, c.company_name
     FROM assignments a
     JOIN employees e ON e.id = a.employee_id
     JOIN clients c ON c.id = a.client_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY a.start_date DESC`,
    params
  );
  res.json(rows);
}));

async function validate(body, id) {
  const miss = missing(body, ['employee_id', 'client_id', 'role_title', 'start_date']);
  if (miss.length) return `Missing: ${miss.join(', ')}`;
  if (body.end_date && body.end_date < body.start_date) return 'End date cannot be before start date';
  if ((body.status || 'active') === 'active') {
    const [rows] = await db().query(
      "SELECT id FROM assignments WHERE employee_id = ? AND status = 'active' AND id <> ?",
      [body.employee_id, id || 0]
    );
    if (rows.length) return 'This employee already has an active assignment. Complete it first.';
  }
  return null;
}

router.post('/', requireRole('admin', 'manager'), wrap(async (req, res) => {
  const err = await validate(req.body);
  if (err) return res.status(400).json({ message: err });
  const values = FIELDS.map((f) => emptyToNull(req.body[f]));
  values[FIELDS.indexOf('status')] = values[FIELDS.indexOf('status')] || 'active';
  const [r] = await db().query(
    `INSERT INTO assignments (${FIELDS.join(', ')}) VALUES (${FIELDS.map(() => '?').join(', ')})`,
    values
  );
  res.status(201).json({ id: r.insertId });
}));

router.put('/:id', requireRole('admin', 'manager'), wrap(async (req, res) => {
  const err = await validate(req.body, req.params.id);
  if (err) return res.status(400).json({ message: err });
  const values = FIELDS.map((f) => emptyToNull(req.body[f]));
  values[FIELDS.indexOf('status')] = values[FIELDS.indexOf('status')] || 'active';
  await db().query(`UPDATE assignments SET ${FIELDS.map((f) => `${f} = ?`).join(', ')} WHERE id = ?`, [...values, req.params.id]);
  res.json({ message: 'Assignment updated' });
}));

router.delete('/:id', requireRole('admin', 'manager'), wrap(async (req, res) => {
  await db().query('DELETE FROM assignments WHERE id = ?', [req.params.id]);
  res.json({ message: 'Assignment deleted' });
}));

module.exports = router;

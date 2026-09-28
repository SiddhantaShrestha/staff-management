const router = require('express').Router();
const { db } = require('../db');
const { requireRole } = require('../middleware/auth');
const { wrap, missing, emptyToNull } = require('../utils');

const FIELDS = ['company_name', 'contact_person', 'email', 'phone', 'industry', 'address', 'status'];

router.use(requireRole('admin', 'manager'));

router.get('/', wrap(async (req, res) => {
  const { q, status } = req.query;
  const where = [];
  const params = [];
  if (q) {
    where.push('(c.company_name LIKE ? OR c.contact_person LIKE ? OR c.industry LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (status) { where.push('c.status = ?'); params.push(status); }
  const [rows] = await db().query(
    `SELECT c.*, COUNT(a.id) AS active_staff
     FROM clients c LEFT JOIN assignments a ON a.client_id = c.id AND a.status = 'active'
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     GROUP BY c.id ORDER BY c.id DESC`,
    params
  );
  res.json(rows);
}));

router.get('/:id', wrap(async (req, res) => {
  const [rows] = await db().query('SELECT * FROM clients WHERE id = ?', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: 'Client not found' });
  const [assignments] = await db().query(
    `SELECT a.*, CONCAT(e.first_name, ' ', e.last_name) AS employee_name, e.emp_code
     FROM assignments a JOIN employees e ON e.id = a.employee_id
     WHERE a.client_id = ? ORDER BY a.start_date DESC`,
    [req.params.id]
  );
  res.json({ ...rows[0], assignments });
}));

router.post('/', wrap(async (req, res) => {
  const miss = missing(req.body, ['company_name']);
  if (miss.length) return res.status(400).json({ message: 'Company name is required' });
  const values = FIELDS.map((f) => emptyToNull(req.body[f]));
  values[FIELDS.indexOf('status')] = values[FIELDS.indexOf('status')] || 'active';
  const [r] = await db().query(
    `INSERT INTO clients (${FIELDS.join(', ')}) VALUES (${FIELDS.map(() => '?').join(', ')})`,
    values
  );
  res.status(201).json({ id: r.insertId });
}));

router.put('/:id', wrap(async (req, res) => {
  const miss = missing(req.body, ['company_name']);
  if (miss.length) return res.status(400).json({ message: 'Company name is required' });
  const values = FIELDS.map((f) => emptyToNull(req.body[f]));
  values[FIELDS.indexOf('status')] = values[FIELDS.indexOf('status')] || 'active';
  await db().query(`UPDATE clients SET ${FIELDS.map((f) => `${f} = ?`).join(', ')} WHERE id = ?`, [...values, req.params.id]);
  res.json({ message: 'Client updated' });
}));

router.delete('/:id', wrap(async (req, res) => {
  await db().query('DELETE FROM clients WHERE id = ?', [req.params.id]);
  res.json({ message: 'Client deleted' });
}));

module.exports = router;

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { requireRole } = require('../middleware/auth');
const { wrap, missing } = require('../utils');

const ROLES = ['admin', 'manager', 'employee'];

router.use(requireRole('admin'));

router.get('/', wrap(async (req, res) => {
  const [rows] = await db().query(
    `SELECT u.id, u.name, u.email, u.role, u.created_at, e.id AS employee_id, e.emp_code
     FROM users u LEFT JOIN employees e ON e.user_id = u.id ORDER BY u.id`
  );
  res.json(rows);
}));

router.post('/', wrap(async (req, res) => {
  const miss = missing(req.body, ['name', 'email', 'password', 'role']);
  if (miss.length) return res.status(400).json({ message: `Missing: ${miss.join(', ')}` });
  const { name, email, password, role } = req.body;
  if (!ROLES.includes(role)) return res.status(400).json({ message: 'Invalid role' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
  const [r] = await db().query(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name, email, await bcrypt.hash(password, 10), role]
  );
  res.status(201).json({ id: r.insertId });
}));

router.put('/:id', wrap(async (req, res) => {
  const { name, email, role, password } = req.body;
  if (role && !ROLES.includes(role)) return res.status(400).json({ message: 'Invalid role' });
  if (Number(req.params.id) === req.user.id && role && role !== 'admin') {
    return res.status(400).json({ message: 'You cannot remove your own admin role' });
  }
  await db().query(
    'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), role = COALESCE(?, role) WHERE id = ?',
    [name || null, email || null, role || null, req.params.id]
  );
  if (password) {
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    await db().query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(password, 10), req.params.id]);
  }
  res.json({ message: 'User updated' });
}));

router.delete('/:id', wrap(async (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ message: 'You cannot delete yourself' });
  await db().query('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ message: 'User deleted' });
}));

module.exports = router;

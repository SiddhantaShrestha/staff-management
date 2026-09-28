const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');
const { wrap, getEmployeeIdForUser } = require('../utils');

router.post('/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
  const [rows] = await db().query('SELECT * FROM users WHERE email = ?', [email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ message: 'Wrong email or password' });
  }
  const employee_id = await getEmployeeIdForUser(user.id);
  res.json({
    token: signToken(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role, employee_id },
  });
}));

router.get('/me', requireAuth, wrap(async (req, res) => {
  const [rows] = await db().query('SELECT id, name, email, role FROM users WHERE id = ?', [req.user.id]);
  if (!rows[0]) return res.status(404).json({ message: 'User not found' });
  res.json({ ...rows[0], employee_id: await getEmployeeIdForUser(req.user.id) });
}));

router.post('/change-password', requireAuth, wrap(async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters' });
  }
  const [rows] = await db().query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
  if (!rows[0] || !(await bcrypt.compare(current_password || '', rows[0].password_hash))) {
    return res.status(400).json({ message: 'Current password is wrong' });
  }
  await db().query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(new_password, 10), req.user.id]);
  res.json({ message: 'Password changed' });
}));

module.exports = router;

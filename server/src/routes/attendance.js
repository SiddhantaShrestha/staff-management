const router = require('express').Router();
const { db } = require('../db');
const { requireRole } = require('../middleware/auth');
const { wrap, getEmployeeIdForUser } = require('../utils');

const STATUSES = ['present', 'absent', 'half_day', 'leave'];

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function nowTime() {
  return new Date().toTimeString().slice(0, 8);
}

// Daily sheet: every active employee with their record for the date (if any)
router.get('/daily', requireRole('admin', 'manager'), wrap(async (req, res) => {
  const date = req.query.date || today();
  const [rows] = await db().query(
    `SELECT e.id AS employee_id, e.emp_code, CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
            at.status, at.check_in, at.check_out
     FROM employees e
     LEFT JOIN attendance at ON at.employee_id = e.id AND at.date = ?
     WHERE e.status <> 'inactive'
     ORDER BY e.first_name`,
    [date]
  );
  res.json({ date, rows });
}));

router.post('/daily', requireRole('admin', 'manager'), wrap(async (req, res) => {
  const { date, records } = req.body;
  if (!date || !Array.isArray(records)) return res.status(400).json({ message: 'Date and records are required' });
  for (const r of records) {
    if (!r.status) continue;
    if (!STATUSES.includes(r.status)) return res.status(400).json({ message: `Invalid status: ${r.status}` });
    await db().query(
      `INSERT INTO attendance (employee_id, date, status, check_in, check_out) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), check_in = VALUES(check_in), check_out = VALUES(check_out)`,
      [r.employee_id, date, r.status, r.check_in || null, r.check_out || null]
    );
  }
  res.json({ message: 'Attendance saved' });
}));

// Own attendance history for a month (employees), or any employee (admin/manager)
router.get('/', wrap(async (req, res) => {
  const month = req.query.month || today().slice(0, 7);
  let employeeId = req.query.employee_id;
  if (req.user.role === 'employee') employeeId = await getEmployeeIdForUser(req.user.id);
  if (!employeeId) return res.status(400).json({ message: 'employee_id is required' });
  const [rows] = await db().query(
    "SELECT * FROM attendance WHERE employee_id = ? AND DATE_FORMAT(date, '%Y-%m') = ? ORDER BY date DESC",
    [employeeId, month]
  );
  res.json(rows);
}));

router.post('/check-in', wrap(async (req, res) => {
  const employeeId = await getEmployeeIdForUser(req.user.id);
  if (!employeeId) return res.status(400).json({ message: 'Your account is not linked to an employee' });
  const [rows] = await db().query('SELECT * FROM attendance WHERE employee_id = ? AND date = ?', [employeeId, today()]);
  if (rows[0] && rows[0].check_in) return res.status(400).json({ message: 'Already checked in today' });
  await db().query(
    `INSERT INTO attendance (employee_id, date, status, check_in) VALUES (?, ?, 'present', ?)
     ON DUPLICATE KEY UPDATE status = 'present', check_in = VALUES(check_in)`,
    [employeeId, today(), nowTime()]
  );
  res.json({ message: 'Checked in' });
}));

router.post('/check-out', wrap(async (req, res) => {
  const employeeId = await getEmployeeIdForUser(req.user.id);
  if (!employeeId) return res.status(400).json({ message: 'Your account is not linked to an employee' });
  const [rows] = await db().query('SELECT * FROM attendance WHERE employee_id = ? AND date = ?', [employeeId, today()]);
  if (!rows[0] || !rows[0].check_in) return res.status(400).json({ message: 'You have not checked in today' });
  if (rows[0].check_out) return res.status(400).json({ message: 'Already checked out today' });
  await db().query('UPDATE attendance SET check_out = ? WHERE id = ?', [nowTime(), rows[0].id]);
  res.json({ message: 'Checked out' });
}));

module.exports = router;

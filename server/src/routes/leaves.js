const router = require('express').Router();
const { db } = require('../db');
const { requireRole } = require('../middleware/auth');
const { wrap, missing, getEmployeeIdForUser } = require('../utils');

const TYPES = ['sick', 'casual', 'annual', 'unpaid'];

router.get('/', wrap(async (req, res) => {
  const where = [];
  const params = [];
  if (req.user.role === 'employee') {
    where.push('l.employee_id = ?');
    params.push(await getEmployeeIdForUser(req.user.id));
  } else if (req.query.employee_id) {
    where.push('l.employee_id = ?');
    params.push(req.query.employee_id);
  }
  if (req.query.status) { where.push('l.status = ?'); params.push(req.query.status); }
  const [rows] = await db().query(
    `SELECT l.*, CONCAT(e.first_name, ' ', e.last_name) AS employee_name, e.emp_code, u.name AS reviewer_name,
            DATEDIFF(l.end_date, l.start_date) + 1 AS days
     FROM leaves l
     JOIN employees e ON e.id = l.employee_id
     LEFT JOIN users u ON u.id = l.reviewed_by
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY l.created_at DESC`,
    params
  );
  res.json(rows);
}));

router.post('/', wrap(async (req, res) => {
  let employeeId = req.body.employee_id;
  if (req.user.role === 'employee') employeeId = await getEmployeeIdForUser(req.user.id);
  if (!employeeId) return res.status(400).json({ message: 'Employee is required' });
  const miss = missing(req.body, ['leave_type', 'start_date', 'end_date']);
  if (miss.length) return res.status(400).json({ message: `Missing: ${miss.join(', ')}` });
  if (!TYPES.includes(req.body.leave_type)) return res.status(400).json({ message: 'Invalid leave type' });
  if (req.body.end_date < req.body.start_date) return res.status(400).json({ message: 'End date cannot be before start date' });
  const [r] = await db().query(
    'INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason) VALUES (?, ?, ?, ?, ?)',
    [employeeId, req.body.leave_type, req.body.start_date, req.body.end_date, req.body.reason || null]
  );
  res.status(201).json({ id: r.insertId });
}));

router.put('/:id/status', requireRole('admin', 'manager'), wrap(async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
  const [rows] = await db().query('SELECT * FROM leaves WHERE id = ?', [req.params.id]);
  const leave = rows[0];
  if (!leave) return res.status(404).json({ message: 'Leave not found' });
  await db().query('UPDATE leaves SET status = ?, reviewed_by = ? WHERE id = ?', [status, req.user.id, leave.id]);

  if (status === 'approved') {
    // Mark each day of the approved leave in attendance
    const d = new Date(`${leave.start_date}T00:00:00`);
    const end = new Date(`${leave.end_date}T00:00:00`);
    while (d <= end) {
      const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      await db().query(
        `INSERT INTO attendance (employee_id, date, status) VALUES (?, ?, 'leave')
         ON DUPLICATE KEY UPDATE status = 'leave'`,
        [leave.employee_id, day]
      );
      d.setDate(d.getDate() + 1);
    }
  }
  res.json({ message: `Leave ${status}` });
}));

router.delete('/:id', wrap(async (req, res) => {
  const [rows] = await db().query('SELECT * FROM leaves WHERE id = ?', [req.params.id]);
  const leave = rows[0];
  if (!leave) return res.status(404).json({ message: 'Leave not found' });
  if (req.user.role === 'employee') {
    const own = await getEmployeeIdForUser(req.user.id);
    if (leave.employee_id !== own || leave.status !== 'pending') {
      return res.status(403).json({ message: 'You can only cancel your own pending requests' });
    }
  }
  await db().query('DELETE FROM leaves WHERE id = ?', [leave.id]);
  res.json({ message: 'Leave request removed' });
}));

module.exports = router;

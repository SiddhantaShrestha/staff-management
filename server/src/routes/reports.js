const router = require('express').Router();
const { db } = require('../db');
const { requireRole } = require('../middleware/auth');
const { wrap } = require('../utils');

router.use(requireRole('admin', 'manager'));

const currentMonth = () => new Date().toISOString().slice(0, 7);

router.get('/employees', wrap(async (req, res) => {
  const [rows] = await db().query(`
    SELECT e.emp_code, CONCAT(e.first_name, ' ', e.last_name) AS name, e.email, e.department, e.designation,
           e.status, e.join_date, e.salary,
           (SELECT c.company_name FROM assignments a JOIN clients c ON c.id = a.client_id
            WHERE a.employee_id = e.id AND a.status = 'active' LIMIT 1) AS current_client
    FROM employees e ORDER BY e.emp_code`);
  res.json(rows);
}));

router.get('/bench', wrap(async (req, res) => {
  const [rows] = await db().query(`
    SELECT e.emp_code, CONCAT(e.first_name, ' ', e.last_name) AS name, e.department, e.designation, e.skills,
           (SELECT MAX(a.end_date) FROM assignments a WHERE a.employee_id = e.id) AS last_assignment_end
    FROM employees e
    WHERE e.status = 'active'
      AND NOT EXISTS (SELECT 1 FROM assignments a WHERE a.employee_id = e.id AND a.status = 'active')
    ORDER BY e.emp_code`);
  res.json(rows);
}));

router.get('/client-billing', wrap(async (req, res) => {
  const [rows] = await db().query(`
    SELECT c.company_name, c.status, COUNT(a.id) AS active_staff,
           COALESCE(SUM(a.bill_rate), 0) AS monthly_billing,
           COALESCE(SUM(e.salary), 0) AS monthly_cost,
           COALESCE(SUM(a.bill_rate), 0) - COALESCE(SUM(e.salary), 0) AS monthly_margin
    FROM clients c
    LEFT JOIN assignments a ON a.client_id = c.id AND a.status = 'active'
    LEFT JOIN employees e ON e.id = a.employee_id
    GROUP BY c.id ORDER BY monthly_billing DESC`);
  res.json(rows);
}));

router.get('/attendance', wrap(async (req, res) => {
  const month = req.query.month || currentMonth();
  const [rows] = await db().query(`
    SELECT e.emp_code, CONCAT(e.first_name, ' ', e.last_name) AS name,
           COALESCE(SUM(at.status = 'present'), 0) AS present,
           COALESCE(SUM(at.status = 'half_day'), 0) AS half_day,
           COALESCE(SUM(at.status = 'absent'), 0) AS absent,
           COALESCE(SUM(at.status = 'leave'), 0) AS on_leave
    FROM employees e
    LEFT JOIN attendance at ON at.employee_id = e.id AND DATE_FORMAT(at.date, '%Y-%m') = ?
    GROUP BY e.id ORDER BY e.emp_code`, [month]);
  res.json(rows);
}));

router.get('/leaves', wrap(async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const [rows] = await db().query(`
    SELECT e.emp_code, CONCAT(e.first_name, ' ', e.last_name) AS name,
           COALESCE(SUM(CASE WHEN l.status = 'approved' AND l.leave_type = 'sick' THEN DATEDIFF(l.end_date, l.start_date) + 1 END), 0) AS sick,
           COALESCE(SUM(CASE WHEN l.status = 'approved' AND l.leave_type = 'casual' THEN DATEDIFF(l.end_date, l.start_date) + 1 END), 0) AS casual,
           COALESCE(SUM(CASE WHEN l.status = 'approved' AND l.leave_type = 'annual' THEN DATEDIFF(l.end_date, l.start_date) + 1 END), 0) AS annual,
           COALESCE(SUM(CASE WHEN l.status = 'approved' AND l.leave_type = 'unpaid' THEN DATEDIFF(l.end_date, l.start_date) + 1 END), 0) AS unpaid,
           COALESCE(SUM(l.status = 'pending'), 0) AS pending_requests
    FROM employees e
    LEFT JOIN leaves l ON l.employee_id = e.id AND YEAR(l.start_date) = ?
    GROUP BY e.id ORDER BY e.emp_code`, [year]);
  res.json(rows);
}));

module.exports = router;

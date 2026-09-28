const router = require('express').Router();
const { db } = require('../db');
const { wrap, getEmployeeIdForUser } = require('../utils');

const one = async (sql, params = []) => (await db().query(sql, params))[0][0];
const all = async (sql, params = []) => (await db().query(sql, params))[0];

router.get('/', wrap(async (req, res) => {
  if (req.user.role === 'employee') {
    const employeeId = await getEmployeeIdForUser(req.user.id);
    if (!employeeId) return res.json({ role: 'employee', linked: false });
    const employee = await one('SELECT * FROM employees WHERE id = ?', [employeeId]);
    const assignment = await one(
      `SELECT a.*, c.company_name, c.address AS client_address FROM assignments a JOIN clients c ON c.id = a.client_id
       WHERE a.employee_id = ? AND a.status = 'active' LIMIT 1`,
      [employeeId]
    );
    const todayAttendance = await one('SELECT * FROM attendance WHERE employee_id = ? AND date = CURDATE()', [employeeId]);
    const month = await one(
      `SELECT SUM(status = 'present') AS present, SUM(status = 'absent') AS absent,
              SUM(status = 'half_day') AS half_day, SUM(status = 'leave') AS on_leave
       FROM attendance WHERE employee_id = ? AND DATE_FORMAT(date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')`,
      [employeeId]
    );
    const leaves = await one(
      `SELECT SUM(status = 'pending') AS pending, SUM(status = 'approved') AS approved,
              COALESCE(SUM(CASE WHEN status = 'approved' THEN DATEDIFF(end_date, start_date) + 1 END), 0) AS days_taken
       FROM leaves WHERE employee_id = ? AND YEAR(start_date) = YEAR(CURDATE())`,
      [employeeId]
    );
    return res.json({ role: 'employee', linked: true, employee, assignment, todayAttendance, month, leaves });
  }

  const counts = await one(`
    SELECT
      (SELECT COUNT(*) FROM employees) AS employees,
      (SELECT COUNT(*) FROM employees WHERE status = 'active') AS active_employees,
      (SELECT COUNT(*) FROM clients WHERE status = 'active') AS active_clients,
      (SELECT COUNT(*) FROM assignments WHERE status = 'active') AS active_assignments,
      (SELECT COUNT(*) FROM leaves WHERE status = 'pending') AS pending_leaves,
      (SELECT COUNT(*) FROM employees e WHERE e.status = 'active'
         AND NOT EXISTS (SELECT 1 FROM assignments a WHERE a.employee_id = e.id AND a.status = 'active')) AS on_bench,
      (SELECT COALESCE(SUM(bill_rate), 0) FROM assignments WHERE status = 'active') AS monthly_billing,
      (SELECT COALESCE(SUM(salary), 0) FROM employees WHERE status <> 'inactive') AS monthly_payroll
  `);
  const todayAttendance = await one(`
    SELECT SUM(status = 'present') AS present, SUM(status = 'absent') AS absent,
           SUM(status = 'half_day') AS half_day, SUM(status = 'leave') AS on_leave
    FROM attendance WHERE date = CURDATE()`);
  const byDepartment = await all(`
    SELECT COALESCE(NULLIF(department, ''), 'Unassigned') AS name, COUNT(*) AS value
    FROM employees GROUP BY name ORDER BY value DESC`);
  const byClient = await all(`
    SELECT c.company_name AS name, COUNT(a.id) AS value
    FROM clients c JOIN assignments a ON a.client_id = c.id AND a.status = 'active'
    GROUP BY c.id ORDER BY value DESC LIMIT 8`);
  const recentLeaves = await all(`
    SELECT l.id, l.leave_type, l.start_date, l.end_date, CONCAT(e.first_name, ' ', e.last_name) AS employee_name
    FROM leaves l JOIN employees e ON e.id = l.employee_id
    WHERE l.status = 'pending' ORDER BY l.created_at DESC LIMIT 5`);
  const endingSoon = await all(`
    SELECT a.id, a.end_date, a.role_title, CONCAT(e.first_name, ' ', e.last_name) AS employee_name, c.company_name
    FROM assignments a JOIN employees e ON e.id = a.employee_id JOIN clients c ON c.id = a.client_id
    WHERE a.status = 'active' AND a.end_date IS NOT NULL AND a.end_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
    ORDER BY a.end_date LIMIT 5`);

  res.json({ role: req.user.role, counts, todayAttendance, byDepartment, byClient, recentLeaves, endingSoon });
}));

module.exports = router;

const bcrypt = require('bcryptjs');
const { db } = require('./db');

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysFromToday = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };

async function seedIfEmpty() {
  const [[{ n }]] = await db().query('SELECT COUNT(*) AS n FROM users');
  if (n > 0) return;
  console.log('Empty database, adding demo data...');

  const hash = (p) => bcrypt.hash(p, 10);
  const q = (sql, params) => db().query(sql, params);

  await q('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['System Admin', 'admin@staffhub.com', await hash('admin123'), 'admin']);
  await q('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['Hannah Manager', 'manager@staffhub.com', await hash('manager123'), 'manager']);
  const [empUser] = await q('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['Ravi Sharma', 'ravi@staffhub.com', await hash('employee123'), 'employee']);

  const employees = [
    ['EMP001', 'Ravi', 'Sharma', 'ravi@staffhub.com', '9800000001', 'Software Developer', 'IT', 'React, Node.js', 60000, '2024-02-10'],
    ['EMP002', 'Anita', 'Gurung', 'anita@staffhub.com', '9800000002', 'QA Engineer', 'IT', 'Selenium, Manual testing', 50000, '2024-05-01'],
    ['EMP003', 'John', 'Smith', 'john@staffhub.com', '9800000003', 'Accountant', 'Finance', 'Tally, Excel', 45000, '2023-11-15'],
    ['EMP004', 'Sita', 'Thapa', 'sita@staffhub.com', '9800000004', 'Customer Support', 'Support', 'English, CRM', 35000, '2025-01-20'],
    ['EMP005', 'Bikash', 'Rai', 'bikash@staffhub.com', '9800000005', 'Network Engineer', 'IT', 'Cisco, Linux', 55000, '2024-08-05'],
    ['EMP006', 'Priya', 'Karki', 'priya@staffhub.com', '9800000006', 'HR Executive', 'HR', 'Recruitment, Payroll', 42000, '2025-03-11'],
    ['EMP007', 'Aman', 'Shrestha', 'aman@staffhub.com', '9800000007', 'Data Entry Operator', 'Operations', 'Typing, Excel', 28000, '2025-06-01'],
    ['EMP008', 'Maya', 'Tamang', 'maya@staffhub.com', '9800000008', 'UI Designer', 'IT', 'Figma, CSS', 52000, '2024-10-12'],
    ['EMP009', 'David', 'Lee', 'david@staffhub.com', '9800000009', 'Security Guard', 'Facilities', 'First aid', 25000, '2025-02-02'],
    ['EMP010', 'Nisha', 'Adhikari', 'nisha@staffhub.com', '9800000010', 'Call Center Agent', 'Support', 'Hindi, English', 30000, '2025-07-15'],
  ];
  const empIds = [];
  for (const [i, e] of employees.entries()) {
    const [r] = await q(
      `INSERT INTO employees (user_id, emp_code, first_name, last_name, email, phone, designation, department, skills, salary, join_date, status, address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'Kathmandu')`,
      [i === 0 ? empUser.insertId : null, ...e]
    );
    empIds.push(r.insertId);
  }

  const clients = [
    ['TechNova Solutions', 'Mark Wilson', 'mark@technova.com', '014400001', 'Software', 'Lalitpur'],
    ['Himalayan Bank', 'Rita Joshi', 'rita@hbank.com', '014400002', 'Banking', 'Kathmandu'],
    ['CareFirst Hospital', 'Dr. Suman KC', 'suman@carefirst.com', '014400003', 'Healthcare', 'Bhaktapur'],
    ['QuickMart Retail', 'Anil Basnet', 'anil@quickmart.com', '014400004', 'Retail', 'Pokhara'],
    ['GlobalCall BPO', 'Sarah Brown', 'sarah@globalcall.com', '014400005', 'BPO', 'Kathmandu'],
  ];
  const clientIds = [];
  for (const c of clients) {
    const [r] = await q(
      'INSERT INTO clients (company_name, contact_person, email, phone, industry, address) VALUES (?, ?, ?, ?, ?, ?)', c
    );
    clientIds.push(r.insertId);
  }

  const assignments = [
    [0, 0, 'Frontend Developer', '2025-01-01', daysFromToday(20), 95000, 'active'],
    [1, 0, 'QA Tester', '2025-03-01', null, 80000, 'active'],
    [2, 1, 'Accounts Assistant', '2025-02-15', null, 70000, 'active'],
    [3, 4, 'Support Agent', '2025-04-01', daysFromToday(10), 55000, 'active'],
    [4, 1, 'Network Admin', '2025-05-10', null, 85000, 'active'],
    [8, 2, 'Security Staff', '2025-03-01', null, 40000, 'active'],
    [9, 4, 'Call Agent', '2025-08-01', null, 48000, 'active'],
    [6, 3, 'Data Entry', '2025-06-10', '2026-06-10', 42000, 'completed'],
  ];
  for (const [e, c, role, start, end, rate, status] of assignments) {
    await q(
      'INSERT INTO assignments (employee_id, client_id, role_title, start_date, end_date, bill_rate, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [empIds[e], clientIds[c], role, start, end, rate, status]
    );
  }

  for (let day = -6; day <= -1; day++) {
    for (const [i, id] of empIds.entries()) {
      const status = (i + day) % 7 === 0 ? 'absent' : (i + day) % 5 === 0 ? 'half_day' : 'present';
      await q(
        'INSERT INTO attendance (employee_id, date, status, check_in, check_out) VALUES (?, ?, ?, ?, ?)',
        [id, daysFromToday(day), status, status === 'absent' ? null : '09:00:00', status === 'absent' ? null : status === 'half_day' ? '13:00:00' : '17:30:00']
      );
    }
  }

  await q("INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason) VALUES (?, 'sick', ?, ?, 'Fever')",
    [empIds[1], daysFromToday(2), daysFromToday(3)]);
  await q("INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason) VALUES (?, 'annual', ?, ?, 'Family trip')",
    [empIds[5], daysFromToday(7), daysFromToday(11)]);
  await q("INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, status, reviewed_by) VALUES (?, 'casual', ?, ?, 'Personal work', 'approved', 2)",
    [empIds[0], '2026-08-12', '2026-08-12']);

  console.log('Demo data added.');
}

module.exports = { seedIfEmpty };

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import api, { errMsg } from '../api';
import { useToast } from '../components/Toast';
import Badge from '../components/Badge';
import { fmtDate, label, money } from '../utils';

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#64748b'];

function Stat({ title, value, sub, to }) {
  const body = (
    <div className="stat">
      <div className="stat-title">{title}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
  return to ? <Link to={to} className="stat-link">{body}</Link> : body;
}

export default function Dashboard() {
  const toast = useToast();
  const [data, setData] = useState(null);

  const load = () => api.get('/dashboard').then((r) => setData(r.data)).catch((e) => toast(errMsg(e), 'error'));
  useEffect(() => { load(); }, []);

  if (!data) return <div className="loading">Loading...</div>;
  if (data.role === 'employee') return <EmployeeDashboard data={data} reload={load} />;

  const c = data.counts;
  const t = data.todayAttendance;
  const margin = Number(c.monthly_billing) - Number(c.monthly_payroll);
  const attendanceChart = [
    { name: 'Present', value: Number(t.present || 0) },
    { name: 'Half day', value: Number(t.half_day || 0) },
    { name: 'Absent', value: Number(t.absent || 0) },
    { name: 'On leave', value: Number(t.on_leave || 0) },
  ];
  const marked = attendanceChart.reduce((s, x) => s + x.value, 0);

  return (
    <div>
      <div className="page-head"><h1>Dashboard</h1></div>

      <div className="stats">
        <Stat title="Total Employees" value={c.employees} sub={`${c.active_employees} active`} to="/employees" />
        <Stat title="Deployed Staff" value={c.active_assignments} sub={`${c.on_bench} on bench`} to="/assignments" />
        <Stat title="Active Clients" value={c.active_clients} to="/clients" />
        <Stat title="Pending Leaves" value={c.pending_leaves} to="/leaves" />
        <Stat title="Monthly Billing" value={money(c.monthly_billing)} sub={`Payroll ${money(c.monthly_payroll)}`} />
        <Stat title="Monthly Margin" value={money(margin)} sub={margin >= 0 ? 'Profit' : 'Loss'} />
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Staff by Client</h3>
          {data.byClient.length === 0 ? <p className="muted">No active assignments.</p> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.byClient}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Staff" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card">
          <h3>Employees by Department</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.byDepartment} dataKey="value" nameKey="name" outerRadius={90} label>
                {data.byDepartment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-3">
        <div className="card">
          <h3>Today's Attendance</h3>
          {marked === 0 ? <p className="muted">Not marked yet. <Link to="/attendance">Mark now</Link></p> : (
            <ul className="list">
              {attendanceChart.map((a) => <li key={a.name}><span>{a.name}</span><strong>{a.value}</strong></li>)}
            </ul>
          )}
        </div>
        <div className="card">
          <h3>Pending Leave Requests</h3>
          {data.recentLeaves.length === 0 ? <p className="muted">Nothing pending.</p> : (
            <ul className="list">
              {data.recentLeaves.map((l) => (
                <li key={l.id}>
                  <span>{l.employee_name} <small className="muted">({label(l.leave_type)})</small></span>
                  <small>{fmtDate(l.start_date)}</small>
                </li>
              ))}
            </ul>
          )}
          <Link to="/leaves" className="card-link">View all</Link>
        </div>
        <div className="card">
          <h3>Assignments Ending in 30 Days</h3>
          {data.endingSoon.length === 0 ? <p className="muted">None ending soon.</p> : (
            <ul className="list">
              {data.endingSoon.map((a) => (
                <li key={a.id}>
                  <span>{a.employee_name} <small className="muted">@ {a.company_name}</small></span>
                  <small>{fmtDate(a.end_date)}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function EmployeeDashboard({ data, reload }) {
  const toast = useToast();
  if (!data.linked) {
    return <div className="card"><p>Your login is not linked to an employee record. Please contact HR.</p></div>;
  }
  const { employee, assignment, todayAttendance: t, month, leaves } = data;

  const punch = async (type) => {
    try {
      const r = await api.post(`/attendance/${type}`);
      toast(r.data.message);
      reload();
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  return (
    <div>
      <div className="page-head"><h1>Welcome, {employee.first_name}</h1></div>

      <div className="grid-2">
        <div className="card">
          <h3>Today</h3>
          <p>Status: <Badge value={t?.status} /></p>
          <p>Check in: <strong>{t?.check_in || '-'}</strong> &nbsp; Check out: <strong>{t?.check_out || '-'}</strong></p>
          <div className="row-gap">
            <button className="btn btn-primary" disabled={!!t?.check_in} onClick={() => punch('check-in')}>Check In</button>
            <button className="btn btn-light" disabled={!t?.check_in || !!t?.check_out} onClick={() => punch('check-out')}>Check Out</button>
          </div>
        </div>
        <div className="card">
          <h3>Current Assignment</h3>
          {assignment ? (
            <>
              <p><strong>{assignment.company_name}</strong></p>
              <p>Role: {assignment.role_title}</p>
              <p>From {fmtDate(assignment.start_date)} to {assignment.end_date ? fmtDate(assignment.end_date) : 'ongoing'}</p>
              {assignment.client_address && <p className="muted">{assignment.client_address}</p>}
            </>
          ) : <p className="muted">You are not assigned to any client right now.</p>}
        </div>
      </div>

      <div className="stats">
        <Stat title="Present (this month)" value={month.present || 0} />
        <Stat title="Half days" value={month.half_day || 0} />
        <Stat title="Absent" value={month.absent || 0} />
        <Stat title="Leave days taken (year)" value={leaves.days_taken || 0} to="/leaves" />
        <Stat title="Pending leave requests" value={leaves.pending || 0} to="/leaves" />
      </div>

      <div className="card">
        <h3>My Details</h3>
        <div className="details">
          <div><span>Employee Code</span>{employee.emp_code}</div>
          <div><span>Designation</span>{employee.designation || '-'}</div>
          <div><span>Department</span>{employee.department || '-'}</div>
          <div><span>Email</span>{employee.email}</div>
          <div><span>Phone</span>{employee.phone || '-'}</div>
          <div><span>Joined</span>{fmtDate(employee.join_date)}</div>
        </div>
      </div>
    </div>
  );
}

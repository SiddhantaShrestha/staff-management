import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { useToast } from '../components/Toast';
import { exportCsv, fmtDate, label, money, todayStr } from '../utils';

const REPORTS = {
  employees: {
    title: 'Employee Report',
    columns: [
      { key: 'emp_code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'department', label: 'Department' },
      { key: 'designation', label: 'Designation' }, { key: 'current_client', label: 'Deployed At', fmt: (v) => v || 'Bench' },
      { key: 'join_date', label: 'Joined', fmt: fmtDate }, { key: 'salary', label: 'Salary', fmt: money },
      { key: 'status', label: 'Status', fmt: label },
    ],
  },
  bench: {
    title: 'Bench Report (Unassigned Staff)',
    columns: [
      { key: 'emp_code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'department', label: 'Department' },
      { key: 'designation', label: 'Designation' }, { key: 'skills', label: 'Skills' },
      { key: 'last_assignment_end', label: 'Last Assignment Ended', fmt: fmtDate },
    ],
  },
  'client-billing': {
    title: 'Client Billing Report (Monthly)',
    columns: [
      { key: 'company_name', label: 'Client' }, { key: 'active_staff', label: 'Active Staff' },
      { key: 'monthly_billing', label: 'Billing', fmt: money }, { key: 'monthly_cost', label: 'Salary Cost', fmt: money },
      { key: 'monthly_margin', label: 'Margin', fmt: money },
    ],
    total: ['active_staff', 'monthly_billing', 'monthly_cost', 'monthly_margin'],
  },
  attendance: {
    title: 'Monthly Attendance Report',
    period: 'month',
    columns: [
      { key: 'emp_code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'present', label: 'Present' },
      { key: 'half_day', label: 'Half Day' }, { key: 'absent', label: 'Absent' }, { key: 'on_leave', label: 'Leave' },
    ],
  },
  leaves: {
    title: 'Yearly Leave Report (approved days)',
    period: 'year',
    columns: [
      { key: 'emp_code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'sick', label: 'Sick' },
      { key: 'casual', label: 'Casual' }, { key: 'annual', label: 'Annual' }, { key: 'unpaid', label: 'Unpaid' },
      { key: 'pending_requests', label: 'Pending Requests' },
    ],
  },
};

export default function Reports() {
  const toast = useToast();
  const [type, setType] = useState('employees');
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState([]);
  const report = REPORTS[type];

  useEffect(() => {
    const params = report.period === 'month' ? { month } : report.period === 'year' ? { year } : {};
    api.get(`/reports/${type}`, { params }).then((r) => setRows(r.data)).catch((e) => toast(errMsg(e), 'error'));
  }, [type, month, year]);

  const cell = (c, r) => (c.fmt ? c.fmt(r[c.key]) : r[c.key] ?? '-');
  const totals = report.total && Object.fromEntries(report.total.map((k) => [k, rows.reduce((s, r) => s + Number(r[k] || 0), 0)]));

  return (
    <div>
      <div className="page-head no-print">
        <h1>Reports</h1>
        <div className="row-gap">
          <button className="btn btn-light" onClick={() => exportCsv(type, rows.map((r) => Object.fromEntries(report.columns.map((c) => [c.label, r[c.key] ?? '']))))}>
            Export Excel (CSV)
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>Print / Save PDF</button>
        </div>
      </div>

      <div className="tabs no-print">
        {Object.entries(REPORTS).map(([k, r]) => (
          <button key={k} className={`tab ${type === k ? 'tab-on' : ''}`} onClick={() => setType(k)}>{r.title.split(' (')[0]}</button>
        ))}
      </div>

      {report.period && (
        <div className="filters no-print">
          {report.period === 'month'
            ? <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            : <input type="number" value={year} min="2000" max="2100" onChange={(e) => setYear(e.target.value)} />}
        </div>
      )}

      <div className="card table-wrap print-area">
        <div className="print-head">
          <h2>{report.title}</h2>
          <p className="muted">
            StaffHub · Generated {fmtDate(todayStr())}
            {report.period === 'month' && ` · Month: ${month}`}
            {report.period === 'year' && ` · Year: ${year}`}
          </p>
        </div>
        <table>
          <thead><tr>{report.columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => <tr key={i}>{report.columns.map((c) => <td key={c.key}>{cell(c, r)}</td>)}</tr>)}
            {rows.length === 0 && <tr><td colSpan={report.columns.length} className="empty">No data.</td></tr>}
          </tbody>
          {totals && rows.length > 0 && (
            <tfoot>
              <tr>{report.columns.map((c, i) => (
                <td key={c.key}><strong>{i === 0 ? 'Total' : totals[c.key] !== undefined ? cell(c, totals) : ''}</strong></td>
              ))}</tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import Badge from '../components/Badge';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { fmtDate, todayStr } from '../utils';

const STATUSES = [
  { value: 'present', label: 'Present' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'absent', label: 'Absent' },
  { value: 'leave', label: 'Leave' },
];

export default function Attendance() {
  const { can } = useAuth();
  return can('admin', 'manager') ? <DailySheet /> : <MyAttendance />;
}

function DailySheet() {
  const toast = useToast();
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/attendance/daily', { params: { date } })
      .then((r) => setRows(r.data.rows.map((x) => ({
        ...x, check_in: x.check_in?.slice(0, 5) || '', check_out: x.check_out?.slice(0, 5) || '', status: x.status || '',
      }))))
      .catch((e) => toast(errMsg(e), 'error'));
  }, [date]);

  const update = (i, k, v) => setRows(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const markAll = (status) => setRows(rows.map((r) => ({
    ...r, status, check_in: status === 'present' && !r.check_in ? '09:00' : r.check_in,
    check_out: status === 'present' && !r.check_out ? '17:30' : r.check_out,
  })));

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/attendance/daily', { date, records: rows });
      toast('Attendance saved');
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const summary = STATUSES.map((s) => `${s.label}: ${rows.filter((r) => r.status === s.value).length}`).join(' · ');

  return (
    <div>
      <div className="page-head">
        <h1>Attendance</h1>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Attendance'}</button>
      </div>
      <div className="filters">
        <input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
        <button className="btn btn-light" onClick={() => markAll('present')}>Mark all present</button>
        <span className="muted">{summary}</span>
      </div>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Code</th><th>Employee</th><th>Status</th><th>Check In</th><th>Check Out</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.employee_id}>
                <td>{r.emp_code}</td>
                <td>{r.employee_name}</td>
                <td>
                  <div className="seg">
                    {STATUSES.map((s) => (
                      <button key={s.value} type="button"
                        className={`seg-btn ${r.status === s.value ? `seg-on seg-${s.value}` : ''}`}
                        onClick={() => update(i, 'status', s.value)}>{s.label}</button>
                    ))}
                  </div>
                </td>
                <td><input type="time" value={r.check_in} onChange={(e) => update(i, 'check_in', e.target.value)} disabled={r.status === 'absent' || r.status === 'leave'} /></td>
                <td><input type="time" value={r.check_out} onChange={(e) => update(i, 'check_out', e.target.value)} disabled={r.status === 'absent' || r.status === 'leave'} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="5" className="empty">No active employees.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MyAttendance() {
  const toast = useToast();
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get('/attendance', { params: { month } }).then((r) => setRows(r.data)).catch((e) => toast(errMsg(e), 'error'));
  }, [month]);

  return (
    <div>
      <div className="page-head"><h1>My Attendance</h1></div>
      <div className="filters">
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <span className="muted">{STATUSES.map((s) => `${s.label}: ${rows.filter((r) => r.status === s.value).length}`).join(' · ')}</span>
      </div>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Status</th><th>Check In</th><th>Check Out</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{fmtDate(r.date)}</td><td><Badge value={r.status} /></td>
                <td>{r.check_in || '-'}</td><td>{r.check_out || '-'}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="4" className="empty">No records for this month.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

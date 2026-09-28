import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { exportCsv, fmtDate, money, todayStr } from '../utils';

const EMPTY = { employee_id: '', client_id: '', role_title: '', start_date: todayStr(), end_date: '', bill_rate: '', status: 'active', notes: '' };

function AssignmentForm({ initial, onSaved, onCancel }) {
  const toast = useToast();
  const [form, setForm] = useState({
    ...EMPTY, ...initial,
    start_date: initial?.start_date?.slice(0, 10) || EMPTY.start_date,
    end_date: initial?.end_date?.slice(0, 10) || '',
  });
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    api.get('/employees').then((r) => setEmployees(r.data));
    api.get('/clients').then((r) => setClients(r.data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial?.id) await api.put(`/assignments/${initial.id}`, form);
      else await api.post('/assignments', form);
      toast(initial?.id ? 'Assignment updated' : 'Staff assigned');
      onSaved();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="form-grid">
      <label>Employee *
        <select value={form.employee_id} onChange={set('employee_id')} required>
          <option value="">Select employee</option>
          {employees.filter((e) => e.status !== 'inactive' || String(e.id) === String(form.employee_id)).map((e) => (
            <option key={e.id} value={e.id}>
              {e.emp_code} - {e.first_name} {e.last_name} {e.current_client ? `(at ${e.current_client})` : '(bench)'}
            </option>
          ))}
        </select>
      </label>
      <label>Client *
        <select value={form.client_id} onChange={set('client_id')} required>
          <option value="">Select client</option>
          {clients.filter((c) => c.status === 'active' || String(c.id) === String(form.client_id)).map((c) => (
            <option key={c.id} value={c.id}>{c.company_name}</option>
          ))}
        </select>
      </label>
      <label>Role at Client *<input value={form.role_title} onChange={set('role_title')} required /></label>
      <label>Bill Rate (per month)<input type="number" min="0" value={form.bill_rate || ''} onChange={set('bill_rate')} /></label>
      <label>Start Date *<input type="date" value={form.start_date} onChange={set('start_date')} required /></label>
      <label>End Date<input type="date" value={form.end_date} onChange={set('end_date')} /></label>
      <label>Status
        <select value={form.status} onChange={set('status')}>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </label>
      <label>Notes<input value={form.notes || ''} onChange={set('notes')} /></label>
      <div className="form-actions span-2">
        <button type="button" className="btn btn-light" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );
}

export default function Assignments() {
  const toast = useToast();
  const { can } = useAuth();
  const isStaff = can('admin', 'manager');
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState(isStaff ? 'active' : '');
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/assignments', { params: { status } })
      .then((r) => setRows(r.data))
      .catch((e) => toast(errMsg(e), 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [status]);

  const complete = async (a) => {
    if (!confirm(`Mark ${a.employee_name}'s assignment at ${a.company_name} as completed?`)) return;
    try {
      await api.put(`/assignments/${a.id}`, { ...a, status: 'completed', end_date: a.end_date || todayStr() });
      toast('Assignment completed');
      load();
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  const remove = async (a) => {
    if (!confirm('Delete this assignment?')) return;
    try {
      await api.delete(`/assignments/${a.id}`);
      toast('Assignment deleted');
      load();
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>{isStaff ? 'Assignments' : 'My Assignments'}</h1>
        {isStaff && (
          <div className="row-gap">
            <button className="btn btn-light" onClick={() => exportCsv('assignments', rows.map((r) => ({
              Employee: r.employee_name, Code: r.emp_code, Client: r.company_name, Role: r.role_title,
              Start: r.start_date, End: r.end_date || '', 'Bill Rate': r.bill_rate, Status: r.status,
            })))}>Export CSV</button>
            <button className="btn btn-primary" onClick={() => setEditing({})}>+ Assign Staff</button>
          </div>
        )}
      </div>

      <div className="filters">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>{isStaff && <th>Employee</th>}<th>Client</th><th>Role</th><th>Start</th><th>End</th>{isStaff && <th>Bill Rate / Month</th>}<th>Status</th>{isStaff && <th></th>}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                {isStaff && <td><Link to={`/employees/${r.employee_id}`}>{r.employee_name}</Link> <span className="muted small">{r.emp_code}</span></td>}
                <td>{isStaff ? <Link to={`/clients/${r.client_id}`}>{r.company_name}</Link> : r.company_name}</td>
                <td>{r.role_title}</td>
                <td>{fmtDate(r.start_date)}</td>
                <td>{r.end_date ? fmtDate(r.end_date) : 'Ongoing'}</td>
                {isStaff && <td>{money(r.bill_rate)}</td>}
                <td><Badge value={r.status} /></td>
                {isStaff && (
                  <td className="actions">
                    {r.status === 'active' && <button className="btn btn-sm btn-light" onClick={() => complete(r)}>Complete</button>}
                    <button className="btn btn-sm btn-light" onClick={() => setEditing(r)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(r)}>Delete</button>
                  </td>
                )}
              </tr>
            ))}
            {!loading && rows.length === 0 && <tr><td colSpan="8" className="empty">No assignments found.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing.id ? 'Edit Assignment' : 'Assign Staff to Client'} onClose={() => setEditing(null)} wide>
          <AssignmentForm initial={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
        </Modal>
      )}
    </div>
  );
}

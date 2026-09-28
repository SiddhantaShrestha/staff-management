import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { useToast } from '../components/Toast';
import { exportCsv, fmtDate, money } from '../utils';

const EMPTY = {
  emp_code: '', first_name: '', last_name: '', email: '', phone: '', designation: '', department: '',
  skills: '', salary: '', join_date: '', status: 'active', address: '', create_login: false, password: '',
};

export function EmployeeForm({ initial, onSaved, onCancel }) {
  const toast = useToast();
  const [form, setForm] = useState({ ...EMPTY, ...initial, join_date: initial?.join_date?.slice(0, 10) || '' });
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial?.id;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) await api.put(`/employees/${initial.id}`, form);
      else await api.post('/employees', form);
      toast(isEdit ? 'Employee updated' : 'Employee added');
      onSaved();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="form-grid">
      <label>Employee Code *<input value={form.emp_code} onChange={set('emp_code')} required placeholder="EMP011" /></label>
      <label>Status
        <select value={form.status} onChange={set('status')}>
          <option value="active">Active</option>
          <option value="on_leave">On Leave</option>
          <option value="inactive">Inactive</option>
        </select>
      </label>
      <label>First Name *<input value={form.first_name} onChange={set('first_name')} required /></label>
      <label>Last Name *<input value={form.last_name} onChange={set('last_name')} required /></label>
      <label>Email *<input type="email" value={form.email} onChange={set('email')} required /></label>
      <label>Phone<input value={form.phone || ''} onChange={set('phone')} /></label>
      <label>Designation<input value={form.designation || ''} onChange={set('designation')} /></label>
      <label>Department<input value={form.department || ''} onChange={set('department')} placeholder="IT, Finance, Support..." /></label>
      <label>Monthly Salary<input type="number" min="0" value={form.salary || ''} onChange={set('salary')} /></label>
      <label>Join Date<input type="date" value={form.join_date} onChange={set('join_date')} /></label>
      <label className="span-2">Skills<input value={form.skills || ''} onChange={set('skills')} placeholder="Comma separated" /></label>
      <label className="span-2">Address<input value={form.address || ''} onChange={set('address')} /></label>
      {!isEdit && (
        <>
          <label className="checkbox span-2">
            <input type="checkbox" checked={form.create_login} onChange={set('create_login')} />
            Create a login account for this employee (uses the email above)
          </label>
          {form.create_login && (
            <label className="span-2">Login Password *<input type="password" value={form.password} onChange={set('password')} minLength={6} required /></label>
          )}
        </>
      )}
      <div className="form-actions span-2">
        <button type="button" className="btn btn-light" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );
}

export default function Employees() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({ q: '', status: '', department: '' });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/employees', { params: filters })
      .then((r) => setRows(r.data))
      .catch((e) => toast(errMsg(e), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [filters]);
  useEffect(() => { api.get('/employees/departments').then((r) => setDepartments(r.data)); }, []);

  const remove = async (emp) => {
    if (!confirm(`Delete ${emp.first_name} ${emp.last_name}? This also removes their assignments, attendance and leaves.`)) return;
    try {
      await api.delete(`/employees/${emp.id}`);
      toast('Employee deleted');
      load();
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Employees</h1>
        <div className="row-gap">
          <button className="btn btn-light" onClick={() => exportCsv('employees', rows.map((r) => ({
            Code: r.emp_code, Name: `${r.first_name} ${r.last_name}`, Email: r.email, Phone: r.phone,
            Department: r.department, Designation: r.designation, Client: r.current_client || 'Bench', Status: r.status,
          })))}>Export CSV</button>
          <button className="btn btn-primary" onClick={() => setEditing({})}>+ Add Employee</button>
        </div>
      </div>

      <div className="filters">
        <input placeholder="Search name, email, code, skill..." value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        <select value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })}>
          <option value="">All departments</option>
          {departments.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="on_leave">On Leave</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Code</th><th>Name</th><th>Designation</th><th>Department</th><th>Deployed At</th><th>Salary</th><th>Joined</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.emp_code}</td>
                <td><Link to={`/employees/${r.id}`}>{r.first_name} {r.last_name}</Link><div className="muted small">{r.email}</div></td>
                <td>{r.designation || '-'}</td>
                <td>{r.department || '-'}</td>
                <td>{r.current_client || <span className="badge badge-amber">Bench</span>}</td>
                <td>{money(r.salary)}</td>
                <td>{fmtDate(r.join_date)}</td>
                <td><Badge value={r.status} /></td>
                <td className="actions">
                  <button className="btn btn-sm btn-light" onClick={() => setEditing(r)}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(r)}>Delete</button>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && <tr><td colSpan="9" className="empty">No employees found.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing.id ? 'Edit Employee' : 'Add Employee'} onClose={() => setEditing(null)} wide>
          <EmployeeForm initial={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
        </Modal>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { fmtDate } from '../utils';

function UserForm({ initial, onSaved, onCancel }) {
  const toast = useToast();
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({ name: '', email: '', role: 'manager', password: '', ...initial });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) await api.put(`/users/${initial.id}`, form);
      else await api.post('/users', form);
      toast(isEdit ? 'User updated' : 'User created');
      onSaved();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  return (
    <form onSubmit={submit} className="form-grid">
      <label className="span-2">Name *<input value={form.name} onChange={set('name')} required /></label>
      <label className="span-2">Email *<input type="email" value={form.email} onChange={set('email')} required /></label>
      <label>Role
        <select value={form.role} onChange={set('role')}>
          <option value="admin">Admin</option>
          <option value="manager">Manager / HR</option>
          <option value="employee">Employee</option>
        </select>
      </label>
      <label>{isEdit ? 'New Password (optional)' : 'Password *'}
        <input type="password" value={form.password || ''} onChange={set('password')} minLength={6} required={!isEdit} />
      </label>
      <div className="form-actions span-2">
        <button type="button" className="btn btn-light" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary">Save</button>
      </div>
    </form>
  );
}

export default function Users() {
  const toast = useToast();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = () => api.get('/users').then((r) => setRows(r.data)).catch((e) => toast(errMsg(e), 'error'));
  useEffect(() => { load(); }, []);

  const remove = async (u) => {
    if (!confirm(`Delete login for ${u.name}? (The employee record is kept.)`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      toast('User deleted');
      load();
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>User Accounts</h1>
        <button className="btn btn-primary" onClick={() => setEditing({})}>+ Add User</button>
      </div>
      <p className="muted">Employee logins are best created from the Employees page so they get linked to the employee record.</p>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Linked Employee</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td><td>{u.email}</td><td><Badge value={u.role} /></td>
                <td>{u.emp_code || '-'}</td><td>{fmtDate(u.created_at)}</td>
                <td className="actions">
                  <button className="btn btn-sm btn-light" onClick={() => setEditing({ ...u, password: '' })}>Edit</button>
                  {u.id !== user.id && <button className="btn btn-sm btn-danger" onClick={() => remove(u)}>Delete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <Modal title={editing.id ? 'Edit User' : 'Add User'} onClose={() => setEditing(null)}>
          <UserForm initial={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
        </Modal>
      )}
    </div>
  );
}

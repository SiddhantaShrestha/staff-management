import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { useToast } from '../components/Toast';
import { exportCsv } from '../utils';

const EMPTY = { company_name: '', contact_person: '', email: '', phone: '', industry: '', address: '', status: 'active' };

export function ClientForm({ initial, onSaved, onCancel }) {
  const toast = useToast();
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial?.id) await api.put(`/clients/${initial.id}`, form);
      else await api.post('/clients', form);
      toast(initial?.id ? 'Client updated' : 'Client added');
      onSaved();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="form-grid">
      <label className="span-2">Company Name *<input value={form.company_name} onChange={set('company_name')} required /></label>
      <label>Contact Person<input value={form.contact_person || ''} onChange={set('contact_person')} /></label>
      <label>Industry<input value={form.industry || ''} onChange={set('industry')} /></label>
      <label>Email<input type="email" value={form.email || ''} onChange={set('email')} /></label>
      <label>Phone<input value={form.phone || ''} onChange={set('phone')} /></label>
      <label className="span-2">Address<input value={form.address || ''} onChange={set('address')} /></label>
      <label>Status
        <select value={form.status} onChange={set('status')}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </label>
      <div className="form-actions span-2">
        <button type="button" className="btn btn-light" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      </div>
    </form>
  );
}

export default function Clients() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ q: '', status: '' });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/clients', { params: filters })
      .then((r) => setRows(r.data))
      .catch((e) => toast(errMsg(e), 'error'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [filters]);

  const remove = async (c) => {
    if (!confirm(`Delete ${c.company_name}? All its assignments will be removed too.`)) return;
    try {
      await api.delete(`/clients/${c.id}`);
      toast('Client deleted');
      load();
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Clients</h1>
        <div className="row-gap">
          <button className="btn btn-light" onClick={() => exportCsv('clients', rows.map((r) => ({
            Company: r.company_name, Contact: r.contact_person, Email: r.email, Phone: r.phone,
            Industry: r.industry, 'Active Staff': r.active_staff, Status: r.status,
          })))}>Export CSV</button>
          <button className="btn btn-primary" onClick={() => setEditing({})}>+ Add Client</button>
        </div>
      </div>

      <div className="filters">
        <input placeholder="Search company, contact, industry..." value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Company</th><th>Contact</th><th>Phone</th><th>Industry</th><th>Active Staff</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><Link to={`/clients/${r.id}`}>{r.company_name}</Link><div className="muted small">{r.address}</div></td>
                <td>{r.contact_person || '-'}<div className="muted small">{r.email}</div></td>
                <td>{r.phone || '-'}</td>
                <td>{r.industry || '-'}</td>
                <td>{r.active_staff}</td>
                <td><Badge value={r.status} /></td>
                <td className="actions">
                  <button className="btn btn-sm btn-light" onClick={() => setEditing(r)}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(r)}>Delete</button>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && <tr><td colSpan="7" className="empty">No clients found.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing.id ? 'Edit Client' : 'Add Client'} onClose={() => setEditing(null)}>
          <ClientForm initial={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
        </Modal>
      )}
    </div>
  );
}

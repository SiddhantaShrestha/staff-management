import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../api';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { ClientForm } from './Clients';
import { fmtDate, money } from '../utils';

export default function ClientDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [client, setClient] = useState(null);
  const [editing, setEditing] = useState(false);

  const load = () => api.get(`/clients/${id}`).then((r) => setClient(r.data)).catch((e) => toast(errMsg(e), 'error'));
  useEffect(() => { load(); }, [id]);

  if (!client) return <div className="loading">Loading...</div>;
  const active = client.assignments.filter((a) => a.status === 'active');
  const billing = active.reduce((s, a) => s + Number(a.bill_rate || 0), 0);

  return (
    <div>
      <div className="page-head">
        <div>
          <Link to="/clients" className="muted small">← Back to clients</Link>
          <h1>{client.company_name} <Badge value={client.status} /></h1>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing(true)}>Edit</button>
      </div>

      <div className="card">
        <div className="details">
          <div><span>Contact Person</span>{client.contact_person || '-'}</div>
          <div><span>Email</span>{client.email || '-'}</div>
          <div><span>Phone</span>{client.phone || '-'}</div>
          <div><span>Industry</span>{client.industry || '-'}</div>
          <div><span>Address</span>{client.address || '-'}</div>
          <div><span>Active Staff</span>{active.length}</div>
          <div><span>Monthly Billing</span>{money(billing)}</div>
        </div>
      </div>

      <div className="card table-wrap">
        <h3>Staff Assigned</h3>
        <table>
          <thead><tr><th>Employee</th><th>Role</th><th>Start</th><th>End</th><th>Bill Rate / Month</th><th>Status</th></tr></thead>
          <tbody>
            {client.assignments.map((a) => (
              <tr key={a.id}>
                <td><Link to={`/employees/${a.employee_id}`}>{a.employee_name}</Link> <span className="muted small">{a.emp_code}</span></td>
                <td>{a.role_title}</td><td>{fmtDate(a.start_date)}</td>
                <td>{a.end_date ? fmtDate(a.end_date) : 'Ongoing'}</td><td>{money(a.bill_rate)}</td><td><Badge value={a.status} /></td>
              </tr>
            ))}
            {client.assignments.length === 0 && <tr><td colSpan="6" className="empty">No staff assigned yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title="Edit Client" onClose={() => setEditing(false)}>
          <ClientForm initial={client} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />
        </Modal>
      )}
    </div>
  );
}

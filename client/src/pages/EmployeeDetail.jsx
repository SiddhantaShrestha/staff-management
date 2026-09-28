import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../api';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { EmployeeForm } from './Employees';
import { fmtDate, label, money } from '../utils';

export default function EmployeeDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const toast = useToast();
  const [emp, setEmp] = useState(null);
  const [editing, setEditing] = useState(false);

  const load = () => api.get(`/employees/${id}`).then((r) => setEmp(r.data)).catch((e) => toast(errMsg(e), 'error'));
  useEffect(() => { load(); }, [id]);

  if (!emp) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="page-head">
        <div>
          {can('admin', 'manager') && <Link to="/employees" className="muted small">← Back to employees</Link>}
          <h1>{emp.first_name} {emp.last_name} <Badge value={emp.status} /></h1>
        </div>
        {can('admin', 'manager') && <button className="btn btn-primary" onClick={() => setEditing(true)}>Edit</button>}
      </div>

      <div className="card">
        <div className="details">
          <div><span>Employee Code</span>{emp.emp_code}</div>
          <div><span>Email</span>{emp.email}</div>
          <div><span>Phone</span>{emp.phone || '-'}</div>
          <div><span>Designation</span>{emp.designation || '-'}</div>
          <div><span>Department</span>{emp.department || '-'}</div>
          <div><span>Monthly Salary</span>{money(emp.salary)}</div>
          <div><span>Joined</span>{fmtDate(emp.join_date)}</div>
          <div><span>Skills</span>{emp.skills || '-'}</div>
          <div><span>Address</span>{emp.address || '-'}</div>
        </div>
      </div>

      <div className="card table-wrap">
        <h3>Assignment History</h3>
        <table>
          <thead><tr><th>Client</th><th>Role</th><th>Start</th><th>End</th><th>Bill Rate / Month</th><th>Status</th></tr></thead>
          <tbody>
            {emp.assignments.map((a) => (
              <tr key={a.id}>
                <td>{a.company_name}</td><td>{a.role_title}</td><td>{fmtDate(a.start_date)}</td>
                <td>{a.end_date ? fmtDate(a.end_date) : 'Ongoing'}</td><td>{money(a.bill_rate)}</td><td><Badge value={a.status} /></td>
              </tr>
            ))}
            {emp.assignments.length === 0 && <tr><td colSpan="6" className="empty">No assignments yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card table-wrap">
        <h3>Leave History</h3>
        <table>
          <thead><tr><th>Type</th><th>From</th><th>To</th><th>Reason</th><th>Status</th></tr></thead>
          <tbody>
            {emp.leaves.map((l) => (
              <tr key={l.id}>
                <td>{label(l.leave_type)}</td><td>{fmtDate(l.start_date)}</td><td>{fmtDate(l.end_date)}</td>
                <td>{l.reason || '-'}</td><td><Badge value={l.status} /></td>
              </tr>
            ))}
            {emp.leaves.length === 0 && <tr><td colSpan="5" className="empty">No leave records.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title="Edit Employee" onClose={() => setEditing(false)} wide>
          <EmployeeForm initial={emp} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />
        </Modal>
      )}
    </div>
  );
}

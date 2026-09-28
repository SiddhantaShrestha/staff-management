import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { fmtDate, label, todayStr } from '../utils';

function LeaveForm({ isStaff, onSaved, onCancel }) {
  const toast = useToast();
  const [form, setForm] = useState({ employee_id: '', leave_type: 'casual', start_date: todayStr(), end_date: todayStr(), reason: '' });
  const [employees, setEmployees] = useState([]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => { if (isStaff) api.get('/employees').then((r) => setEmployees(r.data)); }, [isStaff]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leaves', form);
      toast('Leave request submitted');
      onSaved();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  return (
    <form onSubmit={submit} className="form-grid">
      {isStaff && (
        <label className="span-2">Employee *
          <select value={form.employee_id} onChange={set('employee_id')} required>
            <option value="">Select employee</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.emp_code} - {e.first_name} {e.last_name}</option>)}
          </select>
        </label>
      )}
      <label className="span-2">Leave Type
        <select value={form.leave_type} onChange={set('leave_type')}>
          <option value="casual">Casual</option>
          <option value="sick">Sick</option>
          <option value="annual">Annual</option>
          <option value="unpaid">Unpaid</option>
        </select>
      </label>
      <label>From *<input type="date" value={form.start_date} onChange={set('start_date')} required /></label>
      <label>To *<input type="date" value={form.end_date} min={form.start_date} onChange={set('end_date')} required /></label>
      <label className="span-2">Reason<textarea rows="3" value={form.reason} onChange={set('reason')} /></label>
      <div className="form-actions span-2">
        <button type="button" className="btn btn-light" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary">Submit</button>
      </div>
    </form>
  );
}

export default function Leaves() {
  const toast = useToast();
  const { can } = useAuth();
  const isStaff = can('admin', 'manager');
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState(isStaff ? 'pending' : '');
  const [adding, setAdding] = useState(false);

  const load = () => api.get('/leaves', { params: { status } }).then((r) => setRows(r.data)).catch((e) => toast(errMsg(e), 'error'));
  useEffect(() => { load(); }, [status]);

  const review = async (l, newStatus) => {
    try {
      await api.put(`/leaves/${l.id}/status`, { status: newStatus });
      toast(`Leave ${newStatus}`);
      load();
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  const remove = async (l) => {
    if (!confirm(isStaff ? 'Delete this leave record?' : 'Cancel this leave request?')) return;
    try {
      await api.delete(`/leaves/${l.id}`);
      toast('Removed');
      load();
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>{isStaff ? 'Leave Requests' : 'My Leaves'}</h1>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>{isStaff ? '+ Add Leave' : '+ Request Leave'}</button>
      </div>

      <div className="filters">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>{isStaff && <th>Employee</th>}<th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th>Reviewed By</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id}>
                {isStaff && <td>{l.employee_name} <span className="muted small">{l.emp_code}</span></td>}
                <td>{label(l.leave_type)}</td>
                <td>{fmtDate(l.start_date)}</td>
                <td>{fmtDate(l.end_date)}</td>
                <td>{l.days}</td>
                <td>{l.reason || '-'}</td>
                <td><Badge value={l.status} /></td>
                <td>{l.reviewer_name || '-'}</td>
                <td className="actions">
                  {isStaff && l.status === 'pending' && (
                    <>
                      <button className="btn btn-sm btn-success" onClick={() => review(l, 'approved')}>Approve</button>
                      <button className="btn btn-sm btn-danger" onClick={() => review(l, 'rejected')}>Reject</button>
                    </>
                  )}
                  {(isStaff || l.status === 'pending') && (
                    <button className="btn btn-sm btn-light" onClick={() => remove(l)}>{isStaff ? 'Delete' : 'Cancel'}</button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="9" className="empty">No leave requests.</td></tr>}
          </tbody>
        </table>
      </div>

      {adding && (
        <Modal title={isStaff ? 'Add Leave' : 'Request Leave'} onClose={() => setAdding(false)}>
          <LeaveForm isStaff={isStaff} onCancel={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />
        </Modal>
      )}
    </div>
  );
}

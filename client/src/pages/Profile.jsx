import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api';
import Badge from '../components/Badge';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm) return toast('New passwords do not match', 'error');
    try {
      await api.post('/auth/change-password', form);
      toast('Password changed');
      setForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  return (
    <div>
      <div className="page-head"><h1>My Profile</h1></div>
      <div className="grid-2">
        <div className="card">
          <h3>Account</h3>
          <div className="details details-1">
            <div><span>Name</span>{user.name}</div>
            <div><span>Email</span>{user.email}</div>
            <div><span>Role</span><Badge value={user.role} /></div>
          </div>
          {user.employee_id && <Link to={`/employees/${user.employee_id}`} className="card-link">View my employee record</Link>}
        </div>
        <div className="card">
          <h3>Change Password</h3>
          <form onSubmit={submit} className="form-grid form-1">
            <label>Current Password<input type="password" value={form.current_password} onChange={set('current_password')} required /></label>
            <label>New Password<input type="password" value={form.new_password} onChange={set('new_password')} minLength={6} required /></label>
            <label>Confirm New Password<input type="password" value={form.confirm} onChange={set('confirm')} minLength={6} required /></label>
            <div className="form-actions"><button className="btn btn-primary">Update Password</button></div>
          </form>
        </div>
      </div>
    </div>
  );
}

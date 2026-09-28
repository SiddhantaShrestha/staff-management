import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api';

const DEMO = [
  { role: 'Admin', email: 'admin@staffhub.com', password: 'admin123' },
  { role: 'Manager', email: 'manager@staffhub.com', password: 'manager123' },
  { role: 'Employee', email: 'ravi@staffhub.com', password: 'employee123' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand brand-center">
          <span className="brand-logo">SH</span>
          <div>
            <strong>StaffHub</strong>
            <small>Outsourcing Staff Manager</small>
          </div>
        </div>
        <h2>Sign in</h2>
        <form onSubmit={submit}>
          <label>Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </label>
          <label>Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <div className="alert">{error}</div>}
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div className="demo">
          <p>Demo accounts (click to fill):</p>
          {DEMO.map((d) => (
            <button key={d.role} type="button" className="btn btn-light btn-sm"
              onClick={() => { setEmail(d.email); setPassword(d.password); }}>
              {d.role}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

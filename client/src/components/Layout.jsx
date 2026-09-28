import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LINKS = [
  { to: '/', label: 'Dashboard', roles: ['admin', 'manager', 'employee'], end: true },
  { to: '/employees', label: 'Employees', roles: ['admin', 'manager'] },
  { to: '/clients', label: 'Clients', roles: ['admin', 'manager'] },
  { to: '/assignments', label: 'Assignments', roles: ['admin', 'manager'] },
  { to: '/assignments', label: 'My Assignments', roles: ['employee'] },
  { to: '/attendance', label: 'Attendance', roles: ['admin', 'manager'] },
  { to: '/attendance', label: 'My Attendance', roles: ['employee'] },
  { to: '/leaves', label: 'Leave Requests', roles: ['admin', 'manager'] },
  { to: '/leaves', label: 'My Leaves', roles: ['employee'] },
  { to: '/reports', label: 'Reports', roles: ['admin', 'manager'] },
  { to: '/users', label: 'User Accounts', roles: ['admin'] },
  { to: '/profile', label: 'My Profile', roles: ['admin', 'manager', 'employee'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const doLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-logo">SH</span>
          <div>
            <strong>StaffHub</strong>
            <small>Outsourcing Staff Manager</small>
          </div>
        </div>
        <nav>
          {LINKS.filter((l) => l.roles.includes(user.role)).map((l) => (
            <NavLink key={l.label} to={l.to} end={l.end} onClick={() => setOpen(false)}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
          <div className="spacer" />
          <div className="user-chip">
            <div className="avatar">{user.name.charAt(0)}</div>
            <div>
              <div className="user-name">{user.name}</div>
              <div className="user-role">{user.role}</div>
            </div>
          </div>
          <button className="btn btn-light" onClick={doLogout}>Logout</button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

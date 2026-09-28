import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeDetail from './pages/EmployeeDetail';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Assignments from './pages/Assignments';
import Attendance from './pages/Attendance';
import Leaves from './pages/Leaves';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Profile from './pages/Profile';

function Protected({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

const STAFF = ['admin', 'manager'];

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="employees" element={<Protected roles={STAFF}><Employees /></Protected>} />
        <Route path="employees/:id" element={<EmployeeDetail />} />
        <Route path="clients" element={<Protected roles={STAFF}><Clients /></Protected>} />
        <Route path="clients/:id" element={<Protected roles={STAFF}><ClientDetail /></Protected>} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="leaves" element={<Leaves />} />
        <Route path="reports" element={<Protected roles={STAFF}><Reports /></Protected>} />
        <Route path="users" element={<Protected roles={['admin']}><Users /></Protected>} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Geofences from './pages/Geofences.jsx';
import Requests from './pages/Requests.jsx';

const token = () => localStorage.getItem('token');

function Layout({ children }) {
  const nav = useNavigate();
  const logout = () => { localStorage.removeItem('token'); nav('/'); };
  return (
    <div>
      <nav style={{
        background: '#0f766e', color: 'white', padding: '12px 24px',
        display: 'flex', gap: 24, alignItems: 'center'
      }}>
        <b>ERP HR</b>
        <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none' }}>لوحة التحكم</Link>
        <Link to="/geofences" style={{ color: 'white', textDecoration: 'none' }}>النطاقات</Link>
        <Link to="/requests" style={{ color: 'white', textDecoration: 'none' }}>الطلبات</Link>
        <button onClick={logout} style={{ marginRight: 'auto', background: 'transparent',
          color: 'white', border: '1px solid white', padding: '6px 12px', borderRadius: 6 }}>
          خروج
        </button>
      </nav>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  );
}

const Guard = ({ children }) => token() ? <Layout>{children}</Layout> : <Navigate to="/" />;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
      <Route path="/geofences" element={<Guard><Geofences /></Guard>} />
      <Route path="/requests" element={<Guard><Requests /></Guard>} />
    </Routes>
  );
}
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('password123');
  const [err, setErr] = useState('');
  const nav = useNavigate();

  const submit = async e => {
    e.preventDefault();
    setErr('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      nav('/dashboard');
    } catch (e) {
      setErr(e.response?.data?.error || 'خطأ في تسجيل الدخول');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={submit} className="card" style={{ width: 360 }}>
        <h2 style={{ marginTop: 0, color: '#0f766e' }}>ERP HR — دخول الإدارة</h2>
        <div style={{ marginBottom: 12 }}>
          <label>البريد الإلكتروني</label>
          <input value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>كلمة المرور</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        {err && <div style={{ color: 'red', marginBottom: 12 }}>{err}</div>}
        <button className="btn" style={{ width: '100%' }}>دخول</button>
      </form>
    </div>
  );
}
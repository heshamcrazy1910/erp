import { useEffect, useState } from 'react';
import api from '../api';

export default function Dashboard() {
  const [rows, setRows] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = async () => {
    const { data } = await api.get('/admin/attendance/report', { params: { from, to } });
    setRows(data);
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <h2>تقرير الحضور</h2>
      <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'end' }}>
        <div style={{ flex: 1 }}>
          <label>من</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label>إلى</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <button className="btn" onClick={load}>تحديث</button>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>الموظف</th><th>الكود</th><th>النوع</th><th>الوقت</th><th>داخل النطاق؟</th><th>المسافة (م)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>{r.full_name}</td>
                <td>{r.employee_code}</td>
                <td>{r.check_type === 'in' ? 'حضور' : 'انصراف'}</td>
                <td>{new Date(r.check_time).toLocaleString('ar-EG')}</td>
                <td style={{ color: r.is_within_geofence ? 'green' : 'red' }}>
                  {r.is_within_geofence ? '✓' : '✗'}
                </td>
                <td>{Math.round(r.distance_meters || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p style={{ color: '#999', textAlign: 'center' }}>لا توجد بيانات</p>}
      </div>
    </div>
  );
}
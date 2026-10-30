import { useEffect, useState } from 'react';
import api from '../api';

export default function Requests() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/requests/pending');
      setRows(data);
    } catch (e) {
      setErr(e.response?.data?.error || 'تعذر جلب الطلبات');
    }
  };
  useEffect(() => { load(); }, []);

  const approve = async id => { await api.patch(`/requests/${id}/approve`); load(); };
  const reject = async id => {
    const comments = prompt('سبب الرفض:') || '';
    await api.patch(`/requests/${id}/reject`, { comments });
    load();
  };

  return (
    <div>
      <h2>الطلبات المعلقة (تحتاج موافقتك)</h2>
      {err && <div className="card" style={{ color: 'red' }}>{err}</div>}
      <div className="card">
        <table>
          <thead>
            <tr><th>الموظف</th><th>النوع</th><th>من</th><th>إلى</th><th>السبب</th><th>الإجراء</th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>{r.employee_name}</td>
                <td>{r.name_ar}</td>
                <td>{new Date(r.start_datetime).toLocaleDateString('ar-EG')}</td>
                <td>{new Date(r.end_datetime).toLocaleDateString('ar-EG')}</td>
                <td>{r.reason || '—'}</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" onClick={() => approve(r.id)}>موافقة</button>
                  <button className="btn btn-danger" onClick={() => reject(r.id)}>رفض</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p style={{ color: '#999', textAlign: 'center' }}>لا توجد طلبات معلقة</p>}
      </div>
    </div>
  );
}
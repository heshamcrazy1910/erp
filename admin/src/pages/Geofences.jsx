import { useEffect, useState } from 'react';
import api from '../api';

export default function Geofences() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name: '', latitude: 30.0444, longitude: 31.2357, radius_meters: 500 });

  const load = async () => {
    const { data } = await api.get('/admin/geofences');
    setRows(data);
  };
  useEffect(() => { load(); }, []);

  const create = async e => {
    e.preventDefault();
    await api.post('/admin/geofences', form);
    setForm({ name: '', latitude: 30.0444, longitude: 31.2357, radius_meters: 500 });
    load();
  };

  const del = async id => {
    if (!confirm('تأكيد الحذف؟')) return;
    await api.delete(`/admin/geofences/${id}`);
    load();
  };

  return (
    <div>
      <h2>النطاقات الجغرافية للبصمة</h2>
      <form onSubmit={create} className="card" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
        <div><label>الاسم</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
        <div><label>Latitude</label><input type="number" step="0.0000001" value={form.latitude} onChange={e => setForm({ ...form, latitude: +e.target.value })} /></div>
        <div><label>Longitude</label><input type="number" step="0.0000001" value={form.longitude} onChange={e => setForm({ ...form, longitude: +e.target.value })} /></div>
        <div><label>نصف القطر (م)</label><input type="number" value={form.radius_meters} onChange={e => setForm({ ...form, radius_meters: +e.target.value })} /></div>
        <button className="btn">إضافة</button>
      </form>
      <div className="card">
        <table>
          <thead><tr><th>الاسم</th><th>Latitude</th><th>Longitude</th><th>نصف القطر</th><th></th></tr></thead>
          <tbody>
            {rows.map(g => (
              <tr key={g.id}>
                <td>{g.name}</td>
                <td>{g.latitude}</td>
                <td>{g.longitude}</td>
                <td>{g.radius_meters} م</td>
                <td><button className="btn btn-danger" onClick={() => del(g.id)}>حذف</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
import { Router } from 'express';
import { q } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { haversineMeters } from '../utils/geo.js';

const r = Router();

r.post('/check', requireAuth, async (req, res) => {
  const { lat, lng, type, is_mock = false, device_info = null } = req.body || {};
  if (lat == null || lng == null || !['in', 'out'].includes(type))
    return res.status(400).json({ error: 'بيانات ناقصة' });
  if (is_mock) return res.status(403).json({ error: 'تم اكتشاف تزييف الموقع' });

  const { rows: fences } = await q(
    'SELECT * FROM geofences WHERE company_id=$1 AND is_active=TRUE',
    [req.user.company_id]
  );
  if (!fences.length) return res.status(400).json({ error: 'لا توجد نطاقات محددة' });

  let best = null;
  for (const f of fences) {
    const d = haversineMeters(lat, lng, Number(f.latitude), Number(f.longitude));
    if (!best || d < best.distance) best = { fence: f, distance: d };
  }
  const within = best.distance <= Number(best.fence.radius_meters);

  if (!within) {
    return res.status(422).json({
      error: 'أنت خارج النطاق المسموح',
      distance_meters: Math.round(best.distance),
      allowed_radius: Number(best.fence.radius_meters)
    });
  }

  const { rows } = await q(
    `INSERT INTO attendance_logs
     (employee_id, geofence_id, check_type, latitude, longitude, distance_meters, is_within_geofence, is_mock, device_info)
     VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7,$8) RETURNING *`,
    [req.user.id, best.fence.id, type, lat, lng, best.distance, is_mock, device_info]
  );
  res.json({ ok: true, log: rows[0] });
});

r.get('/today', requireAuth, async (req, res) => {
  const { rows } = await q(
    `SELECT * FROM attendance_logs
     WHERE employee_id=$1 AND check_time::date = NOW()::date
     ORDER BY check_time`,
    [req.user.id]
  );
  const has_in = rows.some(r => r.check_type === 'in');
  const has_out = rows.some(r => r.check_type === 'out');
  res.json({ logs: rows, next_action: !has_in ? 'in' : !has_out ? 'out' : 'done' });
});

r.get('/history', requireAuth, async (req, res) => {
  const { rows } = await q(
    `SELECT * FROM attendance_logs WHERE employee_id=$1
     ORDER BY check_time DESC LIMIT 60`,
    [req.user.id]
  );
  res.json(rows);
});

export default r;
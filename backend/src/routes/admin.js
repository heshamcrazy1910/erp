import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { q } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth, requireRole('admin', 'hr'));

r.get('/employees', async (req, res) => {
  const { rows } = await q(
    'SELECT id, employee_code, full_name, email, role, is_active FROM employees WHERE company_id=$1 ORDER BY employee_code',
    [req.user.company_id]
  );
  res.json(rows);
});

r.post('/employees', async (req, res) => {
  const { employee_code, full_name, email, password, role = 'employee', manager_id } = req.body || {};
  if (!employee_code || !full_name || !email || !password)
    return res.status(400).json({ error: 'حقول ناقصة' });
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await q(
    `INSERT INTO employees(company_id, employee_code, full_name, email, password_hash, role, manager_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, employee_code, full_name, email, role`,
    [req.user.company_id, employee_code, full_name, email, hash, role, manager_id || null]
  );
  res.json(rows[0]);
});

r.get('/geofences', async (req, res) => {
  const { rows } = await q('SELECT * FROM geofences WHERE company_id=$1 ORDER BY name', [req.user.company_id]);
  res.json(rows);
});

r.post('/geofences', async (req, res) => {
  const { name, latitude, longitude, radius_meters = 100 } = req.body || {};
  if (!name || latitude == null || longitude == null)
    return res.status(400).json({ error: 'حقول ناقصة' });
  const { rows } = await q(
    `INSERT INTO geofences(company_id, name, latitude, longitude, radius_meters)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [req.user.company_id, name, latitude, longitude, radius_meters]
  );
  res.json(rows[0]);
});

r.delete('/geofences/:id', async (req, res) => {
  await q('DELETE FROM geofences WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
  res.json({ ok: true });
});

r.get('/attendance/report', async (req, res) => {
  const { from, to } = req.query;
  const { rows } = await q(
    `SELECT a.*, e.full_name, e.employee_code
     FROM attendance_logs a JOIN employees e ON e.id = a.employee_id
     WHERE e.company_id=$1 AND a.check_time::date BETWEEN $2 AND $3
     ORDER BY a.check_time DESC`,
    [req.user.company_id, from || '2000-01-01', to || '2999-12-31']
  );
  res.json(rows);
});

export default r;
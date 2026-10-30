import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { q } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();

r.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const { rows } = await q('SELECT * FROM employees WHERE email=$1 AND is_active=TRUE', [email]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'بيانات غير صحيحة' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'بيانات غير صحيحة' });
  const token = jwt.sign(
    { id: user.id, company_id: user.company_id, role: user.role, name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
  res.json({
    token,
    user: { id: user.id, name: user.full_name, email: user.email, role: user.role }
  });
});

r.get('/me', requireAuth, async (req, res) => {
  const { rows } = await q(
    'SELECT id, full_name, email, role, employee_code FROM employees WHERE id=$1',
    [req.user.id]
  );
  res.json(rows[0]);
});

export default r;
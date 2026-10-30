import { Router } from 'express';
import { q, pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const r = Router();

r.get('/types', requireAuth, async (req, res) => {
  const { rows } = await q(
    'SELECT * FROM request_types WHERE company_id=$1 AND is_active=TRUE',
    [req.user.company_id]
  );
  res.json(rows);
});

r.get('/balances/my', requireAuth, async (req, res) => {
  const { rows } = await q(
    `SELECT lb.*, rt.name_ar, rt.code
     FROM leave_balances lb
     JOIN request_types rt ON rt.id = lb.request_type_id
     WHERE lb.employee_id=$1 AND lb.year=EXTRACT(YEAR FROM NOW())::int`,
    [req.user.id]
  );
  res.json(rows);
});

r.post('/', requireAuth, async (req, res) => {
  const { request_type_id, start_datetime, end_datetime, duration_hours, reason } = req.body || {};
  if (!request_type_id || !start_datetime || !end_datetime)
    return res.status(400).json({ error: 'بيانات ناقصة' });

  const { rows: empRows } = await q(
    'SELECT manager_id FROM employees WHERE id=$1', [req.user.id]
  );
  const approver = empRows[0]?.manager_id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO requests
       (employee_id, request_type_id, start_datetime, end_datetime, duration_hours, reason, current_approver_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, request_type_id, start_datetime, end_datetime, duration_hours, reason, approver]
    );
    const reqRow = rows[0];

    if (approver) {
      await client.query(
        `INSERT INTO request_approvals(request_id, approver_id, step_order, status)
         VALUES ($1,$2,1,'pending')`,
        [reqRow.id, approver]
      );
      await client.query(
        `INSERT INTO notifications(employee_id, title, body, type)
         VALUES ($1,'طلب جديد بانتظار موافقتك',$2,'request_submitted')`,
        [approver, `طلب من ${req.user.name}`]
      );
    }
    // reserve balance (for leave/casual)
    const { rows: rt } = await client.query('SELECT code FROM request_types WHERE id=$1', [request_type_id]);
    if (['leave', 'casual', 'permission'].includes(rt[0]?.code)) {
      const days = (new Date(end_datetime) - new Date(start_datetime)) / 86400000 || 1;
      await client.query(
        `UPDATE leave_balances SET pending = pending + $1
         WHERE employee_id=$2 AND request_type_id=$3 AND year=EXTRACT(YEAR FROM NOW())::int`,
        [days, req.user.id, request_type_id]
      );
    }
    await client.query('COMMIT');
    res.json(reqRow);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

r.get('/my', requireAuth, async (req, res) => {
  const { rows } = await q(
    `SELECT r.*, rt.name_ar, rt.code
     FROM requests r JOIN request_types rt ON rt.id = r.request_type_id
     WHERE r.employee_id=$1 ORDER BY r.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

r.get('/pending', requireAuth, requireRole('manager', 'hr', 'admin'), async (req, res) => {
  const { rows } = await q(
    `SELECT r.*, rt.name_ar, e.full_name AS employee_name
     FROM requests r
     JOIN request_types rt ON rt.id = r.request_type_id
     JOIN employees e ON e.id = r.employee_id
     WHERE r.current_approver_id=$1 AND r.status='pending'
     ORDER BY r.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

r.patch('/:id/approve', requireAuth, requireRole('manager', 'hr', 'admin'), async (req, res) => {
  const { id } = req.params;
  const { rows } = await q(
    `UPDATE requests SET status='approved', current_approver_id=NULL, updated_at=NOW()
     WHERE id=$1 AND current_approver_id=$2 RETURNING *`,
    [id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'الطلب غير موجود أو ليس لك صلاحية' });
  await q(
    `UPDATE request_approvals SET status='approved', acted_at=NOW()
     WHERE request_id=$1 AND approver_id=$2 AND status='pending'`,
    [id, req.user.id]
  );
  // move pending → used
  await q(
    `UPDATE leave_balances lb SET pending = GREATEST(0, pending - COALESCE($1,1)),
       used = used + COALESCE($1,1)
     WHERE lb.employee_id=$2 AND lb.request_type_id=$3 AND lb.year=EXTRACT(YEAR FROM NOW())::int`,
    [rows[0].duration_hours || 1, rows[0].employee_id, rows[0].request_type_id]
  );
  await q(
    `INSERT INTO notifications(employee_id, title, body, type)
     VALUES ($1,'تمت الموافقة على طلبك',$2,'request_approved')`,
    [rows[0].employee_id, `الطلب ${id.slice(0, 8)}`]
  );
  res.json(rows[0]);
});

r.patch('/:id/reject', requireAuth, requireRole('manager', 'hr', 'admin'), async (req, res) => {
  const { id } = req.params;
  const { comments } = req.body || {};
  const { rows } = await q(
    `UPDATE requests SET status='rejected', current_approver_id=NULL, updated_at=NOW()
     WHERE id=$1 AND current_approver_id=$2 RETURNING *`,
    [id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'الطلب غير موجود' });
  await q(
    `UPDATE request_approvals SET status='rejected', comments=$1, acted_at=NOW()
     WHERE request_id=$2 AND approver_id=$3 AND status='pending'`,
    [comments || null, id, req.user.id]
  );
  await q(
    `UPDATE leave_balances lb SET pending = GREATEST(0, pending - COALESCE($1,1))
     WHERE lb.employee_id=$2 AND lb.request_type_id=$3 AND lb.year=EXTRACT(YEAR FROM NOW())::int`,
    [rows[0].duration_hours || 1, rows[0].employee_id, rows[0].request_type_id]
  );
  await q(
    `INSERT INTO notifications(employee_id, title, body, type)
     VALUES ($1,'تم رفض طلبك',$2,'request_rejected')`,
    [rows[0].employee_id, comments || 'بدون سبب']
  );
  res.json(rows[0]);
});

export default r;
-- password for all demo accounts = "password123"
-- bcrypt hash below is for "password123"
DO $$
DECLARE
  cid UUID;
  dep_id UUID;
  admin_id UUID;
  mgr_id UUID;
  emp_id UUID;
  rt_leave UUID;
  rt_casual UUID;
  rt_perm UUID;
BEGIN
  INSERT INTO companies(name) VALUES ('شركة ديمو') RETURNING id INTO cid;

  INSERT INTO departments(company_id, name) VALUES (cid,'الإدارة') RETURNING id INTO dep_id;

  INSERT INTO employees(company_id, department_id, employee_code, full_name, email, password_hash, role)
  VALUES (cid, dep_id, 'E001','مدير النظام','admin@demo.com',
          '$2b$10$t1oZI1vC9YEc59sG23NJ3eKk.vSyXHkTBRLBCCcMWy3Sn//m6whUW','admin')
  RETURNING id INTO admin_id;

  INSERT INTO employees(company_id, department_id, employee_code, full_name, email, password_hash, role, manager_id)
  VALUES (cid, dep_id, 'E002','مدير القسم','manager@demo.com',
          '$2b$10$t1oZI1vC9YEc59sG23NJ3eKk.vSyXHkTBRLBCCcMWy3Sn//m6whUW','manager', admin_id)
  RETURNING id INTO mgr_id;

  INSERT INTO employees(company_id, department_id, employee_code, full_name, email, password_hash, role, manager_id)
  VALUES (cid, dep_id, 'E003','موظف تجريبي','emp@demo.com',
          '$2b$10$t1oZI1vC9YEc59sG23NJ3eKk.vSyXHkTBRLBCCcMWy3Sn//m6whUW','employee', mgr_id)
  RETURNING id INTO emp_id;

  UPDATE departments SET manager_id = mgr_id WHERE id = dep_id;

  INSERT INTO request_types(company_id, code, name_ar, name_en, default_entitlement) VALUES
    (cid,'leave','إجازة سنوية','Annual Leave', 21) RETURNING id INTO rt_leave;
  INSERT INTO request_types(company_id, code, name_ar, name_en, default_entitlement) VALUES
    (cid,'casual','عارضة','Casual Leave', 6) RETURNING id INTO rt_casual;
  INSERT INTO request_types(company_id, code, name_ar, name_en, default_entitlement) VALUES
    (cid,'permission','إذن','Permission', 12) RETURNING id INTO rt_perm;

  INSERT INTO leave_balances(employee_id, request_type_id, year, total_entitlement)
  SELECT e.id, rt.id, EXTRACT(YEAR FROM NOW())::int, rt.default_entitlement
  FROM employees e CROSS JOIN request_types rt WHERE e.company_id = cid;

  -- Geofence: القاهرة (30.0444, 31.2357) radius 500m
  INSERT INTO geofences(company_id, name, latitude, longitude, radius_meters)
  VALUES (cid, 'المقر الرئيسي - القاهرة', 30.0444, 31.2357, 500);
END $$;
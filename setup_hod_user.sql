-- ============================================================
-- ⚠️  IMPORTANT: Run Query 1 and Query 2 SEPARATELY.
-- In Supabase SQL Editor, run Query 1 first, click Run,
-- then CLEAR the editor, paste Query 2, and Run again.
-- ============================================================

-- ============================================================
-- QUERY 1 OF 2 — Run this first, then stop.
-- Adds 'department_head' as a valid role to your enum.
-- ============================================================
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'department_head';

-- ============================================================
-- QUERY 2 OF 2 — Run this AFTER Query 1 has succeeded.
-- Creates the Department Head (HoD) auth user and profile.
-- ============================================================

-- Step A: Create the auth user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token
) 
SELECT 
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'hod@maisarah.om',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"department_head"}', -- Set role metadata as well
  false,
  ''
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'hod@maisarah.om'
);

-- Step B: Create/Update the profile with role = 'department_head' and department_id = 'tax_vat' (Tax & VAT)
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  department_id,
  created_at,
  updated_at
)
SELECT 
  id,
  'hod@maisarah.om',
  'Khalfan Al-Abri',
  'department_head',
  'tax_vat',
  now(),
  now()
FROM auth.users 
WHERE email = 'hod@maisarah.om'
ON CONFLICT (id) DO UPDATE 
SET 
  role = 'department_head',
  full_name = 'Khalfan Al-Abri',
  department_id = 'tax_vat';

-- Step C: Verify — you should see one row with role = 'department_head'
SELECT u.email, p.full_name, p.role, p.department_id
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'hod@maisarah.om';

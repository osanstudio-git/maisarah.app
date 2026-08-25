-- ============================================================
-- ⚠️ IMPORTANT: Run Query 1 and Query 2 SEPARATELY.
-- In Supabase SQL Editor, run Query 1 first, click Run,
-- then CLEAR the editor, paste Query 2, and Run again.
-- ============================================================

-- ============================================================
-- QUERY 1 OF 2 — Run this first, then stop.
-- Adds 'crm' as a valid role to your enum and updates check constraint.
-- ============================================================
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'crm';

-- Drop the profiles role check constraint if it exists
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Re-create the check constraint to include 'crm'
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('employee', 'manager', 'hr', 'accountant', 'client', 'department_head', 'crm'));

-- ============================================================
-- QUERY 2 OF 2 — Run this AFTER Query 1 has succeeded.
-- Creates the CRM auth user and profile.
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
  'crm@maisarah.om',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  ''
 WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'crm@maisarah.om'
);

-- Step B: Create/Update the profile with role = 'crm'
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
)
SELECT 
  id,
  'crm@maisarah.om',
  'Mazin Al-Busaidi',
  'crm',
  now(),
  now()
FROM auth.users 
WHERE email = 'crm@maisarah.om'
ON CONFLICT (id) DO UPDATE 
SET 
  role = 'crm',
  full_name = 'Mazin Al-Busaidi';

-- Step C: Verify — you should see one row with role = 'crm'
SELECT u.email, p.full_name, p.role
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'crm@maisarah.om';

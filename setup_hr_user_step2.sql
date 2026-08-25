-- ============================================================
-- QUERY 2 OF 2 — Run this AFTER Query 1 has succeeded.
-- Creates the HR auth user and profile.
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
  'hr@maisarah.om',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  ''
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'hr@maisarah.om'
);

-- Step B: Create/Update the profile with role = 'hr'
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
  'hr@maisarah.om',
  'Fatma Al-Harthy',
  'hr',
  'internal_support',
  now(),
  now()
FROM auth.users 
WHERE email = 'hr@maisarah.om'
ON CONFLICT (id) DO UPDATE 
SET 
  role = 'hr',
  full_name = 'Fatma Al-Harthy',
  department_id = 'internal_support';

-- Step C: Verify — you should see one row with role = 'hr'
SELECT u.email, p.full_name, p.role
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'hr@maisarah.om';

-- ============================================================================
-- Fix & Set Password for marketing@maisarah.net
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/dkdomilstnzlysmsgcku/sql
-- ============================================================================

-- Step 1: Check existing user or create marketing@maisarah.net if not exists
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
  'marketing@maisarah.net',
  crypt('MAISARAH-26', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Marketing Team"}',
  false,
  ''
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE LOWER(email) = 'marketing@maisarah.net'
);

-- Step 2: Set the password to 'MAISARAH-26' and ensure email is confirmed
UPDATE auth.users
SET
  encrypted_password = crypt('MAISARAH-26', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{provider}',
    '"email"'
  ),
  updated_at = now()
WHERE LOWER(email) = 'marketing@maisarah.net';

-- Step 3: Ensure profile exists in public.profiles
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
  'marketing@maisarah.net',
  'Marketing Specialist',
  'employee',
  now(),
  now()
FROM auth.users
WHERE LOWER(email) = 'marketing@maisarah.net'
ON CONFLICT (id) DO UPDATE
SET
  email = 'marketing@maisarah.net',
  full_name = COALESCE(public.profiles.full_name, 'Marketing Specialist'),
  role = COALESCE(public.profiles.role, 'employee'),
  updated_at = now();

-- Step 4: Verification query - shows the result
SELECT
  u.id,
  u.email,
  u.email_confirmed_at,
  p.role,
  p.full_name,
  'Password is set to: MAISARAH-26' AS status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE LOWER(u.email) = 'marketing@maisarah.net';


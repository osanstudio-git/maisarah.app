-- ============================================================
-- DELETE BROKEN HR USER — Run in Supabase SQL Editor
-- This cleans up the failed insert so you can re-create
-- the user properly via Authentication > Users in the dashboard.
-- ============================================================

-- Step 1: Delete the profile first (to avoid foreign key conflicts)
DELETE FROM public.profiles
WHERE email = 'hr@maisarah.om';

-- Step 2: Delete the auth user
DELETE FROM auth.users
WHERE email = 'hr@maisarah.om';

-- Step 3: Verify both are gone (should return 0 rows)
SELECT email FROM auth.users WHERE email = 'hr@maisarah.om';
SELECT email FROM public.profiles WHERE email = 'hr@maisarah.om';

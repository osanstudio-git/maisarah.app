-- ============================================================================
-- Fix: Extend `user_role` ENUM & `profiles` / `hr_employees` schema
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Add missing portal roles to PostgreSQL ENUM `public.user_role`
-- (Fixes: 22P02 invalid input value for enum user_role: "sales" / "b2b_coordinator")
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'employee';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'hr';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'accountant';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'client';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'department_head';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'crm';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'sales';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'b2b_coordinator';

-- 2. Ensure all required columns exist on `public.profiles`
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department_id TEXT DEFAULT 'audit';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS secondary_roles TEXT[] DEFAULT '{}';

-- 3. Drop old `profiles_role_check` constraint and recreate with ALL portal roles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
CHECK (role::text IN (
    'employee',
    'manager',
    'hr',
    'accountant',
    'client',
    'department_head',
    'crm',
    'sales',
    'b2b_coordinator'
));

-- 4. Ensure all required columns exist on `public.hr_employees`
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS dept TEXT DEFAULT 'Audit';
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS department_id TEXT DEFAULT 'audit';
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Staff Member';
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS accessrole TEXT DEFAULT 'employee';
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS secondary_roles JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 5. Allow Managers & HR to update any profile via RLS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Managers and HR can update any profile'
    ) THEN
        CREATE POLICY "Managers and HR can update any profile" ON public.profiles
        FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND (p.role::text IN ('manager', 'hr') OR 'manager' = ANY(p.secondary_roles::text[]) OR 'hr' = ANY(p.secondary_roles::text[]))
            )
        );
    END IF;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'SUCCESS: user_role enum, profiles, and hr_employees updated!' AS status;

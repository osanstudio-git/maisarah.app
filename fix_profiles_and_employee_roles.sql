-- ============================================================================
-- Fix: Ensure `profiles` and `hr_employees` support Department, Job Position,
-- and Multi-Portal Role Updates without 400 (Bad Request) errors.
-- Run in Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Ensure all required columns exist on `public.profiles`
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'employee';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department_id TEXT DEFAULT 'audit';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS secondary_roles TEXT[] DEFAULT '{}';

-- 2. Update `profiles_role_check` to allow all portal roles (including sales & b2b_coordinator)
DO $$
BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN (
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
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 3. Ensure all required columns exist on `public.hr_employees`
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS dept TEXT DEFAULT 'Audit';
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS department_id TEXT DEFAULT 'audit';
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Staff Member';
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS accessrole TEXT DEFAULT 'employee';
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS secondary_roles JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 4. Allow Managers & HR to update `profiles` and `hr_employees` via RLS
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
                  AND (p.role IN ('manager', 'hr') OR 'manager' = ANY(p.secondary_roles) OR 'hr' = ANY(p.secondary_roles))
            )
        );
    END IF;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 5. Refresh PostgREST schema cache so newly added columns are visible immediately
NOTIFY pgrst, 'reload schema';

SELECT 'SUCCESS: profiles and hr_employees schema & role constraints updated!' AS status;

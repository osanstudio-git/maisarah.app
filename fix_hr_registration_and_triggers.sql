-- ============================================================
-- MAISARAH OS — FIX REGISTRATION LOOP & DATABASE TRIGGERS
-- ============================================================
-- Run this script in the Supabase SQL Editor.
-- Fixes trigger recursion, ensures clean profile & hr_employee setup,
-- and standardizes role constraints.
-- ============================================================

-- 1. Ensure valid profile roles
DO $$
BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('employee', 'manager', 'hr', 'accountant', 'client', 'department_head', 'crm'));
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 2. Non-recursive Employee Initialization Function
CREATE OR REPLACE FUNCTION public.handle_new_employee_setup()
RETURNS TRIGGER AS $$
BEGIN
    -- Only initialize balances & stub if the profile is an internal staff role
    IF NEW.role IN ('employee', 'hr', 'department_head', 'accountant', 'crm') THEN
        -- Insert initial leave balances safely
        INSERT INTO public.hr_leave_balances (employee_id, annual, sick, maternity, paternity)
        VALUES (NEW.id, 30, 15, 98, 7)
        ON CONFLICT (employee_id) DO NOTHING;

        -- Insert initial employee folder stub ONLY if it does not already exist
        INSERT INTO public.hr_employees (
            id, 
            full_name, 
            email, 
            joined_date, 
            employee_type,
            role,
            dept,
            status
        )
        VALUES (
            NEW.id, 
            COALESCE(NEW.full_name, split_part(COALESCE(NEW.email, ''), '@', 1)), 
            NEW.email, 
            CURRENT_DATE, 
            'Experienced',
            'Staff Member',
            COALESCE(NEW.department_id, 'Audit'),
            'active'
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Replace the recursive trigger: Only fire AFTER INSERT (NOT on update of role)
DROP TRIGGER IF EXISTS setup_new_employee_trigger ON public.profiles;
CREATE TRIGGER setup_new_employee_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_new_employee_setup();

-- 4. Clean up any invalid placement_status in hr_recruits
UPDATE public.hr_recruits 
SET placement_status = 'pending_placement' 
WHERE placement_status IS NULL OR placement_status NOT IN ('pending_placement', 'placed');

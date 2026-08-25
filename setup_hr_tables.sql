-- ============================================================
-- MAISARAH OS — HR PORTAL LIVE DATABASE MIGRATION SCRIPT
-- ============================================================
-- Run this script in the Supabase SQL Editor.
-- This sets up the schema for Employee Folders, Leave tracking, 
-- and Attendance logs with Row Level Security (RLS).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Create Core Tables
-- ------------------------------------------------------------

-- A. HR Employees Folder
CREATE TABLE IF NOT EXISTS public.hr_employees (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company_phone TEXT,
    civil_id TEXT,
    passport_no TEXT,
    residency_no TEXT,
    nationality TEXT,
    dob DATE,
    gender TEXT,
    marital_status TEXT,
    joined_date DATE DEFAULT CURRENT_DATE,
    immediate_supervisor TEXT,
    basic_salary NUMERIC DEFAULT 0,
    employee_type TEXT CHECK (employee_type IN ('Experienced', 'Trainee', 'Worker')),
    accommodation_status TEXT,
    accommodation_details TEXT,
    allowances JSONB DEFAULT '{"transport": 0, "housing": 0, "other": 0}'::jsonb,
    education JSONB DEFAULT '[]'::jsonb,
    experience JSONB DEFAULT '[]'::jsonb,
    family JSONB DEFAULT '[]'::jsonb,
    emergency_contact JSONB DEFAULT '{}'::jsonb,
    promotions JSONB DEFAULT '[]'::jsonb,
    disciplinaries JSONB DEFAULT '[]'::jsonb,
    bonuses JSONB DEFAULT '[]'::jsonb,
    transfers JSONB DEFAULT '[]'::jsonb,
    role TEXT,
    dept TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- B. Leave Balances Tracker
CREATE TABLE IF NOT EXISTS public.hr_leave_balances (
    employee_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    annual NUMERIC DEFAULT 30,
    sick NUMERIC DEFAULT 15,
    maternity NUMERIC DEFAULT 98,
    paternity NUMERIC DEFAULT 7,
    marriage_used BOOLEAN DEFAULT FALSE,
    hajj_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- C. Leave Requests Log
CREATE TABLE IF NOT EXISTS public.hr_leave_requests (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days NUMERIC NOT NULL,
    manager_approval TEXT DEFAULT 'Pending' CHECK (manager_approval IN ('Pending', 'Approved', 'Rejected')),
    hr_approval TEXT DEFAULT 'Pending' CHECK (hr_approval IN ('Pending', 'Approved', 'Rejected')),
    notes TEXT,
    sick_leave_details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- D. Attendance Punch Logs
CREATE TABLE IF NOT EXISTS public.hr_attendance (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    work_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIME,
    check_out TIME,
    status TEXT DEFAULT 'Present' CHECK (status IN ('Present', 'Late', 'Absent', 'On Leave')),
    break_duration INTEGER DEFAULT 0, -- in minutes
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id, work_date)
);

-- ------------------------------------------------------------
-- 2. Triggers for Auto-Updating updated_at Columns
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply Triggers (dropping old ones first to allow clean re-runs)
DROP TRIGGER IF EXISTS set_updated_at_hr_employees ON public.hr_employees;
CREATE TRIGGER set_updated_at_hr_employees
BEFORE UPDATE ON public.hr_employees
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_hr_leave_balances ON public.hr_leave_balances;
CREATE TRIGGER set_updated_at_hr_leave_balances
BEFORE UPDATE ON public.hr_leave_balances
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_hr_leave_requests ON public.hr_leave_requests;
CREATE TRIGGER set_updated_at_hr_leave_requests
BEFORE UPDATE ON public.hr_leave_requests
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_hr_attendance ON public.hr_attendance;
CREATE TRIGGER set_updated_at_hr_attendance
BEFORE UPDATE ON public.hr_attendance
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------
-- 3. Row Level Security (RLS) Enablement
-- ------------------------------------------------------------

ALTER TABLE public.hr_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_attendance ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 4. Security Policies
-- ------------------------------------------------------------

-- A. Policies for hr_employees
DROP POLICY IF EXISTS "Enable read for managers, hr, and self" ON public.hr_employees;
CREATE POLICY "Enable read for managers, hr, and self" 
ON public.hr_employees FOR SELECT USING (
    auth.uid() = id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('hr', 'manager')
    )
);

DROP POLICY IF EXISTS "Enable write for managers and hr" ON public.hr_employees;
CREATE POLICY "Enable write for managers and hr" 
ON public.hr_employees FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('hr', 'manager')
    )
);

-- B. Policies for hr_leave_balances
DROP POLICY IF EXISTS "Enable read for managers, hr, and self" ON public.hr_leave_balances;
CREATE POLICY "Enable read for managers, hr, and self" 
ON public.hr_leave_balances FOR SELECT USING (
    auth.uid() = employee_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('hr', 'manager')
    )
);

DROP POLICY IF EXISTS "Enable update for managers and hr" ON public.hr_leave_balances;
CREATE POLICY "Enable update for managers and hr" 
ON public.hr_leave_balances FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('hr', 'manager')
    )
);

-- C. Policies for hr_leave_requests
DROP POLICY IF EXISTS "Enable read for managers, hr, self, and HOD" ON public.hr_leave_requests;
CREATE POLICY "Enable read for managers, hr, self, and HOD" 
ON public.hr_leave_requests FOR SELECT USING (
    auth.uid() = employee_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('hr', 'manager')
    ) OR
    EXISTS (
        SELECT 1 FROM public.profiles hod 
        JOIN public.profiles emp ON emp.department_id = hod.department_id
        WHERE hod.id = auth.uid() 
          AND hod.role = 'department_head' 
          AND emp.id = employee_id
    )
);

DROP POLICY IF EXISTS "Enable insert for self, hr, and managers" ON public.hr_leave_requests;
CREATE POLICY "Enable insert for self, hr, and managers" 
ON public.hr_leave_requests FOR INSERT WITH CHECK (
    auth.uid() = employee_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('hr', 'manager')
    )
);

DROP POLICY IF EXISTS "Enable update for managers, hr, and HOD" ON public.hr_leave_requests;
CREATE POLICY "Enable update for managers, hr, and HOD" 
ON public.hr_leave_requests FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('hr', 'manager')
    ) OR
    EXISTS (
        SELECT 1 FROM public.profiles hod 
        JOIN public.profiles emp ON emp.department_id = hod.department_id
        WHERE hod.id = auth.uid() 
          AND hod.role = 'department_head' 
          AND emp.id = employee_id
    )
);

-- D. Policies for hr_attendance
DROP POLICY IF EXISTS "Enable read for managers, hr, and self" ON public.hr_attendance;
CREATE POLICY "Enable read for managers, hr, and self" 
ON public.hr_attendance FOR SELECT USING (
    auth.uid() = employee_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('hr', 'manager')
    )
);

DROP POLICY IF EXISTS "Enable insert for self, hr, and managers" ON public.hr_attendance;
CREATE POLICY "Enable insert for self, hr, and managers" 
ON public.hr_attendance FOR INSERT WITH CHECK (
    auth.uid() = employee_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('hr', 'manager')
    )
);

DROP POLICY IF EXISTS "Enable update for self, hr, and managers" ON public.hr_attendance;
CREATE POLICY "Enable update for self, hr, and managers" 
ON public.hr_attendance FOR UPDATE USING (
    auth.uid() = employee_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('hr', 'manager')
    )
);

-- ------------------------------------------------------------
-- 5. Helper Functions & Automation Triggers
-- ------------------------------------------------------------

-- Trigger to Automatically Create a Leave Balance Record and Employee Folder
-- when a new profile with role = 'employee' or 'hr' or 'department_head' is created.
CREATE OR REPLACE FUNCTION public.handle_new_employee_setup()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IN ('employee', 'hr', 'department_head') THEN
        -- Insert initial leave balances
        INSERT INTO public.hr_leave_balances (employee_id, annual, sick, maternity, paternity)
        VALUES (NEW.id, 30, 15, 98, 7)
        ON CONFLICT (employee_id) DO NOTHING;

        -- Insert initial empty employee folder
        INSERT INTO public.hr_employees (
            id, 
            full_name, 
            email, 
            joined_date, 
            employee_type
        )
        VALUES (
            NEW.id, 
            COALESCE(NEW.full_name, split_part(NEW.email, '@', 1)), 
            NEW.email, 
            CURRENT_DATE, 
            'Experienced'
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS setup_new_employee_trigger ON public.profiles;
CREATE TRIGGER setup_new_employee_trigger
AFTER INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_new_employee_setup();

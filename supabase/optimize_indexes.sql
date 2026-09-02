-- ============================================================================
-- MAISARAH PORTAL PERFORMANCE OPTIMIZATION INDEXES (DYNAMIC & ERROR-FREE)
-- Run this script in the Supabase SQL Editor (Project: dkdomilstnzlysmsgcku)
-- ============================================================================

DO $$
BEGIN
    -- 1. Profiles & Roles Optimization
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'department_id') THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_department_id ON public.profiles(department_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_at') THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);
    END IF;

    -- 2. Services & Tasks Indexing
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'employee_id') THEN
        CREATE INDEX IF NOT EXISTS idx_services_employee_id ON public.services(employee_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'client_id') THEN
        CREATE INDEX IF NOT EXISTS idx_services_client_id ON public.services(client_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_services_status ON public.services(status);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'due_date') THEN
        CREATE INDEX IF NOT EXISTS idx_services_due_date ON public.services(due_date);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'created_at') THEN
        CREATE INDEX IF NOT EXISTS idx_services_created_at ON public.services(created_at DESC);
    END IF;

    -- 3. Invoices & Financial Control
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'client_id') THEN
        CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'created_at') THEN
        CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);
    END IF;

    -- 4. HR Employees & Dossiers (Dept & Role)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hr_employees' AND column_name = 'dept') THEN
        CREATE INDEX IF NOT EXISTS idx_hr_employees_dept ON public.hr_employees(dept);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hr_employees' AND column_name = 'role') THEN
        CREATE INDEX IF NOT EXISTS idx_hr_employees_role ON public.hr_employees(role);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hr_employees' AND column_name = 'joined_date') THEN
        CREATE INDEX IF NOT EXISTS idx_hr_employees_joined_date ON public.hr_employees(joined_date);
    END IF;

    -- 5. HR Leave Requests & Approvals
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hr_leave_requests' AND column_name = 'employee_id') THEN
        CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_employee_id ON public.hr_leave_requests(employee_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hr_leave_requests' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_status ON public.hr_leave_requests(status);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hr_leave_requests' AND column_name = 'created_at') THEN
        CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_created_at ON public.hr_leave_requests(created_at DESC);
    END IF;

    -- 6. HR Attendance Tracking
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hr_attendance' AND column_name = 'employee_id') THEN
        CREATE INDEX IF NOT EXISTS idx_hr_attendance_employee_date ON public.hr_attendance(employee_id, date DESC);
    END IF;

    -- 7. Clients & Compliance
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'compliance_status') THEN
        CREATE INDEX IF NOT EXISTS idx_clients_compliance_status ON public.clients(compliance_status);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'created_at') THEN
        CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients(created_at DESC);
    END IF;

END $$;

-- Analyze core tables to refresh query planner statistics
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ANALYZE public.profiles;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hr_employees') THEN
        ANALYZE public.hr_employees;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'services') THEN
        ANALYZE public.services;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
        ANALYZE public.invoices;
    END IF;
END $$;

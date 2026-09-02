-- ============================================================================
-- MAISARAH PORTAL PERFORMANCE OPTIMIZATION INDEXES
-- Run this script in the Supabase SQL Editor (Project: dkdomilstnzlysmsgcku)
-- ============================================================================

-- 1. Profiles & Roles Optimization
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_department_id ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);

-- 2. Services & Tasks Indexing
CREATE INDEX IF NOT EXISTS idx_services_employee_id ON public.services(employee_id);
CREATE INDEX IF NOT EXISTS idx_services_client_id ON public.services(client_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON public.services(status);
CREATE INDEX IF NOT EXISTS idx_services_due_date ON public.services(due_date);
CREATE INDEX IF NOT EXISTS idx_services_created_at ON public.services(created_at DESC);

-- 3. Invoices & Financial Control
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);

-- 4. HR Employees & Dossiers
CREATE INDEX IF NOT EXISTS idx_hr_employees_status ON public.hr_employees(status);
CREATE INDEX IF NOT EXISTS idx_hr_employees_department_id ON public.hr_employees(department_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_joined_date ON public.hr_employees(joined_date);

-- 5. HR Leave Requests & Approvals
CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_employee_id ON public.hr_leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_status ON public.hr_leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_created_at ON public.hr_leave_requests(created_at DESC);

-- 6. Attendance Tracking
CREATE INDEX IF NOT EXISTS idx_hr_attendance_employee_date ON public.hr_attendance(employee_id, date DESC);

-- 7. Clients & Leads
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients(created_at DESC);

-- 8. Audit & Activity Logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Analyze tables to refresh PostgreSQL query planner statistics
ANALYZE public.profiles;
ANALYZE public.hr_employees;
ANALYZE public.services;
ANALYZE public.invoices;
ANALYZE public.hr_leave_requests;

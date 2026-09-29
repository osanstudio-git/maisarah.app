-- =========================================================================
-- MAISARAH OS — MULTI-ROLE RBAC & WORKSPACE SWITCHING MIGRATION (COMPLETE & ROBUST)
-- =========================================================================
-- Run this script in the Supabase SQL Editor.
-- Sets up:
--   1. Ensures all tables and referenced columns exist (client_id, recipient_id, secondary_roles, etc.)
--   2. has_role(required_role) and has_any_role(required_roles) security functions
--   3. Multi-role enabled Row Level Security (RLS) policies
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------------------
-- 1. Ensure Tables & Columns Exist Across All Modules
-- -------------------------------------------------------------------------

-- 1.1 Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL DEFAULT '',
    cr_number TEXT,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 Profiles & HR Employees
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    role TEXT DEFAULT 'employee',
    secondary_roles TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'employee';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS secondary_roles TEXT[] DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.hr_employees (
    id UUID PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    secondary_roles TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS secondary_roles TEXT[] DEFAULT '{}';

-- 1.3 Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS sender_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_role TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS service_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS invoice_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS receipt_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS ref_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS ref_table TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'due_date_alert';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- 1.4 Services / Tasks Table
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS employee_id UUID;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 1.5 Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS service_id UUID;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- 1.6 Receipts Table
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS invoice_id UUID;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS service_id UUID;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS collected_by UUID;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS verified_by UUID;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- 1.7 CRM Leads & Quotations
CREATE TABLE IF NOT EXISTS public.crm_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS lead_id UUID;

-- 1.8 DSR Entries
CREATE TABLE IF NOT EXISTS public.dsr_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.dsr_entries ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE public.dsr_entries ADD COLUMN IF NOT EXISTS employee_id UUID;

-- -------------------------------------------------------------------------
-- 2. Security Functions for Multi-Role Evaluation
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    user_sec_roles TEXT[];
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT role, secondary_roles INTO user_role, user_sec_roles
    FROM public.profiles
    WHERE id = auth.uid();

    -- Executive Manager always has super-admin access
    IF user_role = 'manager' THEN
        RETURN TRUE;
    END IF;

    -- Check primary role
    IF user_role = required_role THEN
        RETURN TRUE;
    END IF;

    -- Check secondary roles array
    IF user_sec_roles IS NOT NULL AND required_role = ANY(user_sec_roles) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_any_role(required_roles TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    user_sec_roles TEXT[];
    req TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT role, secondary_roles INTO user_role, user_sec_roles
    FROM public.profiles
    WHERE id = auth.uid();

    -- Executive Manager has universal access
    IF user_role = 'manager' THEN
        RETURN TRUE;
    END IF;

    FOREACH req IN ARRAY required_roles
    LOOP
        IF user_role = req OR (user_sec_roles IS NOT NULL AND req = ANY(user_sec_roles)) THEN
            RETURN TRUE;
        END IF;
    END LOOP;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------------------------------
-- 3. Profiles RLS for Self & Management
-- -------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
CREATE POLICY "Users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid() OR public.has_role('manager') OR public.has_role('hr'))
WITH CHECK (id = auth.uid() OR public.has_role('manager') OR public.has_role('hr'));

-- -------------------------------------------------------------------------
-- 4. Multi-Role Policies on Notifications
-- -------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
CREATE POLICY "Users can view their notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (
    recipient_id = auth.uid() OR 
    (recipient_role IS NOT NULL AND public.has_role(recipient_role)) OR
    (role IS NOT NULL AND public.has_role(role)) OR
    public.has_role('manager')
);

DROP POLICY IF EXISTS "Users and staff can insert notifications" ON public.notifications;
CREATE POLICY "Users and staff can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
CREATE POLICY "Users can update their notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (
    recipient_id = auth.uid() OR 
    (recipient_role IS NOT NULL AND public.has_role(recipient_role)) OR
    (role IS NOT NULL AND public.has_role(role)) OR
    public.has_role('manager')
);

-- -------------------------------------------------------------------------
-- 5. Multi-Role Policies on Services & Tasks
-- -------------------------------------------------------------------------
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view services" ON public.services;
CREATE POLICY "Staff can view services"
ON public.services FOR SELECT
TO authenticated
USING (
    public.has_any_role(ARRAY['employee', 'department_head', 'accountant', 'manager', 'crm', 'hr']) OR
    client_id = auth.uid()
);

-- -------------------------------------------------------------------------
-- 6. Multi-Role Policies on Invoices & Receipts
-- -------------------------------------------------------------------------
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage invoices" ON public.invoices;
CREATE POLICY "Staff can manage invoices"
ON public.invoices FOR ALL
TO authenticated
USING (
    public.has_any_role(ARRAY['accountant', 'manager', 'department_head', 'employee', 'crm']) OR
    client_id = auth.uid()
)
WITH CHECK (
    public.has_any_role(ARRAY['accountant', 'manager', 'department_head', 'employee', 'crm'])
);

DROP POLICY IF EXISTS "Staff can manage receipts" ON public.receipts;
CREATE POLICY "Staff can manage receipts"
ON public.receipts FOR ALL
TO authenticated
USING (
    public.has_any_role(ARRAY['accountant', 'manager', 'department_head', 'employee', 'crm']) OR
    client_id = auth.uid()
)
WITH CHECK (
    public.has_any_role(ARRAY['accountant', 'manager', 'department_head', 'employee', 'crm'])
);

-- -------------------------------------------------------------------------
-- 7. Multi-Role Policies on CRM Leads & Quotations
-- -------------------------------------------------------------------------
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage CRM leads" ON public.crm_leads;
CREATE POLICY "Staff can manage CRM leads"
ON public.crm_leads FOR ALL
TO authenticated
USING (
    public.has_any_role(ARRAY['crm', 'manager', 'department_head', 'employee', 'accountant'])
)
WITH CHECK (
    public.has_any_role(ARRAY['crm', 'manager', 'department_head', 'employee', 'accountant'])
);

DROP POLICY IF EXISTS "Staff can manage quotations" ON public.quotations;
CREATE POLICY "Staff can manage quotations"
ON public.quotations FOR ALL
TO authenticated
USING (
    public.has_any_role(ARRAY['crm', 'manager', 'department_head', 'employee', 'accountant'])
)
WITH CHECK (
    public.has_any_role(ARRAY['crm', 'manager', 'department_head', 'employee', 'accountant'])
);

-- -------------------------------------------------------------------------
-- 8. Multi-Role Policies on DSR Entries
-- -------------------------------------------------------------------------
ALTER TABLE public.dsr_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage DSR entries" ON public.dsr_entries;
CREATE POLICY "Staff can manage DSR entries"
ON public.dsr_entries FOR ALL
TO authenticated
USING (
    public.has_any_role(ARRAY['accountant', 'manager', 'department_head'])
)
WITH CHECK (
    public.has_any_role(ARRAY['accountant', 'manager', 'department_head'])
);

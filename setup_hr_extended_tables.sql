-- ============================================================
-- MAISARAH OS — COMPLETE HR & WORKFORCE DATABASE MIGRATION SCRIPT
-- ============================================================
-- Run this entire script in your Supabase SQL Editor.
-- It is safe to run multiple times (idempotent).
-- It creates and updates:
--  1. hr_recruits (Candidates, Pipeline, Placement)
--  2. hr_employees (Extended Employee Dossiers)
--  3. hr_attendance (Daily Logs & Clock-in/out)
--  4. hr_leave_requests & hr_leave_balances (Leave Management)
--  5. hr_requests (Administrative Letters, Asset requests)
--  6. hr_contracts (Contracts & Visas)
--  7. hr_documents (Document Vault & Expiry Tracker)
--  8. hr_disciplinary (Rewards & Disciplinary Actions)
--  9. hr_performance (Reviews & Appraisals)
-- 10. hr_terminations (Offboarding & EOS Settlements)
-- 11. hr_payroll_runs (Monthly Payroll Calculations)
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- 1. HR Recruits & Candidates Pipeline
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_recruits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT,
    dept TEXT,
    stage TEXT DEFAULT 'cv_received',
    score NUMERIC DEFAULT 85,
    resume_name TEXT,
    resume_url TEXT,
    employment_type TEXT DEFAULT 'Experienced',
    placement_status TEXT DEFAULT 'pending_placement',
    onboarding_tasks JSONB DEFAULT '{"contract_signed": false, "bank_details_submitted": false, "documents_uploaded": false, "it_assets_ready": false}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist for existing hr_recruits
ALTER TABLE public.hr_recruits ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.hr_recruits ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.hr_recruits ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.hr_recruits ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.hr_recruits ADD COLUMN IF NOT EXISTS dept TEXT;
ALTER TABLE public.hr_recruits ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'cv_received';
ALTER TABLE public.hr_recruits ADD COLUMN IF NOT EXISTS score NUMERIC DEFAULT 85;
ALTER TABLE public.hr_recruits ADD COLUMN IF NOT EXISTS resume_name TEXT;
ALTER TABLE public.hr_recruits ADD COLUMN IF NOT EXISTS resume_url TEXT;
ALTER TABLE public.hr_recruits ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'Experienced';
ALTER TABLE public.hr_recruits ADD COLUMN IF NOT EXISTS placement_status TEXT DEFAULT 'pending_placement';
ALTER TABLE public.hr_recruits ADD COLUMN IF NOT EXISTS onboarding_tasks JSONB DEFAULT '{"contract_signed": false, "bank_details_submitted": false, "documents_uploaded": false, "it_assets_ready": false}'::jsonb;
ALTER TABLE public.hr_recruits ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.hr_recruits ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------
-- 2. HR Extended Employees Table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_employees (
    id UUID PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company_phone TEXT,
    civil_id TEXT,
    passport_no TEXT,
    residency_no TEXT,
    nationality TEXT DEFAULT 'Omani',
    dob DATE,
    gender TEXT DEFAULT 'Male',
    marital_status TEXT DEFAULT 'Single',
    joined_date DATE DEFAULT CURRENT_DATE,
    immediate_supervisor TEXT,
    basic_salary NUMERIC DEFAULT 0,
    employee_type TEXT DEFAULT 'Experienced',
    accommodation_status TEXT DEFAULT 'Lives with family',
    role TEXT,
    dept TEXT,
    accessRole TEXT,
    department_id TEXT,
    secondary_roles JSONB DEFAULT '[]'::jsonb,
    documents JSONB DEFAULT '[]'::jsonb,
    disciplinaries JSONB DEFAULT '[]'::jsonb,
    bonuses JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist for existing hr_employees
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS company_phone TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS civil_id TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS passport_no TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS residency_no TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Omani';
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'Male';
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS marital_status TEXT DEFAULT 'Single';
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS joined_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS immediate_supervisor TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS basic_salary NUMERIC DEFAULT 0;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS employee_type TEXT DEFAULT 'Experienced';
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS accommodation_status TEXT DEFAULT 'Lives with family';
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS dept TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS accessRole TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS department_id TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS secondary_roles JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS disciplinaries JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS bonuses JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------
-- 3. HR Attendance Logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    work_date DATE NOT NULL DEFAULT CURRENT_DATE,
    clock_in TIME,
    clock_out TIME,
    status TEXT DEFAULT 'Present',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 4. HR Leave Requests & Balances
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days NUMERIC NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'Pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hr_leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL UNIQUE,
    annual_total NUMERIC DEFAULT 30,
    annual_used NUMERIC DEFAULT 0,
    sick NUMERIC DEFAULT 15,
    maternity NUMERIC DEFAULT 50,
    paternity NUMERIC DEFAULT 7,
    marriage_used BOOLEAN DEFAULT false,
    hajj_used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 5. HR Administrative Requests (Salary certs, assets, transfers)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    type TEXT NOT NULL,
    submitted_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'Pending',
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 6. HR Contracts & Visa Records
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    probation_months INTEGER DEFAULT 3,
    notice_days INTEGER DEFAULT 30,
    status TEXT NOT NULL DEFAULT 'Active',
    contract_file TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 7. HR Document Vault
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    doc_name TEXT NOT NULL,
    doc_type TEXT NOT NULL,
    number TEXT,
    expiry_date DATE,
    file_url TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 8. HR Disciplinary & Reward Records
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_disciplinary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    type TEXT NOT NULL,
    action_type TEXT NOT NULL,
    reason TEXT NOT NULL,
    amount_or_penalty TEXT,
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    issued_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 9. HR Performance Appraisals
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    rating NUMERIC NOT NULL,
    cycle TEXT NOT NULL,
    goals_met TEXT,
    strengths TEXT,
    improvements TEXT,
    reviewer TEXT,
    review_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 10. HR Termination & Offboarding
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_terminations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    last_working_day DATE NOT NULL,
    reason TEXT NOT NULL,
    eos_benefits NUMERIC DEFAULT 0,
    tasks JSONB DEFAULT '[{"id":"t1","title":"Return Company Laptop, Monitors & Access Card","completed":false},{"id":"t2","title":"Deactivate Corporate Email & System Accounts","completed":false},{"id":"t3","title":"Calculate & Approve Final EOS Settlement Pay","completed":false},{"id":"t4","title":"Draft & Issue Certificate of Employment Experience","completed":false}]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 11. HR Payroll Disbursal & Salary Runs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    month TEXT NOT NULL,
    basic_salary NUMERIC NOT NULL DEFAULT 0,
    transport_allowance NUMERIC DEFAULT 0,
    housing_allowance NUMERIC DEFAULT 0,
    other_allowance NUMERIC DEFAULT 0,
    deductions NUMERIC DEFAULT 0,
    overtime NUMERIC DEFAULT 0,
    incentives NUMERIC DEFAULT 0,
    bonuses NUMERIC DEFAULT 0,
    net_salary NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Row Level Security (RLS) Enablement & Policies
-- ------------------------------------------------------------
DO $$ 
DECLARE
    tbl text;
    tables_list text[] := ARRAY[
        'hr_recruits',
        'hr_employees',
        'hr_attendance',
        'hr_leave_requests',
        'hr_leave_balances',
        'hr_requests',
        'hr_contracts',
        'hr_documents',
        'hr_disciplinary',
        'hr_performance',
        'hr_terminations',
        'hr_payroll_runs'
    ];
BEGIN
    FOR tbl IN SELECT unnest(tables_list)
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
        
        EXECUTE format('DROP POLICY IF EXISTS "Allow staff read access" ON public.%I', tbl);
        EXECUTE format('CREATE POLICY "Allow staff read access" ON public.%I FOR SELECT USING (true)', tbl);

        EXECUTE format('DROP POLICY IF EXISTS "Allow staff write access" ON public.%I', tbl);
        EXECUTE format('CREATE POLICY "Allow staff write access" ON public.%I FOR ALL USING (true)', tbl);
    END LOOP;
END $$;

-- ------------------------------------------------------------
-- Realtime Replication
-- ------------------------------------------------------------
DO $$
DECLARE
    tbl text;
    tables_list text[] := ARRAY[
        'hr_recruits',
        'hr_employees',
        'hr_attendance',
        'hr_leave_requests',
        'hr_leave_balances',
        'hr_requests',
        'hr_contracts',
        'hr_documents',
        'hr_disciplinary',
        'hr_performance',
        'hr_terminations',
        'hr_payroll_runs'
    ];
BEGIN
    FOR tbl IN SELECT unnest(tables_list)
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
        EXCEPTION
            WHEN duplicate_object THEN
                -- table is already in publication, ignore
                NULL;
            WHEN undefined_object THEN
                -- publication does not exist, ignore
                NULL;
        END;
    END LOOP;
END $$;

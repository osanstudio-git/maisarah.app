-- ============================================================
-- MAISARAH OS — EXTENDED HR PORTAL LIVE DATABASE MIGRATION SCRIPT
-- ============================================================
-- Run this script in the Supabase SQL Editor.
-- This sets up the schema for HR Requests, Contracts, Payroll,
-- Performance Reviews, Disciplinary/Rewards, Documents, and Terminations.
-- ============================================================

-- ------------------------------------------------------------
-- 1. HR Administrative Requests (Salary certificates, assets, transfers)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_requests (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    submitted_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2. HR Contracts & Visa Records
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    probation_months INTEGER DEFAULT 3,
    notice_days INTEGER DEFAULT 30,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Expiring Soon', 'Expired')),
    contract_file TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 3. HR Document Vault
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    doc_name TEXT NOT NULL,
    doc_type TEXT NOT NULL,
    number TEXT,
    expiry_date DATE,
    file_url TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Expiring Soon', 'Expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 4. HR Disciplinary & Reward Records
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_disciplinary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('Reward', 'Disciplinary')),
    action_type TEXT NOT NULL,
    reason TEXT NOT NULL,
    amount_or_penalty TEXT,
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    issued_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 5. HR Performance Appraisals
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating NUMERIC NOT NULL CHECK (rating >= 1 AND rating <= 5),
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
-- 6. HR Termination & Offboarding
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_terminations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_working_day DATE NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('Resignation', 'Dismissal', 'Redundancy', 'End of Contract')),
    eos_benefits NUMERIC DEFAULT 0,
    tasks JSONB DEFAULT '[{"id":"t1","title":"Return Company Laptop, Monitors & Access Card","completed":false},{"id":"t2","title":"Deactivate Corporate Email & System Accounts","completed":false},{"id":"t3","title":"Calculate & Approve Final EOS Settlement Pay","completed":false},{"id":"t4","title":"Draft & Issue Certificate of Employment Experience","completed":false}]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 7. HR Payroll Disbursal & Salary Runs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Paid', 'Pending')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Row Level Security (RLS) Enablement
-- ------------------------------------------------------------
ALTER TABLE public.hr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_disciplinary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_terminations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_payroll_runs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- Security Policies
-- ------------------------------------------------------------
DO $$ 
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT unnest(ARRAY['hr_requests', 'hr_contracts', 'hr_documents', 'hr_disciplinary', 'hr_performance', 'hr_terminations', 'hr_payroll_runs'])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow staff read access" ON public.%I', tbl);
        EXECUTE format('CREATE POLICY "Allow staff read access" ON public.%I FOR SELECT USING (true)', tbl);

        EXECUTE format('DROP POLICY IF EXISTS "Allow staff write access" ON public.%I', tbl);
        EXECUTE format('CREATE POLICY "Allow staff write access" ON public.%I FOR ALL USING (true)', tbl);
    END LOOP;
END $$;

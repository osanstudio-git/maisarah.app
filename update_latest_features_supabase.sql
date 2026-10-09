-- =========================================================================
-- MAISARAH OS — COMPLETE SCHEMA & RECENT FEATURES SYNC MIGRATION
-- =========================================================================
-- Run this script in the Supabase SQL Editor to sync all latest features:
--   1. Monthly Performance Reports (Executive & Department Reports)
--   2. Task Management & Workload Assignment (Services Priority & Status)
--   3. Daily Service Register (DSR) & Verification Schema
--   4. Real-time Notifications (Targeted Alerts for Task Assignments & Invoices)
--   5. Invoices & Receipts VAT & Reference Schema
--   6. Realtime Publication & RLS Policies
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------------------
-- 1. Monthly Performance Reports Table
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.monthly_performance_reports (
    id TEXT PRIMARY KEY,
    month INTEGER NOT NULL,            -- 0 to 11 (Jan=0, Dec=11)
    year INTEGER NOT NULL,             -- e.g. 2026
    reference_number TEXT NOT NULL,    -- e.g. MSR-MOPR-2026-10
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    manager_name TEXT NOT NULL,
    department_scope TEXT NOT NULL DEFAULT 'Consolidated Office Performance (All Departments)',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'archived')),
    report_data JSONB NOT NULL,        -- Complete structured 6-page data
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_monthly_report UNIQUE (month, year)
);

ALTER TABLE public.monthly_performance_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read on monthly reports" ON public.monthly_performance_reports;
DROP POLICY IF EXISTS "Allow authenticated staff to manage monthly reports" ON public.monthly_performance_reports;

CREATE POLICY "Allow authenticated read on monthly reports"
ON public.monthly_performance_reports
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated staff to manage monthly reports"
ON public.monthly_performance_reports
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 2. Services / Operations Tasks Schema Upgrades
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'ongoing',
    priority TEXT DEFAULT 'medium',
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    employee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    department_id TEXT DEFAULT 'audit',
    budget NUMERIC DEFAULT 0,
    due_date DATE,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ongoing';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS department_id TEXT DEFAULT 'audit';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- -------------------------------------------------------------------------
-- 3. Daily Service Register (DSR) Ledger Schema
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dsr_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE DEFAULT CURRENT_DATE,
    receipt_id UUID,
    invoice_id UUID,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    employee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    employee_name TEXT,
    company_name TEXT NOT NULL,
    service_name TEXT NOT NULL,
    cr_number TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    gov_fee NUMERIC DEFAULT 0,
    profit NUMERIC DEFAULT 0,
    payment_method TEXT,
    status TEXT DEFAULT 'Paid',
    payment_date DATE DEFAULT CURRENT_DATE,
    invoice_number TEXT,
    receipt_number TEXT,
    payment_reference TEXT,
    accountant_note TEXT,
    verified_by_accountant BOOLEAN DEFAULT FALSE,
    invoice_issued BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.dsr_entries ADD COLUMN IF NOT EXISTS verified_by_accountant BOOLEAN DEFAULT FALSE;
ALTER TABLE public.dsr_entries ADD COLUMN IF NOT EXISTS invoice_issued BOOLEAN DEFAULT FALSE;
ALTER TABLE public.dsr_entries ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE public.dsr_entries ADD COLUMN IF NOT EXISTS accountant_note TEXT;
ALTER TABLE public.dsr_entries ADD COLUMN IF NOT EXISTS gov_fee NUMERIC DEFAULT 0;
ALTER TABLE public.dsr_entries ADD COLUMN IF NOT EXISTS profit NUMERIC DEFAULT 0;

-- -------------------------------------------------------------------------
-- 4. Real-time Notifications Table (Task Alerts & Cross-Portal Broadcasts)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_role TEXT,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    invoice_id UUID,
    receipt_id UUID,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'general',
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_role TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- -------------------------------------------------------------------------
-- 5. Invoices & Receipts VAT Schema
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    vat_amount NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'draft',
    due_date DATE,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS vat_amount NUMERIC DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT UNIQUE NOT NULL,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    collected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    amount_paid NUMERIC NOT NULL DEFAULT 0,
    gov_fee NUMERIC DEFAULT 0,
    payment_method TEXT,
    payment_reference TEXT,
    payment_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'draft',
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS gov_fee NUMERIC DEFAULT 0;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- -------------------------------------------------------------------------
-- 6. Row Level Security (RLS) Enablement
-- -------------------------------------------------------------------------
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dsr_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
    tbl text;
    tables_list text[] := ARRAY['services', 'invoices', 'receipts', 'dsr_entries', 'notifications', 'clients', 'monthly_performance_reports'];
BEGIN
    FOR tbl IN SELECT unnest(tables_list)
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow staff read access" ON public.%I', tbl);
        EXECUTE format('CREATE POLICY "Allow staff read access" ON public.%I FOR SELECT USING (true)', tbl);

        EXECUTE format('DROP POLICY IF EXISTS "Allow staff write access" ON public.%I', tbl);
        EXECUTE format('CREATE POLICY "Allow staff write access" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl);
    END LOOP;
END $$;

-- -------------------------------------------------------------------------
-- 7. Supabase Realtime Replication Enablement
-- -------------------------------------------------------------------------
DO $$
DECLARE
    tbl text;
    tables_list text[] := ARRAY['notifications', 'services', 'invoices', 'receipts', 'dsr_entries', 'monthly_performance_reports'];
BEGIN
    FOR tbl IN SELECT unnest(tables_list)
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
        EXCEPTION
            WHEN duplicate_object THEN NULL;
            WHEN undefined_object THEN NULL;
        END;
    END LOOP;
END $$;

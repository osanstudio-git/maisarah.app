-- ============================================================
-- MAISARAH OS — PHASE 2: FINANCIAL & REALTIME SCHEMA MIGRATION
-- ============================================================
-- Run this script in the Supabase SQL Editor.
-- Sets up:
--   1. services (Tasks / Deliverables)
--   2. invoices (Draft & Issued Invoices)
--   3. receipts (Draft & Verified Payment Receipts)
--   4. dsr_entries (Daily Sales Report Ledger)
--   5. notifications (Accounts <-> Work Team Realtime Alerts)
--   6. Supabase Realtime publication & RLS policies
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- 1. Clients Table (Ensure Base Structure Exists)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    cr_number TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    assigned_employee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    compliance_status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2. Services / Tasks Table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'started', 'ongoing', 'under_review', 'completed', 'delayed', 'cancelled')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
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

-- Ensure all columns exist
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS budget NUMERIC DEFAULT 0;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS department_id TEXT DEFAULT 'audit';

-- ------------------------------------------------------------
-- 3. Invoices Table (Auto-Draft on Task Start)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'partially_paid', 'paid', 'cancelled', 'overdue')),
    due_date DATE,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- ------------------------------------------------------------
-- 4. Receipts Table (Draft on Payment Log -> Verified by Accounts)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT UNIQUE NOT NULL,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    collected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    amount_paid NUMERIC NOT NULL DEFAULT 0,
    gov_fee NUMERIC DEFAULT 0,
    payment_method TEXT CHECK (payment_method IN ('Mobile Payment', 'POS', 'Bank transfer', 'Cash', 'Cheque', 'Online', '')),
    payment_reference TEXT,
    payment_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'verified', 'rejected', 'cancelled')),
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id) ON DELETE SET NULL;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS collected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS gov_fee NUMERIC DEFAULT 0;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- ------------------------------------------------------------
-- 5. Daily Sales Report (DSR) Ledger Table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dsr_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE DEFAULT CURRENT_DATE,
    receipt_id UUID REFERENCES public.receipts(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
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
    status TEXT DEFAULT 'Paid' CHECK (status IN ('Paid', 'Unpaid', 'Partial')),
    payment_date DATE DEFAULT CURRENT_DATE,
    invoice_number TEXT,
    receipt_number TEXT,
    payment_reference TEXT,
    accountant_note TEXT,
    verified_by_accountant BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 6. Notifications Table (Accounts <-> Work Team Realtime Alerts)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_role TEXT, -- e.g. 'accountant', 'employee', 'department_head', 'manager'
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    receipt_id UUID REFERENCES public.receipts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'due_date_alert' CHECK (type IN ('due_date_alert', 'task_started', 'payment_logged', 'receipt_verified', 'invoice_created', 'general')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 7. Indexes for Query Performance
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_services_employee_id ON public.services(employee_id);
CREATE INDEX IF NOT EXISTS idx_services_client_id ON public.services(client_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON public.services(status);
CREATE INDEX IF NOT EXISTS idx_services_due_date ON public.services(due_date);

CREATE INDEX IF NOT EXISTS idx_invoices_service_id ON public.invoices(service_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

CREATE INDEX IF NOT EXISTS idx_receipts_invoice_id ON public.receipts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_receipts_service_id ON public.receipts(service_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON public.receipts(status);

CREATE INDEX IF NOT EXISTS idx_dsr_entries_receipt_id ON public.dsr_entries(receipt_id);
CREATE INDEX IF NOT EXISTS idx_dsr_entries_date ON public.dsr_entries(date DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_role ON public.notifications(recipient_role, is_read);

-- ------------------------------------------------------------
-- 8. Row Level Security (RLS) & Access Policies
-- ------------------------------------------------------------
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dsr_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
    tbl text;
    tables_list text[] := ARRAY['services', 'invoices', 'receipts', 'dsr_entries', 'notifications', 'clients'];
BEGIN
    FOR tbl IN SELECT unnest(tables_list)
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow staff read access" ON public.%I', tbl);
        EXECUTE format('CREATE POLICY "Allow staff read access" ON public.%I FOR SELECT USING (true)', tbl);

        EXECUTE format('DROP POLICY IF EXISTS "Allow staff write access" ON public.%I', tbl);
        EXECUTE format('CREATE POLICY "Allow staff write access" ON public.%I FOR ALL USING (true)', tbl);
    END LOOP;
END $$;

-- ------------------------------------------------------------
-- 9. Supabase Realtime Replication Setup
-- ------------------------------------------------------------
DO $$
DECLARE
    tbl text;
    tables_list text[] := ARRAY['notifications', 'services', 'invoices', 'receipts', 'dsr_entries'];
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

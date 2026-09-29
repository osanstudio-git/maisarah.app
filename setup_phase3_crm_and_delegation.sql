-- ============================================================
-- MAISARAH OS — PHASE 3: CRM, QUOTATIONS & WORK DELEGATION SCHEMA
-- ============================================================
-- Run this script in the Supabase SQL Editor.
-- Sets up:
--   1. clients (Verifies and extends client fields)
--   2. crm_leads (Tracks potential clients, interested services, and lead pipeline)
--   3. quotations (Draft and approved proposals linked to leads/clients)
--   4. Indexes, foreign keys, RLS policies & Supabase Realtime publication
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- 1. Clients Table (Verify & Extend)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    cr_number TEXT,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    assigned_employee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    compliance_status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all necessary columns exist on clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cr_number TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS assigned_employee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS compliance_status TEXT DEFAULT 'active';

-- ------------------------------------------------------------
-- 2. CRM Leads Table (Pipeline & Interested Services)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_name TEXT NOT NULL,
    company_name TEXT,
    phone TEXT,
    email TEXT,
    source TEXT DEFAULT 'direct', -- e.g. 'direct', 'referral', 'website', 'phone', 'social', 'campaign'
    interested_service TEXT NOT NULL,
    department_id TEXT DEFAULT 'audit', -- routing department: 'audit', 'tax', 'legal', 'advisory', 'accounting'
    estimated_value NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'accepted', 'rejected', 'lost')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    converted_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    converted_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist on crm_leads
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct';
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS department_id TEXT DEFAULT 'audit';
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS estimated_value NUMERIC DEFAULT 0;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS converted_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS notes TEXT;

-- ------------------------------------------------------------
-- 3. Quotations Table (Auto-Draft on Quoted Status -> Proposal)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_number TEXT UNIQUE NOT NULL,
    lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    service_details TEXT,
    department_id TEXT DEFAULT 'audit',
    subtotal NUMERIC NOT NULL DEFAULT 0,
    vat_rate NUMERIC DEFAULT 5, -- 5% Standard VAT
    vat_amount NUMERIC DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'OMR',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
    valid_until DATE,
    terms_conditions TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist on quotations
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS service_details TEXT;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS department_id TEXT DEFAULT 'audit';
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS vat_rate NUMERIC DEFAULT 5;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS vat_amount NUMERIC DEFAULT 0;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'OMR';
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS valid_until DATE;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS terms_conditions TEXT;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- 4. High-Performance Query Indexes
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON public.crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_department ON public.crm_leads(department_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned ON public.crm_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_leads_converted_client ON public.crm_leads(converted_client_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_created_at ON public.crm_leads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quotations_lead_id ON public.quotations(lead_id);
CREATE INDEX IF NOT EXISTS idx_quotations_client_id ON public.quotations(client_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON public.quotations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clients_cr_number ON public.clients(cr_number);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_emp ON public.clients(assigned_employee_id);

-- ------------------------------------------------------------
-- 5. Row Level Security (RLS) & Access Policies
-- ------------------------------------------------------------
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
    tbl text;
    tables_list text[] := ARRAY['crm_leads', 'quotations', 'clients'];
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
-- 6. Supabase Realtime Publication Setup
-- ------------------------------------------------------------
DO $$
DECLARE
    tbl text;
    tables_list text[] := ARRAY['crm_leads', 'quotations', 'clients'];
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

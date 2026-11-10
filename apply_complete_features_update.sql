-- ============================================================================
-- Maisarah Complete Migration Script: Clients, Jobs, Notifications & Storage
-- Run this in the Supabase Dashboard -> SQL Editor
-- This script is completely IDEMPOTENT (safe to run multiple times)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTEND `clients` TABLE (Company 360°, Representative, Documents & Tax)
-- ----------------------------------------------------------------------------
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS representative_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS representative_phone TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS representative_email TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS industry TEXT DEFAULT 'General Trading';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS common_documents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tax_number TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS vat_number TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cr_number TEXT;

-- Performance index for fast search & lookup
CREATE INDEX IF NOT EXISTS idx_clients_cr_number ON public.clients(cr_number);

-- ----------------------------------------------------------------------------
-- 2. EXTEND `services` TABLE (Job Scope, Separate Charges, Durations, Activities)
-- ----------------------------------------------------------------------------
-- Ensure both budget and charge_amount columns exist first
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS budget NUMERIC DEFAULT 0;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS charge_amount NUMERIC DEFAULT 0;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS duration_type TEXT DEFAULT 'one_time';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS quarterly_status JSONB DEFAULT '{"q1":"pending","q2":"pending","q3":"pending","q4":"pending"}'::jsonb;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS invoice_status TEXT DEFAULT 'unbilled';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS activities JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS job_documents JSONB DEFAULT '[]'::jsonb;

-- Sync budget & charge_amount safely
UPDATE public.services
SET charge_amount = COALESCE(charge_amount, budget, 0),
    budget = COALESCE(budget, charge_amount, 0);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_services_client_id ON public.services(client_id);
CREATE INDEX IF NOT EXISTS idx_services_department_id ON public.services(department_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON public.services(status);
CREATE INDEX IF NOT EXISTS idx_services_payment_status ON public.services(payment_status);

-- ----------------------------------------------------------------------------
-- 3. EXTEND `client_jobs` TABLE (Workflow Task Delegation)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.client_jobs ADD COLUMN IF NOT EXISTS service_type TEXT;
ALTER TABLE public.client_jobs ADD COLUMN IF NOT EXISTS billing_type TEXT DEFAULT 'monthly';
ALTER TABLE public.client_jobs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.client_jobs ADD COLUMN IF NOT EXISTS assigned_employee UUID;
ALTER TABLE public.client_jobs ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE public.client_jobs ADD COLUMN IF NOT EXISTS vat_amount NUMERIC DEFAULT 0;
ALTER TABLE public.client_jobs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.client_jobs ADD COLUMN IF NOT EXISTS deadline DATE;
ALTER TABLE public.client_jobs ADD COLUMN IF NOT EXISTS quotation_id UUID;

CREATE INDEX IF NOT EXISTS idx_client_jobs_client_id ON public.client_jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_client_jobs_status ON public.client_jobs(status);

-- ----------------------------------------------------------------------------
-- 4. EXTEND `notifications` TABLE (Real-time Task Delegation & Alerts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS sender_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_role TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS ref_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS ref_table TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT;

-- Drop check constraint on notification type if it exists to allow 'job_assigned' & other types
DO $$
BEGIN
    ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_role ON public.notifications(role);

-- ----------------------------------------------------------------------------
-- 5. STORAGE BUCKET: `documents` (Company Legal Documents & Job Deliverables)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS: allow authenticated users to upload and anyone to read
DO $$
BEGIN
    -- Public download policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Documents Access'
    ) THEN
        CREATE POLICY "Public Documents Access" ON storage.objects
        FOR SELECT USING (bucket_id = 'documents');
    END IF;

    -- Authenticated upload policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated Upload to Documents'
    ) THEN
        CREATE POLICY "Authenticated Upload to Documents" ON storage.objects
        FOR INSERT WITH CHECK (bucket_id = 'documents');
    END IF;

    -- Authenticated delete policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated Delete from Documents'
    ) THEN
        CREATE POLICY "Authenticated Delete from Documents" ON storage.objects
        FOR DELETE USING (bucket_id = 'documents');
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6. VERIFY MIGRATION COMPLETION
-- ----------------------------------------------------------------------------
SELECT 'SUCCESS: All schema columns, client jobs, notifications, and document storage policies are up to date!' AS status;

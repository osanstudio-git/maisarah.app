-- ============================================================================
-- Architecture Migration: Client (Company) vs. Separate Jobs (Tasks)
-- Supports:
-- 1. Real Company details + Representative details + Industry + Common documents
-- 2. Separate Job charges (no hardcoded/fixed fees)
-- 3. Custom services & sub-activities (milestones)
-- 4. Job duration (1-Time, Quarterly with Q1-Q4 status, Annual/1-Year, Monthly)
-- 5. Per-job Invoice status & Payment status & Documents
-- ============================================================================

-- 1. Extend `clients` table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS representative_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS representative_phone TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS representative_email TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS industry TEXT DEFAULT 'General Trading';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS common_documents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tax_number TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS vat_number TEXT;

-- 2. Extend `services` (Jobs / Tasks) table
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS charge_amount NUMERIC DEFAULT 0;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS duration_type TEXT DEFAULT 'one_time';
-- duration_type can be: 'one_time', 'quarterly', 'annual', 'monthly'

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS quarterly_status JSONB DEFAULT '{"q1":"pending","q2":"pending","q3":"pending","q4":"pending"}'::jsonb;
-- stores progress per quarter: e.g. {"q1": "completed", "q2": "ongoing", "q3": "pending", "q4": "pending"}

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS invoice_status TEXT DEFAULT 'unbilled';
-- invoice_status: 'unbilled', 'invoiced', 'paid'

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS invoice_number TEXT;

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
-- payment_status: 'unpaid', 'partially_paid', 'paid'

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS activities JSONB DEFAULT '[]'::jsonb;
-- activities: array of subtasks [{ "id": "act-1", "title": "Collect Bank Statements", "completed": false }]

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS job_documents JSONB DEFAULT '[]'::jsonb;
-- job_documents: array of files [{ "id": "doc-1", "name": "Tax Return Q1.pdf", "url": "...", "uploaded_at": "..." }]

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS budget NUMERIC DEFAULT 0;

-- 3. Ensure charge_amount and budget are initialized
UPDATE public.services
SET charge_amount = COALESCE(charge_amount, budget, 0),
    budget = COALESCE(budget, charge_amount, 0);

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_services_client_id ON public.services(client_id);
CREATE INDEX IF NOT EXISTS idx_services_department_id ON public.services(department_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON public.services(status);
CREATE INDEX IF NOT EXISTS idx_services_payment_status ON public.services(payment_status);
CREATE INDEX IF NOT EXISTS idx_clients_cr_number ON public.clients(cr_number);

-- ==============================================================================
-- Sales CRM Enhancements: Columns & Indexing
-- ==============================================================================

ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS probability NUMERIC DEFAULT 10;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS services JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS owner TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS b2b_partner TEXT DEFAULT 'None, direct client';
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS expected_close DATE;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS next_followup DATE;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'not_started';
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS expected_completion DATE;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS payment_due_date DATE;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS payments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS total_paid NUMERIC DEFAULT 0;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS pending_payment NUMERIC DEFAULT 0;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS recurring_jobs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS activity_log JSONB DEFAULT '[]'::jsonb;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_leads_status_prob ON public.crm_leads(status, probability);
CREATE INDEX IF NOT EXISTS idx_crm_leads_owner ON public.crm_leads(owner);
CREATE INDEX IF NOT EXISTS idx_crm_leads_next_followup ON public.crm_leads(next_followup);
CREATE INDEX IF NOT EXISTS idx_crm_leads_delivery_status ON public.crm_leads(delivery_status);

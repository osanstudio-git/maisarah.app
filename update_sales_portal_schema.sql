-- ============================================================================
-- MAISARAH OS — SALES PORTAL PRODUCTION SCHEMA & RLS UPDATE (STEP 1)
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Extend `clients` so Sales Direct Registration & Lead Conversion never fail
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cr_number TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS activity TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS monthly_billing NUMERIC DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS assigned_employee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS compliance_status TEXT DEFAULT 'compliant';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS portal_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Extend `profiles` for per-rep configurable Monthly Target & Commission Rate
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sales_target_omr NUMERIC DEFAULT 3000;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 8;

-- 3. Align `crm_leads.status` check constraint with unified Sales + CRM pipeline stages
ALTER TABLE public.crm_leads DROP CONSTRAINT IF EXISTS crm_leads_status_check;
ALTER TABLE public.crm_leads ADD CONSTRAINT crm_leads_status_check
CHECK (status IN (
    'new',
    'contacted',
    'consultation',
    'proposal_sent',
    'quoted',
    'negotiation',
    'accepted',
    'won',
    'rejected',
    'lost'
));

-- 4. Create `sales_visits` table (replaces browser-only localStorage visits)
CREATE TABLE IF NOT EXISTS public.sales_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rep_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    rep_name TEXT,
    lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    location TEXT,
    purpose TEXT DEFAULT 'New Service Pitch',
    outcome TEXT DEFAULT 'Interested - Requesting Quotation',
    follow_up_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_visits_rep_id ON public.sales_visits(rep_id);
CREATE INDEX IF NOT EXISTS idx_sales_visits_lead_id ON public.sales_visits(lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_visits_created_at ON public.sales_visits(created_at DESC);

-- 5. RLS Policies — Include `'sales'` across Sales, CRM & Client Onboarding tables
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can manage CRM leads" ON public.crm_leads;
CREATE POLICY "Staff can manage CRM leads"
ON public.crm_leads FOR ALL
TO authenticated
USING (
    public.has_any_role(ARRAY['sales', 'b2b_coordinator', 'crm', 'manager', 'department_head', 'employee', 'accountant'])
)
WITH CHECK (
    public.has_any_role(ARRAY['sales', 'b2b_coordinator', 'crm', 'manager', 'department_head', 'employee', 'accountant'])
);

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can manage quotations" ON public.quotations;
CREATE POLICY "Staff can manage quotations"
ON public.quotations FOR ALL
TO authenticated
USING (
    public.has_any_role(ARRAY['sales', 'b2b_coordinator', 'crm', 'manager', 'department_head', 'employee', 'accountant'])
)
WITH CHECK (
    public.has_any_role(ARRAY['sales', 'b2b_coordinator', 'crm', 'manager', 'department_head', 'employee', 'accountant'])
);

ALTER TABLE public.sales_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can manage sales visits" ON public.sales_visits;
CREATE POLICY "Staff can manage sales visits"
ON public.sales_visits FOR ALL
TO authenticated
USING (
    public.has_any_role(ARRAY['sales', 'b2b_coordinator', 'crm', 'manager', 'department_head', 'employee'])
)
WITH CHECK (
    public.has_any_role(ARRAY['sales', 'b2b_coordinator', 'crm', 'manager', 'department_head', 'employee'])
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can manage clients" ON public.clients;
CREATE POLICY "Staff can manage clients"
ON public.clients FOR ALL
TO authenticated
USING (
    public.has_any_role(ARRAY['sales', 'b2b_coordinator', 'crm', 'manager', 'department_head', 'employee', 'accountant'])
    OR id = auth.uid()
    OR portal_user_id = auth.uid()
)
WITH CHECK (
    public.has_any_role(ARRAY['sales', 'b2b_coordinator', 'crm', 'manager', 'department_head', 'employee', 'accountant'])
);

ALTER TABLE public.client_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can manage client_jobs" ON public.client_jobs;
CREATE POLICY "Staff can manage client_jobs"
ON public.client_jobs FOR ALL
TO authenticated
USING (
    public.has_any_role(ARRAY['sales', 'b2b_coordinator', 'crm', 'manager', 'department_head', 'employee', 'accountant'])
)
WITH CHECK (
    public.has_any_role(ARRAY['sales', 'b2b_coordinator', 'crm', 'manager', 'department_head', 'employee', 'accountant'])
);

-- Allow sales to also create onboarding jobs in `services`
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can view services" ON public.services;
CREATE POLICY "Staff can view services"
ON public.services FOR SELECT
TO authenticated
USING (
    public.has_any_role(ARRAY['sales', 'employee', 'department_head', 'accountant', 'manager', 'crm', 'hr'])
    OR client_id = auth.uid()
);

DROP POLICY IF EXISTS "Staff can insert services" ON public.services;
CREATE POLICY "Staff can insert services"
ON public.services FOR INSERT
TO authenticated
WITH CHECK (
    public.has_any_role(ARRAY['sales', 'employee', 'department_head', 'accountant', 'manager', 'crm'])
);

-- 6. Enable Realtime on `sales_visits`
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_visits;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

-- 7. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'SUCCESS: Sales Portal schema, sales_visits table, and RLS policies updated!' AS status;

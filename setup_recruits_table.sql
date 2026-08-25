-- ============================================================
-- MAISARAH OS — HR RECRUITMENT DATABASE MIGRATION SCRIPT
-- ============================================================
-- Run this script in the Supabase SQL Editor.
-- This sets up the public.hr_recruits table and policies.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hr_recruits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL,          -- e.g. 'Senior Auditor', 'Tax Consultant'
    dept TEXT NOT NULL,          -- e.g. 'Audit', 'Tax & VAT'
    stage TEXT NOT NULL CHECK (stage IN ('cv_received', 'shortlisted', 'interview_scheduled', 'interview_done', 'offered')),
    score INTEGER DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
    onboarding_tasks JSONB DEFAULT '{"contract_signed": false, "bank_details_submitted": false, "documents_uploaded": false, "it_assets_ready": false}',
    resume_name TEXT,
    resume_url TEXT,
    employment_type TEXT DEFAULT 'Experienced',
    placement_status TEXT DEFAULT 'pending_placement' CHECK (placement_status IN ('pending_placement', 'placed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Triggers for Auto-Updating updated_at Columns
-- ------------------------------------------------------------

DROP TRIGGER IF EXISTS set_updated_at_hr_recruits ON public.hr_recruits;
CREATE TRIGGER set_updated_at_hr_recruits
BEFORE UPDATE ON public.hr_recruits
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------
-- Row Level Security (RLS) Enablement
-- ------------------------------------------------------------

ALTER TABLE public.hr_recruits ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- Security Policies
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Allow recruitment access for authorized staff" ON public.hr_recruits;
CREATE POLICY "Allow recruitment access for authorized staff" 
ON public.hr_recruits FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('hr', 'manager', 'department_head')
    )
);

DROP POLICY IF EXISTS "Allow recruitment edits for HR and managers" ON public.hr_recruits;
CREATE POLICY "Allow recruitment edits for HR and managers" 
ON public.hr_recruits FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('hr', 'manager')
    )
);

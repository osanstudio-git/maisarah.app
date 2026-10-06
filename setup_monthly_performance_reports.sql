-- =========================================================================
-- MAISARAH OS — MONTHLY PERFORMANCE REPORTS TABLE SETUP
-- =========================================================================

-- 1. Create monthly_performance_reports Table
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

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.monthly_performance_reports ENABLE ROW LEVEL SECURITY;

-- Drop previous policies if they exist to avoid duplicate conflicts
DROP POLICY IF EXISTS "Allow authenticated read on monthly reports" ON public.monthly_performance_reports;
DROP POLICY IF EXISTS "Allow managers and admins to manage monthly reports" ON public.monthly_performance_reports;
DROP POLICY IF EXISTS "Allow authenticated all on monthly reports" ON public.monthly_performance_reports;

-- 3. RLS Policies: Authenticated users can read reports
CREATE POLICY "Allow authenticated read on monthly reports"
ON public.monthly_performance_reports
FOR SELECT
TO authenticated
USING (true);

-- 4. RLS Policies: Authenticated staff (cast to text to avoid enum mismatch) can manage reports
CREATE POLICY "Allow authenticated staff to manage monthly reports"
ON public.monthly_performance_reports
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role::text IN ('manager', 'ceo', 'director', 'managing_director', 'hod', 'hr', 'employee')
            OR profiles.role::text ILIKE '%manager%'
            OR profiles.role::text ILIKE '%admin%'
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (
            profiles.role::text IN ('manager', 'ceo', 'director', 'managing_director', 'hod', 'hr', 'employee')
            OR profiles.role::text ILIKE '%manager%'
            OR profiles.role::text ILIKE '%admin%'
        )
    )
);

-- 5. Realtime Sync (safely add table to publication)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'monthly_performance_reports'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_performance_reports;
    END IF;
END $$;

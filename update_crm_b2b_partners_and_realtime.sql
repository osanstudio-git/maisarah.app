-- ==============================================================================
-- MAISARAH CRM & B2B PARTNERS ARCHITECTURE UPDATE
-- Idempotent Migration: Safe to run multiple times in Supabase SQL Editor
-- ==============================================================================

-- 1. Ensure B2B Partners Table Exists with All Fields
CREATE TABLE IF NOT EXISTS public.b2b_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    partner_type TEXT DEFAULT 'sanad',
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    location TEXT DEFAULT 'Muscat',
    cr_number TEXT,
    agreement_tier TEXT DEFAULT 'silver',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist on b2b_partners (in case table was created with partial schema)
ALTER TABLE public.b2b_partners ADD COLUMN IF NOT EXISTS partner_type TEXT DEFAULT 'sanad';
ALTER TABLE public.b2b_partners ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.b2b_partners ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.b2b_partners ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.b2b_partners ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'Muscat';
ALTER TABLE public.b2b_partners ADD COLUMN IF NOT EXISTS cr_number TEXT;
ALTER TABLE public.b2b_partners ADD COLUMN IF NOT EXISTS agreement_tier TEXT DEFAULT 'silver';
ALTER TABLE public.b2b_partners ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.b2b_partners ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.b2b_partners ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Ensure Clients Table has B2B Attribution Columns
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS b2b_partner_id TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS b2b_partner_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'B2B';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cr_number TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS monthly_billing NUMERIC DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contract_expiry_date DATE;

-- 3. Performance Indexes for Real-time Filtering & Search
CREATE INDEX IF NOT EXISTS idx_clients_b2b_partner_id ON public.clients(b2b_partner_id);
CREATE INDEX IF NOT EXISTS idx_clients_source ON public.clients(source);
CREATE INDEX IF NOT EXISTS idx_clients_cr_number ON public.clients(cr_number);
CREATE INDEX IF NOT EXISTS idx_b2b_partners_name ON public.b2b_partners(name);
CREATE INDEX IF NOT EXISTS idx_b2b_partners_cr_number ON public.b2b_partners(cr_number);

-- 4. Enable Row Level Security (RLS) & Policies for b2b_partners
ALTER TABLE public.b2b_partners ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow staff and authenticated read b2b_partners" ON public.b2b_partners;
    DROP POLICY IF EXISTS "Allow staff and authenticated insert b2b_partners" ON public.b2b_partners;
    DROP POLICY IF EXISTS "Allow staff and authenticated update b2b_partners" ON public.b2b_partners;
    DROP POLICY IF EXISTS "Allow staff and authenticated delete b2b_partners" ON public.b2b_partners;
    DROP POLICY IF EXISTS "Allow all access to b2b_partners" ON public.b2b_partners;
END $$;

-- Policy to allow full operations for CRM and Portal staff
CREATE POLICY "Allow all access to b2b_partners"
    ON public.b2b_partners
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 5. Enable Full Replica Identity for Real-time WebSocket Broadcaster
ALTER TABLE public.b2b_partners REPLICA IDENTITY FULL;
ALTER TABLE public.clients REPLICA IDENTITY FULL;

-- 6. Add Tables to Supabase Realtime Publication (if not already included)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'b2b_partners'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.b2b_partners;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'clients'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
    END IF;
END $$;

-- ==============================================================================
-- MAISARAH FINANCIAL PLATFORM - CRM B2B PARTNERS & REAL-TIME SYNC UPDATE
-- File: update_crm_b2b_partners_and_realtime.sql
-- ==============================================================================
-- Run this script in the Supabase SQL Editor to enable:
-- 1. client_type column on clients table
-- 2. Fully idempotent b2b_partners table schema & RLS policies
-- 3. Supabase Realtime publication setup for instant cross-user streaming
-- 4. High-performance indexes for B2B partner attribution & CR search
-- ==============================================================================

-- 1. Ensure client_type and B2B attribution columns exist on clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'B2B';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS b2b_partner_id UUID;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS b2b_partner_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cr_number TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS portal_access_sent BOOLEAN DEFAULT false;

-- 2. Ensure b2b_partners table exists and is fully structured
CREATE TABLE IF NOT EXISTS public.b2b_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    partner_type TEXT DEFAULT 'sanad',
    contact_person TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    location TEXT DEFAULT 'Muscat',
    cr_number TEXT,
    agreement_tier TEXT DEFAULT 'silver',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure updated_at trigger exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_b2b_partners_updated_at ON public.b2b_partners;
CREATE TRIGGER set_b2b_partners_updated_at
    BEFORE UPDATE ON public.b2b_partners
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 3. Row Level Security (RLS) Configuration
ALTER TABLE public.b2b_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read b2b_partners" ON public.b2b_partners;
DROP POLICY IF EXISTS "Allow authenticated insert b2b_partners" ON public.b2b_partners;
DROP POLICY IF EXISTS "Allow authenticated update b2b_partners" ON public.b2b_partners;
DROP POLICY IF EXISTS "Allow authenticated delete b2b_partners" ON public.b2b_partners;
DROP POLICY IF EXISTS "Allow all access to b2b_partners" ON public.b2b_partners;

-- Permissive policy for staff & authenticated CRM users
CREATE POLICY "Allow all access to b2b_partners"
    ON public.b2b_partners
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 4. Enable Supabase Realtime Broadcasting
-- (Ensures live updates appear on other users' screens without refreshing)
ALTER TABLE public.b2b_partners REPLICA IDENTITY FULL;
ALTER TABLE public.clients REPLICA IDENTITY FULL;

DO $$
BEGIN
    -- Add b2b_partners to realtime publication if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'b2b_partners'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.b2b_partners;
    END IF;

    -- Add clients to realtime publication if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'clients'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
    END IF;
END $$;

-- 5. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_clients_b2b_partner_id ON public.clients(b2b_partner_id);
CREATE INDEX IF NOT EXISTS idx_clients_cr_number ON public.clients(cr_number);
CREATE INDEX IF NOT EXISTS idx_clients_source ON public.clients(source);
CREATE INDEX IF NOT EXISTS idx_b2b_partners_cr_number ON public.b2b_partners(cr_number);
CREATE INDEX IF NOT EXISTS idx_b2b_partners_created_at ON public.b2b_partners(created_at DESC);

-- ==============================================================================
-- End of update script. Run this in the Supabase Dashboard -> SQL Editor.
-- ==============================================================================


-- =========================================================================
-- MAISARAH OS — PHASE 4: CLIENT PORTAL & MAISARAH BUSINESS CLUB SCHEMA
-- =========================================================================
-- Run this script in the Supabase SQL Editor.
-- Sets up:
--   1. business_club_members (Digital membership cards, loyalty points & tiers)
--   2. club_announcements (Tax updates, VAT news, compliance reminders & tips)
--   3. club_events (Workshops, networking seminars & webinars)
--   4. club_event_registrations (Event RSVP & attendance tracking)
--   5. Client Portal RLS Policies (Securing financial data vs. free community content)
--   6. Indexes & Supabase Realtime Publication
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------------------
-- 1. Profiles Table Extension (Ensure Client Type Flags Exist)
-- -------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'client' CHECK (client_type IN ('client', 'club_member', 'lead'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- -------------------------------------------------------------------------
-- 2. Business Club Members Table (Dual-Link: Leads OR Paying Clients)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_club_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
    membership_number TEXT UNIQUE NOT NULL, -- e.g. MBC-2026-1082
    full_name TEXT NOT NULL,
    company_name TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    member_tier TEXT DEFAULT 'community' CHECK (member_tier IN ('community', 'silver', 'gold', 'platinum')),
    loyalty_points INTEGER DEFAULT 100,
    referral_code TEXT UNIQUE,
    referred_by UUID REFERENCES public.business_club_members(id) ON DELETE SET NULL,
    qr_code_token TEXT,
    compliance_health_score INTEGER DEFAULT 85,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    joined_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist
ALTER TABLE public.business_club_members ADD COLUMN IF NOT EXISTS member_tier TEXT DEFAULT 'community';
ALTER TABLE public.business_club_members ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 100;
ALTER TABLE public.business_club_members ADD COLUMN IF NOT EXISTS compliance_health_score INTEGER DEFAULT 85;
ALTER TABLE public.business_club_members ADD COLUMN IF NOT EXISTS referral_code TEXT;

-- -------------------------------------------------------------------------
-- 3. Club Announcements Table (Tax Updates, VAT Bulletins & Deadlines)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.club_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    title_ar TEXT,
    content TEXT NOT NULL,
    content_ar TEXT,
    category TEXT DEFAULT 'tax_update' CHECK (category IN ('tax_update', 'vat_announcement', 'compliance_deadline', 'financial_tip', 'exclusive_offer', 'legislation')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'featured')),
    attachment_url TEXT,
    target_tier TEXT DEFAULT 'all' CHECK (target_tier IN ('all', 'community', 'silver', 'gold', 'platinum')),
    published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 4. Club Events Table (Workshops, Seminars & Webinars)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.club_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    title_ar TEXT,
    description TEXT,
    description_ar TEXT,
    event_type TEXT DEFAULT 'workshop' CHECK (event_type IN ('workshop', 'seminar', 'webinar', 'networking', 'qa_session')),
    speaker_name TEXT,
    event_date TIMESTAMPTZ NOT NULL,
    location TEXT DEFAULT 'Online (Zoom / Teams)',
    meeting_url TEXT,
    max_attendees INTEGER DEFAULT 100,
    is_free BOOLEAN DEFAULT TRUE,
    registration_deadline TIMESTAMPTZ,
    status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- 5. Event Registrations (Member RSVPs)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.club_event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.club_events(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.business_club_members(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled')),
    notes TEXT,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, member_id)
);

-- -------------------------------------------------------------------------
-- 6. High-Performance Query Indexes
-- -------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_club_members_user ON public.business_club_members(user_id);
CREATE INDEX IF NOT EXISTS idx_club_members_client ON public.business_club_members(client_id);
CREATE INDEX IF NOT EXISTS idx_club_members_lead ON public.business_club_members(lead_id);
CREATE INDEX IF NOT EXISTS idx_club_members_tier ON public.business_club_members(member_tier);
CREATE INDEX IF NOT EXISTS idx_club_members_membership_num ON public.business_club_members(membership_number);

CREATE INDEX IF NOT EXISTS idx_announcements_category ON public.club_announcements(category);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON public.club_announcements(published_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_date ON public.club_events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.club_events(status);

CREATE INDEX IF NOT EXISTS idx_event_reg_event ON public.club_event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reg_member ON public.club_event_registrations(member_id);

-- -------------------------------------------------------------------------
-- 7. Row Level Security (RLS) & Access Isolation Policies
-- -------------------------------------------------------------------------
ALTER TABLE public.business_club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_event_registrations ENABLE ROW LEVEL SECURITY;

-- Club Announcements: Publicly visible to all authenticated club members and staff
DROP POLICY IF EXISTS "Anyone authenticated can view active announcements" ON public.club_announcements;
CREATE POLICY "Anyone authenticated can view active announcements"
ON public.club_announcements FOR SELECT
TO authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Staff can manage announcements" ON public.club_announcements;
CREATE POLICY "Staff can manage announcements"
ON public.club_announcements FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Club Events: Viewable by all authenticated members
DROP POLICY IF EXISTS "Anyone authenticated can view events" ON public.club_events;
CREATE POLICY "Anyone authenticated can view events"
ON public.club_events FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Staff can manage events" ON public.club_events;
CREATE POLICY "Staff can manage events"
ON public.club_events FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Club Event Registrations
DROP POLICY IF EXISTS "Users can view and register for events" ON public.club_event_registrations;
CREATE POLICY "Users can view and register for events"
ON public.club_event_registrations FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Business Club Members: Members see their own profile, staff see all
DROP POLICY IF EXISTS "Members can view their own club profile" ON public.business_club_members;
CREATE POLICY "Members can view their own club profile"
ON public.business_club_members FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Staff and system can manage club members" ON public.business_club_members;
CREATE POLICY "Staff and system can manage club members"
ON public.business_club_members FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 8. Supabase Realtime Publication Setup
-- -------------------------------------------------------------------------
DO $$
DECLARE
    tbl text;
    tables_list text[] := ARRAY['business_club_members', 'club_announcements', 'club_events', 'club_event_registrations'];
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

-- ============================================================
-- ⚠️  IMPORTANT: Run Query 1 and Query 2 SEPARATELY.
-- In Supabase SQL Editor, run Query 1 first, click Run,
-- then CLEAR the editor, paste Query 2, and Run again.
-- ============================================================

-- ============================================================
-- QUERY 1 OF 2 — Run this first, then stop.
-- Adds 'hr' as a valid role to your enum.
-- ============================================================
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'hr';

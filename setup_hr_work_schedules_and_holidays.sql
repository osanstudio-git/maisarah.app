-- ============================================================================
-- Maisarah HR: Work Schedules (Omani vs Expat) & Holidays Database Tables
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/dkdomilstnzlysmsgcku/sql
-- ============================================================================

-- 1. Table: hr_work_schedules
-- Stores day-by-day shift start/end times and Day Off (L) flags for Omani vs Expat staff
CREATE TABLE IF NOT EXISTS public.hr_work_schedules (
  id text PRIMARY KEY,                   -- 'Omani' or 'Expat'
  category text NOT NULL,                -- 'Omani' or 'Expat'
  schedule_json jsonb NOT NULL,          -- Array of day objects (dayOfWeek, isOffDay, startTime, endTime)
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Seed initial official schedules if not already present
INSERT INTO public.hr_work_schedules (id, category, schedule_json)
VALUES 
  (
    'Omani',
    'Omani',
    '[
      {"dayOfWeek": 0, "dayNameEn": "Sunday",    "dayNameAr": "الأحد",     "isOffDay": false, "startTime": "08:30", "endTime": "17:00"},
      {"dayOfWeek": 1, "dayNameEn": "Monday",    "dayNameAr": "الاثنين",   "isOffDay": false, "startTime": "08:30", "endTime": "17:00"},
      {"dayOfWeek": 2, "dayNameEn": "Tuesday",   "dayNameAr": "الثلاثاء",  "isOffDay": false, "startTime": "08:30", "endTime": "17:00"},
      {"dayOfWeek": 3, "dayNameEn": "Wednesday", "dayNameAr": "الأربعاء",  "isOffDay": false, "startTime": "08:30", "endTime": "17:00"},
      {"dayOfWeek": 4, "dayNameEn": "Thursday",  "dayNameAr": "الخميس",    "isOffDay": false, "startTime": "08:30", "endTime": "16:00"},
      {"dayOfWeek": 5, "dayNameEn": "Friday",    "dayNameAr": "الجمعة",    "isOffDay": true,  "startTime": "08:30", "endTime": "17:00"},
      {"dayOfWeek": 6, "dayNameEn": "Saturday",  "dayNameAr": "السبت",     "isOffDay": true,  "startTime": "08:30", "endTime": "17:00"}
    ]'::jsonb
  ),
  (
    'Expat',
    'Expat',
    '[
      {"dayOfWeek": 0, "dayNameEn": "Sunday",    "dayNameAr": "الأحد",     "isOffDay": false, "startTime": "08:30", "endTime": "17:00"},
      {"dayOfWeek": 1, "dayNameEn": "Monday",    "dayNameAr": "الاثنين",   "isOffDay": false, "startTime": "08:30", "endTime": "17:00"},
      {"dayOfWeek": 2, "dayNameEn": "Tuesday",   "dayNameAr": "الثلاثاء",  "isOffDay": false, "startTime": "08:30", "endTime": "17:00"},
      {"dayOfWeek": 3, "dayNameEn": "Wednesday", "dayNameAr": "الأربعاء",  "isOffDay": false, "startTime": "08:30", "endTime": "17:00"},
      {"dayOfWeek": 4, "dayNameEn": "Thursday",  "dayNameAr": "الخميس",    "isOffDay": false, "startTime": "08:30", "endTime": "16:00"},
      {"dayOfWeek": 5, "dayNameEn": "Friday",    "dayNameAr": "الجمعة",    "isOffDay": true,  "startTime": "08:30", "endTime": "17:00"},
      {"dayOfWeek": 6, "dayNameEn": "Saturday",  "dayNameAr": "السبت",     "isOffDay": false, "startTime": "10:00", "endTime": "16:00"}
    ]'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- 2. Table: hr_holidays
-- Stores public and company holidays that reflect on timesheet heatmaps
CREATE TABLE IF NOT EXISTS public.hr_holidays (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name_en text NOT NULL,
  name_ar text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  target_category text DEFAULT 'All',    -- 'All', 'Omani', or 'Expat'
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Seed Oman official holidays
INSERT INTO public.hr_holidays (id, name_en, name_ar, start_date, end_date, target_category, notes)
VALUES
  ('hol-national-day', 'Oman National Day', 'العيد الوطني العماني المجيد', '2026-11-18', '2026-11-19', 'All', 'Official National Holiday in Sultanate of Oman'),
  ('hol-new-year', 'New Year''s Day', 'رأس السنة الميلادية', '2027-01-01', '2027-01-01', 'All', 'Public holiday'),
  ('hol-isra-miraj', 'Al Isra wal Miraj', 'ذكرى الإسراء والمعراج', '2027-01-26', '2027-01-26', 'All', 'Official public holiday')
ON CONFLICT (id) DO NOTHING;

-- 3. Enable Realtime Broadcasting (Safe from duplicate_object error 42710)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_work_schedules;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_holidays;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN NULL;
  END;
END $$;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.hr_work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_holidays ENABLE ROW LEVEL SECURITY;

-- Read policies: Any authenticated staff member can view policies & holidays
DROP POLICY IF EXISTS "Allow authenticated read schedules" ON public.hr_work_schedules;
CREATE POLICY "Allow authenticated read schedules" ON public.hr_work_schedules
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow anon read schedules" ON public.hr_work_schedules;
CREATE POLICY "Allow anon read schedules" ON public.hr_work_schedules
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow authenticated read holidays" ON public.hr_holidays;
CREATE POLICY "Allow authenticated read holidays" ON public.hr_holidays
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow anon read holidays" ON public.hr_holidays;
CREATE POLICY "Allow anon read holidays" ON public.hr_holidays
  FOR SELECT TO anon USING (true);

-- Manage policies: HR & Admin can insert/update/delete schedules and holidays
DROP POLICY IF EXISTS "Allow staff manage schedules" ON public.hr_work_schedules;
CREATE POLICY "Allow staff manage schedules" ON public.hr_work_schedules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon manage schedules" ON public.hr_work_schedules;
CREATE POLICY "Allow anon manage schedules" ON public.hr_work_schedules
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow staff manage holidays" ON public.hr_holidays;
CREATE POLICY "Allow staff manage holidays" ON public.hr_holidays
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon manage holidays" ON public.hr_holidays;
CREATE POLICY "Allow anon manage holidays" ON public.hr_holidays
  FOR ALL TO anon USING (true) WITH CHECK (true);

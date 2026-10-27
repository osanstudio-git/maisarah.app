-- ==============================================================================
-- DYNAMIC DEPARTMENTS, STAGES, ROLES & SERVICES SYSTEM (MAISARAH APP)
-- ==============================================================================

-- 1. Create the 'departments' table
CREATE TABLE IF NOT EXISTS public.departments (
  id TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  head_title_en TEXT,
  head_title_ar TEXT,
  duty_en TEXT,
  duty_ar TEXT,
  cycle_type TEXT NOT NULL DEFAULT 'custom', -- 'quarterly', 'monthly', 'engagement', 'yearly', 'project', 'case_govt', 'custom'
  color TEXT DEFAULT '#A11212',
  icon TEXT DEFAULT 'Briefcase',
  enable_cross_handoff BOOLEAN DEFAULT true,
  allowed_handoff_dept_ids JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create the 'department_stages' table (stores milestones & steps per department)
CREATE TABLE IF NOT EXISTS public.department_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id TEXT NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  deadline_rule TEXT, -- e.g. 'By 5th', '30 Apr', '120 days post FY', 'Week 1', 'Day 1'
  requires_approval BOOLEAN DEFAULT false,
  description_en TEXT,
  description_ar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create the 'department_roles' table (job positions per department)
CREATE TABLE IF NOT EXISTS public.department_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id TEXT NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  access_role TEXT DEFAULT 'employee', -- 'employee', 'department_head', 'accountant', etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Extend the 'service_catalog' table
ALTER TABLE public.service_catalog 
  ADD COLUMN IF NOT EXISTS department_id TEXT,
  ADD COLUMN IF NOT EXISTS cycle_type TEXT,
  ADD COLUMN IF NOT EXISTS target_handoff_dept_id TEXT,
  ADD COLUMN IF NOT EXISTS requires_prerequisite BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS prerequisite_dept_id TEXT,
  ADD COLUMN IF NOT EXISTS default_turnaround_days INT DEFAULT 7;

-- 5. Create the 'department_handoffs' table (for optional cross-department handoffs)
CREATE TABLE IF NOT EXISTS public.department_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_department_id TEXT NOT NULL,
  target_department_id TEXT NOT NULL,
  client_id UUID,
  service_id UUID,
  service_name TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'in_progress', 'completed', 'declined'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'urgent'
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- ------------------------------------------------------------------------------
-- RLS Policies & Grants
-- ------------------------------------------------------------------------------
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_handoffs ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users and anon
CREATE POLICY "Public and users can view departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Public and users can view department stages" ON public.department_stages FOR SELECT USING (true);
CREATE POLICY "Public and users can view department roles" ON public.department_roles FOR SELECT USING (true);
CREATE POLICY "Public and users can view department handoffs" ON public.department_handoffs FOR SELECT USING (true);

-- Allow authenticated users to insert/update (or admin role)
CREATE POLICY "Auth users can insert/update departments" ON public.departments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can insert/update department stages" ON public.department_stages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can insert/update department roles" ON public.department_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can insert/update department handoffs" ON public.department_handoffs FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON public.departments TO anon, authenticated, service_role;
GRANT ALL ON public.department_stages TO anon, authenticated, service_role;
GRANT ALL ON public.department_roles TO anon, authenticated, service_role;
GRANT ALL ON public.department_handoffs TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- SEED DATA: THE 6 CORE OPERATIONAL DEPARTMENTS + SUPPORT DEPARTMENTS
-- ------------------------------------------------------------------------------

-- Insert Departments
INSERT INTO public.departments (id, name_en, name_ar, head_title_en, head_title_ar, duty_en, duty_ar, cycle_type, color, icon, enable_cross_handoff, allowed_handoff_dept_ids)
VALUES
  (
    'tax_vat',
    'Tax & VAT',
    'الضرائب والقيمة المضافة',
    'VAT & Tax Head',
    'رئيس قسم الضرائب والقيمة المضافة',
    'Manage quarterly VAT returns, tax certificates, exemptions, and compliance filings.',
    'إدارة إقرارات ضريبة القيمة المضافة الربع سنوية، والشهادات الضريبية والإعفاءات والامتثال الضريبي.',
    'quarterly',
    '#6366F1',
    'Receipt',
    true,
    '["bookkeeping", "liquidation", "management"]'::jsonb
  ),
  (
    'income_tax',
    'Income Tax',
    'ضريبة الدخل',
    'Tax Head',
    'رئيس قسم ضريبة الدخل',
    'Oversee annual corporate income tax returns, tax cards, P&L preparations, and tax objections.',
    'الإشراف على إقرارات ضريبة الدخل السنوية للشركات، والبطاقات الضريبية وتجهيز الأرباح والخسائر والاعتراضات.',
    'yearly',
    '#0284C7',
    'Calculator',
    true,
    '["bookkeeping", "audit", "liquidation"]'::jsonb
  ),
  (
    'bookkeeping',
    'Bookkeeping',
    'مسك الدفاتر والمحاسبة',
    'Bookkeeping Head',
    'رئيس قسم مسك الدفاتر',
    'Execute recurring monthly financial closures, ledger reconciliations, and financial reporting.',
    'تنفيذ الإغلاقات المالية الشهرية الدورية، والتسويات البنكية وإعداد التقارير والقوائم المالية.',
    'monthly',
    '#10B981',
    'BookOpen',
    true,
    '["tax_vat", "audit", "income_tax"]'::jsonb
  ),
  (
    'audit',
    'Audit',
    'التدقيق والمراجعة',
    'Audit Head',
    'رئيس قسم التدقيق',
    'Deliver rigorous statutory, internal, fraud, and financial report audits following engagement stages.',
    'تقديم خدمات التدقيق القانوني والداخلي وفحص الاحتيال ومراجعة القوائم المالية وفق مراحل التعاقد.',
    'engagement',
    '#F97316',
    'FileCheck',
    true,
    '["bookkeeping", "income_tax", "management"]'::jsonb
  ),
  (
    'consultancy',
    'Business Advisory & Consultancy',
    'الاستشارات وتطوير الأعمال',
    'Advisory Head',
    'رئيس قسم الاستشارات وتطوير الأعمال',
    'Deliver bespoke feasibility studies, business plans, financial models, and strategic market surveys.',
    'تقديم دراسات الجدوى المتخصصة وخطط العمل والنماذج المالية واستطلاعات وبحوث السوق الاستراتيجية.',
    'project',
    '#F59E0B',
    'Lightbulb',
    true,
    '["income_tax", "bookkeeping", "management"]'::jsonb
  ),
  (
    'liquidation',
    'Liquidation & Corporate Services',
    'التصفية وخدمات الشركات',
    'Corporate Services Head',
    'رئيس قسم التصفية وخدمات الشركات',
    'Navigate business liquidation, Ministry approvals, tax/GOSI clearances, and commercial registry closures.',
    'إجراءات تصفية الشركات، وموافقات الوزارات، وبراءات ذمة الضرائب والتأمينات وإلغاء السجل التجاري.',
    'case_govt',
    '#E11D48',
    'Building2',
    true,
    '["tax_vat", "income_tax", "bookkeeping", "management"]'::jsonb
  ),
  (
    'client_success',
    'Client Success & Coordination',
    'خدمة وتنسيق العملاء',
    'Head of Client Success',
    'رئيس قسم خدمة وتنسيق العملاء',
    'Coordinate client requests, communications, and follow-ups.',
    'تنسيق طلبات العملاء والتواصل والمتابعات المستمرة.',
    'custom',
    '#8B5CF6',
    'Users',
    false,
    '[]'::jsonb
  ),
  (
    'management',
    'Executive Management',
    'الإدارة التنفيذية',
    'CEO / General Manager',
    'المدير التنفيذي / المدير العام',
    'Executive leadership, strategic oversight, and final approvals.',
    'القيادة التنفيذية والإشراف الاستراتيجي والاعتمادات النهائية.',
    'custom',
    '#A11212',
    'ShieldCheck',
    true,
    '["tax_vat", "audit", "bookkeeping", "income_tax", "consultancy", "liquidation"]'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar,
  head_title_en = EXCLUDED.head_title_en,
  head_title_ar = EXCLUDED.head_title_ar,
  duty_en = EXCLUDED.duty_en,
  duty_ar = EXCLUDED.duty_ar,
  cycle_type = EXCLUDED.cycle_type,
  color = EXCLUDED.color,
  enable_cross_handoff = EXCLUDED.enable_cross_handoff,
  allowed_handoff_dept_ids = EXCLUDED.allowed_handoff_dept_ids;

-- ------------------------------------------------------------------------------
-- SEED STAGES PER DEPARTMENT
-- ------------------------------------------------------------------------------
DELETE FROM public.department_stages WHERE department_id IN ('tax_vat', 'income_tax', 'bookkeeping', 'audit', 'consultancy', 'liquidation');

-- Tax & VAT Stages (Quarterly Deadlines)
INSERT INTO public.department_stages (department_id, step_number, name_en, name_ar, deadline_rule, requires_approval)
VALUES
  ('tax_vat', 1, 'VAT Q1 (Jan-Mar)', 'إقرار الربع الأول (يناير - مارس)', '30 Apr', true),
  ('tax_vat', 2, 'VAT Q2 (Apr-Jun)', 'إقرار الربع الثاني (أبريل - يونيو)', '31 Jul', true),
  ('tax_vat', 3, 'VAT Q3 (Jul-Sep)', 'إقرار الربع الثالث (يوليو - سبتمبر)', '31 Oct', true),
  ('tax_vat', 4, 'VAT Q4 (Oct-Dec)', 'إقرار الربع الرابع (أكتوبر - ديسمبر)', '31 Jan', true),
  ('tax_vat', 5, 'Tax Certificate & Clearance', 'الشهادة الضريبية وبراءة الذمة', 'One-off', true);

-- Income Tax Stages
INSERT INTO public.department_stages (department_id, step_number, name_en, name_ar, deadline_rule, requires_approval)
VALUES
  ('income_tax', 1, 'P&L Preparation', 'إعداد حساب الأرباح والخسائر', 'Before filing', false),
  ('income_tax', 2, 'Income Tax Return', 'تقديم الإقرار الضريبي السنوي', '120 days after FY end', true),
  ('income_tax', 3, 'Tax Card Renewal', 'تجديد البطاقة الضريبية', 'Yearly per client', false),
  ('income_tax', 4, 'Zero Filing (0 Filing)', 'تقديم الإقرار الصفري', 'Per client schedule', false),
  ('income_tax', 5, 'Objection Filing', 'تقديم الاعتراض الضريبي', 'Within 60 days', true);

-- Bookkeeping Stages (Monthly 5th-25th Milestones)
INSERT INTO public.department_stages (department_id, step_number, name_en, name_ar, deadline_rule, requires_approval)
VALUES
  ('bookkeeping', 1, 'Bank Statements Received', 'استلام كشوفات الحسابات البنكية', 'By 5th', false),
  ('bookkeeping', 2, 'Transactions Recorded', 'تسجيل القيود والعمليات المالية', 'By 10th', false),
  ('bookkeeping', 3, 'Reconciliation Done', 'إتمام التسوية والمطابقة البنكية', 'By 15th', false),
  ('bookkeeping', 4, 'Financial Report Generated', 'استخراج القوائم والتقارير المالية', 'By 20th', true),
  ('bookkeeping', 5, 'Client Delivery & Sign-off', 'تسليم التقرير للعميل والاعتماد', 'By 25th', true);

-- Audit Stages (6-Stage Engagement Pipeline)
INSERT INTO public.department_stages (department_id, step_number, name_en, name_ar, deadline_rule, requires_approval)
VALUES
  ('audit', 1, 'Engagement Letter Signed', 'توقيع خطاب الارتباط والتعاقد', 'Start / Day 1', true),
  ('audit', 2, 'Document Collection', 'استلام وتجميع وثائق التدقيق', 'Ongoing', false),
  ('audit', 3, 'Audit Fieldwork', 'التدقيق الميداني وفحص العينات', '2-4 weeks', false),
  ('audit', 4, 'Draft Report & Review', 'مسودة تقرير التدقيق والمراجعة الداخلية', 'Internal review', true),
  ('audit', 5, 'Manager Final Approval', 'اعتماد ومصادقة مدير التدقيق', 'Sign-off', true),
  ('audit', 6, 'Client Delivery', 'تسليم التقرير النهائي للعميل', 'Done', false);

-- Consultancy Stages (5 Project Stages)
INSERT INTO public.department_stages (department_id, step_number, name_en, name_ar, deadline_rule, requires_approval)
VALUES
  ('consultancy', 1, 'Client Brief & Scope Definition', 'تحديد النطاق وجلسة فهم الاحتياج', 'Week 1', false),
  ('consultancy', 2, 'Research & Data Collection', 'جمع البيانات وأبحاث السوق الميدانية', '1-2 weeks', false),
  ('consultancy', 3, 'Financial Analysis & Modelling', 'التحليل المالي وبناء النموذج', '1-2 weeks', false),
  ('consultancy', 4, 'Draft Advisory Report', 'إعداد مسودة التقرير الاستشاري', 'Internal review', true),
  ('consultancy', 5, 'Client Presentation & Delivery', 'العرض التقديمي للعميل والتسليم', 'Final delivery', true);

-- Liquidation Stages (5 Government Clearance Stages)
INSERT INTO public.department_stages (department_id, step_number, name_en, name_ar, deadline_rule, requires_approval)
VALUES
  ('liquidation', 1, 'Client Engagement & Case Opening', 'فتح ملف التصفية وتعيين المصفي', 'Day 1', true),
  ('liquidation', 2, 'Tax Authority Clearance (ZATCA / OTA)', 'براءة ذمة الضرائب (الزكاة / الدخل)', '2-6 weeks', true),
  ('liquidation', 3, 'GOSI & Labour Clearance', 'براءة ذمة التأمينات ومكتب العمل', '2-4 weeks', true),
  ('liquidation', 4, 'Ministry of Commerce Procedures', 'إجراءات وزارة التجارة والصناعة', 'Varies', true),
  ('liquidation', 5, 'CR Cancellation Confirmed', 'تأكيد شطب وإلغاء السجل التجاري نهائياً', 'Final', true);

-- ------------------------------------------------------------------------------
-- SEED JOB ROLES PER DEPARTMENT
-- ------------------------------------------------------------------------------
DELETE FROM public.department_roles WHERE department_id IN ('tax_vat', 'income_tax', 'bookkeeping', 'audit', 'consultancy', 'liquidation');

INSERT INTO public.department_roles (department_id, title_en, title_ar, access_role)
VALUES
  ('tax_vat', 'VAT & Tax Head', 'رئيس قسم الضرائب والقيمة المضافة', 'department_head'),
  ('tax_vat', 'Senior VAT Specialist', 'أخصائي أول ضريبة قيمة مضافة', 'employee'),
  ('tax_vat', 'VAT Accountant', 'محاسب ضريبة القيمة المضافة', 'employee'),
  ('tax_vat', 'Tax Trainee', 'متدرب ضرائب', 'employee'),

  ('income_tax', 'Income Tax Head', 'رئيس قسم ضريبة الدخل', 'department_head'),
  ('income_tax', 'Corporate Tax Advisor', 'مستشار ضريبة دخل الشركات', 'employee'),
  ('income_tax', 'Tax Preparer', 'معد إقرارات ضريبية', 'employee'),

  ('bookkeeping', 'Bookkeeping Head', 'رئيس قسم مسك الدفاتر', 'department_head'),
  ('bookkeeping', 'Senior Accountant', 'محاسب أول', 'accountant'),
  ('bookkeeping', 'Bookkeeper', 'ماسِك دفاتر', 'employee'),
  ('bookkeeping', 'Accounting Consultant', 'مستشار محاسبي', 'employee'),

  ('audit', 'Audit Head', 'رئيس قسم التدقيق', 'department_head'),
  ('audit', 'Senior Auditor', 'مدقق أول', 'employee'),
  ('audit', 'Auditor', 'مدقق حسابات', 'employee'),
  ('audit', 'Audit Assistant', 'مساعد مدقق', 'employee'),

  ('consultancy', 'Advisory Head', 'رئيس قسم الاستشارات', 'department_head'),
  ('consultancy', 'Senior Business Consultant', 'مستشار أعمال أول', 'employee'),
  ('consultancy', 'Financial Analyst', 'محلل مالي', 'employee'),
  ('consultancy', 'Research Specialist', 'أخصائي بحوث ودراسات', 'employee'),

  ('liquidation', 'Corporate Services Head', 'رئيس قسم خدمات الشركات والتصفية', 'department_head'),
  ('liquidation', 'Liquidation Officer', 'مسؤول تصفية شركات', 'employee'),
  ('liquidation', 'Public Relations Officer (PRO)', 'مسؤول علاقات حكومية (معقب)', 'employee');

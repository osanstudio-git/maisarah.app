-- This script updates the database to support the new 8-tier department structure.

-- 1. Add department_id to profiles (if managers/employees need to be strictly assigned)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department_id TEXT;

-- 2. Add department_id to service_catalog (to replace category text fields)
ALTER TABLE public.service_catalog ADD COLUMN IF NOT EXISTS department_id TEXT;

-- 3. We can seed the service_catalog with the new official services per department
-- (Optional: uncomment and run if you want to wipe old services and insert new ones)

/*
DELETE FROM public.service_catalog;

INSERT INTO public.service_catalog (name_en, name_ar, department_id, base_price) VALUES
-- Audit
('Internal Audit', 'تدقيق داخلي', 'audit', 0),
('KSA Audit', 'تدقيق في السعودية', 'audit', 0),
('Financial Statements', 'القوائم المالية', 'audit', 0),
('Tax Audit', 'تدقيق ضريبي', 'audit', 0),
('Bank Audit', 'تدقيق بنكي', 'audit', 0),

-- Tax & VAT
('Income Tax filing', 'تقديم الإقرار الضريبي', 'tax_vat', 0),
('VAT filing', 'تقديم إقرار ضريبة القيمة المضافة', 'tax_vat', 0),
('Tax Certificate', 'الشهادة الضريبية', 'tax_vat', 0),
('Renew Tax Certificate', 'تجديد الشهادة الضريبية', 'tax_vat', 0),
('Objection', 'الاعتراض', 'tax_vat', 0),
('Exemption', 'الإعفاء', 'tax_vat', 0),
('VAT Cancelation', 'إلغاء ضريبة القيمة المضافة', 'tax_vat', 0),

-- Bookkeeping
('Bookkeeping', 'مسك الدفاتر', 'bookkeeping', 0),

-- Business Advisory and Development
('Consultancy', 'استشارات', 'business_advisory', 0),
('Feasibility', 'دراسة جدوى', 'business_advisory', 0),
('Liquidation', 'تصفية', 'business_advisory', 0),
('Corporate Services', 'خدمات الشركات', 'business_advisory', 0),
('Business plan', 'خطة عمل', 'business_advisory', 0),
('Project budgeting', 'ميزانية المشروع', 'business_advisory', 0),
('Bank feasibility study', 'دراسة جدوى بنكية', 'business_advisory', 0),
('CR cancelation', 'إلغاء السجل التجاري', 'business_advisory', 0),

-- Client Success and Operations Coordination
('Client support and coordination', 'دعم العملاء والتنسيق', 'client_success', 0),

-- Innovation and Development
('Digital Marketing', 'التسويق الرقمي', 'innovation_dev', 0),
('Technology Projects', 'مشاريع التقنية', 'innovation_dev', 0),

-- Internal Support & Administration
('HR Management', 'إدارة الموارد البشرية', 'internal_support', 0),
('Internal Accounting', 'محاسبة داخلية', 'internal_support', 0),
('Facility Maintenance', 'صيانة المرافق', 'internal_support', 0),

-- Management
('Strategic Oversight', 'الإشراف الاستراتيجي', 'management', 0);
*/

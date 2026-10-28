import { supabase } from '../lib/supabaseClient';
import { normalizeDepartmentId } from '../utils/departmentScoping';

export interface ChecklistSubItem {
  code: string;
  title_en: string;
  title_ar: string;
  is_completed: boolean;
}

export interface ChecklistItem {
  id: string;
  item_number?: number | string;
  client_id: string;
  department_id: string;
  title_en: string;
  title_ar: string;
  category?: string;
  sub_items?: ChecklistSubItem[];
  is_completed: boolean;
  is_custom: boolean;
  completed_at?: string | null;
  completed_by_name?: string | null;
  notes?: string;
}

// -----------------------------------------------------------------------------
// Pre-configured Department Checklist Templates
// -----------------------------------------------------------------------------
export const DEFAULT_DEPARTMENT_CHECKLISTS: Record<string, Array<{
  item_number: number | string;
  title_en: string;
  title_ar: string;
  category: string;
  sub_items?: Array<{ code: string; title_en: string; title_ar: string }>;
}>> = {
  // 1. AUDIT (Matches exact official requirements from client model)
  audit: [
    {
      item_number: 1,
      title_en: 'Commercial License Copy',
      title_ar: 'نسخة من الترخيص التجاري والسجل التجاري',
      category: 'Legal & Entity'
    },
    {
      item_number: 2,
      title_en: 'Rental Agreement Copy / Tenancy Contract',
      title_ar: 'نسخة من عقد الإيجار / عقد الإيجار المعتمد',
      category: 'Legal & Entity'
    },
    {
      item_number: 3,
      title_en: 'Audit Report for the previous year, if any',
      title_ar: 'تقرير التدقيق المالي للسنة السابقة (إن وجد)',
      category: 'Prior Records'
    },
    {
      item_number: 4,
      title_en: 'List of Employees with their DOJ and Salary Breakup. No. of Omani & Non-Omani',
      title_ar: 'كشف الموظفين مع تاريخ الالتحاق وتفاصيل الرواتب وعدد العمانيين وغير العمانيين',
      category: 'Payroll & HR'
    },
    {
      item_number: 5,
      title_en: 'Pasi details (Social Insurance Records)',
      title_ar: 'بيانات صندوق الحماية الاجتماعية / التأمينات الاجتماعية (PASI)',
      category: 'Payroll & HR'
    },
    {
      item_number: 6,
      title_en: 'If using accounting software, please upload backup',
      title_ar: 'في حال استخدام برنامج محاسبي، يرجى رفع نسخة احتياطية (Backup)',
      category: 'Accounting Books'
    },
    {
      item_number: 7,
      title_en: 'If not using software, provide the documents below',
      title_ar: 'في حال عدم استخدام برنامج، يرجى تقديم المستندات التشغيلية التالية',
      category: 'Accounting Books',
      sub_items: [
        { code: 'A', title_en: 'Sales invoice Details', title_ar: 'تفاصيل فواتير المبيعات' },
        { code: 'B', title_en: 'Purchase invoice Details', title_ar: 'تفاصيل فواتير المشتريات' },
        { code: 'C', title_en: 'Electricity Statements', title_ar: 'كشوفات فواتير الكهرباء والمرافق' },
        { code: 'D', title_en: 'Expenses - all expenses details (Like Salary, Rent & Other Expenses)', title_ar: 'تفاصيل جميع المصروفات (رواتب، إيجار، ومصروفات أخرى)' },
        { code: 'E', title_en: 'Closing stock on year-end date', title_ar: 'بضاعة آخر المدة في نهاية السنة المالية' },
        { code: 'F', title_en: 'Cash balance as on year-end date', title_ar: 'رصيد النقدية والصندوق في نهاية السنة المالية' }
      ]
    },
    {
      item_number: 8,
      title_en: 'All bank statements of the company for the period covered under audit',
      title_ar: 'جميع كشوفات الحسابات البنكية للشركة عن كامل فترة التدقيق',
      category: 'Banking & Treasury'
    },
    {
      item_number: 9,
      title_en: 'All Loan statements of the company for the period covered under audit (if any)',
      title_ar: 'جميع كشوفات القروض والتسهيلات البنكية عن فترة التدقيق (إن وجدت)',
      category: 'Banking & Treasury'
    },
    {
      item_number: 10,
      title_en: 'Details of Fixed Assets additions and deletions during the year, Fixed Assets Schedule (if any)',
      title_ar: 'جدول الأصول الثابتة والإضافات والاستبعادات خلال العام مع نسب الإهلاك',
      category: 'Assets & Liabilities'
    },
    {
      item_number: 11,
      title_en: 'VAT Credentials or VAT Returns (if Civil ID Filing)',
      title_ar: 'بيانات اعتماد ضريبة القيمة المضافة أو نسخ الإقرارات الضريبية المقدمة',
      category: 'Tax & Compliance'
    },
    {
      item_number: 12,
      title_en: 'Creditors (Payables) Closing Balances',
      title_ar: 'أرصدة الدائنين والموردين الختامية في نهاية السنة المالية',
      category: 'Assets & Liabilities'
    },
    {
      item_number: 13,
      title_en: 'Debtors (Receivables) Closing Balances',
      title_ar: 'أرصدة المدينين والعملاء الختامية في نهاية السنة المالية',
      category: 'Assets & Liabilities'
    },
    {
      item_number: 14,
      title_en: 'Balances of Other Payables / Receivables',
      title_ar: 'أرصدة المدفوعات والمستحقات والعهد والأمانات الأخرى',
      category: 'Assets & Liabilities'
    },
    {
      item_number: 15,
      title_en: 'Import Bayan Copies, if any',
      title_ar: 'نسخ من بيانات الاستيراد الجمركية (بيان) مع إيصالات السداد إن وجدت',
      category: 'Customs & Trade'
    }
  ],

  // 2. BOOKKEEPING (Monthly Closure & Ledger Verification)
  bookkeeping: [
    {
      item_number: 1,
      title_en: 'Bank Statements for all accounts (1st to end of month)',
      title_ar: 'كشوفات الحسابات البنكية لجميع الحسابات من أول إلى آخر الشهر',
      category: 'Bank Reconciliations'
    },
    {
      item_number: 2,
      title_en: 'Monthly Sales Invoices & Credit Notes with VAT breakdown',
      title_ar: 'فواتير المبيعات الشهرية وإشعارات الدائن مع تفصيل ضريبة القيمة المضافة',
      category: 'Revenue & Sales'
    },
    {
      item_number: 3,
      title_en: 'Monthly Purchase Invoices & Supplier Delivery Notes',
      title_ar: 'فواتير المشتريات وفواتير الموردين وسندات الاستلام الشهرية',
      category: 'Purchases & Payables'
    },
    {
      item_number: 4,
      title_en: 'Operational Expenses Receipts (Rent, Utilities, Fuel, Stationery)',
      title_ar: 'إيصالات وفواتير المصروفات التشغيلية (إيجار، كهرباء، وقود، نثريات)',
      category: 'Operational Expenses'
    },
    {
      item_number: 5,
      title_en: 'Monthly Payroll Register & WPS Salary Transfer Proof',
      title_ar: 'كشف الرواتب الشهري وإثبات التحويل عبر نظام حماية الأجور (WPS)',
      category: 'Payroll & HR'
    },
    {
      item_number: 6,
      title_en: 'Monthly POS / Card Settlement Machine Reports',
      title_ar: 'تقارير تسويات أجهزة نقاط البيع والبطاقات البنكية الشهرية',
      category: 'Bank Reconciliations'
    },
    {
      item_number: 7,
      title_en: 'Petty Cash Log & Reconciliation Summary',
      title_ar: 'سجل العهدة النقدية والمطابقة الشهرية لصندوق المصروفات النثرية',
      category: 'Cash & Treasury'
    },
    {
      item_number: 8,
      title_en: 'Monthly Inventory / Stock Movement Summary',
      title_ar: 'تقرير حركة وتقييم بضاعة المخزون الشهرية',
      category: 'Inventory & Operations'
    },
    {
      item_number: 9,
      title_en: 'Prior Month General Ledger & Trial Balance Sign-off',
      title_ar: 'مطابقة وإقفال ميزان المراجعة ودفتر الأستاذ للشهر السابق',
      category: 'Financial Reporting'
    }
  ],

  // 3. INCOME TAX (Annual Return & Tax Card Clearance)
  income_tax: [
    {
      item_number: 1,
      title_en: 'Audited Financial Statements or Final Trial Balance & P&L',
      title_ar: 'القوائم المالية المدققة أو ميزان المراجعة وقائمة الأرباح والخسائر النهائية',
      category: 'Financial Accounts'
    },
    {
      item_number: 2,
      title_en: 'Prior Year Income Tax Return & Final Assessment Order',
      title_ar: 'الإقرار الضريبي للسنة السابقة وقرار الربط الضريبي الصادر من جهاز الضرائب',
      category: 'Prior Tax Filings'
    },
    {
      item_number: 3,
      title_en: 'Valid Commercial Registration (CR) & Tax Card Copy',
      title_ar: 'نسخة حديثة من السجل التجاري والبطاقة الضريبية السارية',
      category: 'Corporate Registration'
    },
    {
      item_number: 4,
      title_en: 'Tax Depreciation & Capital Allowance Schedule',
      title_ar: 'جدول الإهلاك الضريبي المعتمد للأصول وفق قانون ضريبة الدخل',
      category: 'Tax Calculations'
    },
    {
      item_number: 5,
      title_en: 'Non-Deductible Expenses Breakdown (Penalties, Donations, Entertainment)',
      title_ar: 'كشف المصروفات غير الجائز خصمها ضريبياً (الغرامات، التبرعات، الضيافة)',
      category: 'Tax Calculations'
    },
    {
      item_number: 6,
      title_en: 'Related Party Transactions Schedule & Transfer Pricing Documentation',
      title_ar: 'جدول المعاملات مع الأطراف ذات العلاقة وتسعير المعاملات',
      category: 'Compliance'
    },
    {
      item_number: 7,
      title_en: 'Withholding Tax Deductions & Remittance Receipts (WHT)',
      title_ar: 'كشف استقطاعات وتوريدات ضريبة الخصم من المنبع وإيصالات السداد',
      category: 'Tax Compliance'
    },
    {
      item_number: 8,
      title_en: 'Proof of Advance Tax Installments Paid During the Year',
      title_ar: 'إيصالات سداد الدفعات الضريبية المقدمة المسددة خلال العام المالي',
      category: 'Tax Payments'
    }
  ],

  // 4. TAX & VAT (Quarterly Returns & Audit Prep)
  tax_vat: [
    {
      item_number: 1,
      title_en: 'Standard VAT Tax Invoices for all Sales (with VAT ID & QR)',
      title_ar: 'فواتير المبيعات الضريبية النظامية متضمنة الرقم الضريبي ورمز الاستجابة',
      category: 'Output Tax (Sales)'
    },
    {
      item_number: 2,
      title_en: 'Valid VAT Tax Invoices for Purchases & Capital Assets',
      title_ar: 'فواتير الشراء الضريبية المعتمدة والأصول الرأسمالية للاسترداد',
      category: 'Input Tax (Purchases)'
    },
    {
      item_number: 3,
      title_en: 'Customs Import Declarations (Bayan Platform Documents & Payment Slips)',
      title_ar: 'البيانات الجمركية للاستيراد عبر نظام بيان مع إيصالات سداد الضريبة',
      category: 'Imports & Customs'
    },
    {
      item_number: 4,
      title_en: 'Debit and Credit Notes Issued & Received during the Quarter',
      title_ar: 'إشعارات الخصم والإضافة الضريبية الصادرة والواردة خلال الربع',
      category: 'Adjustments'
    },
    {
      item_number: 5,
      title_en: 'Proof of Zero-Rated Exports & Exempt Supplies (Shipping/Airway Bills)',
      title_ar: 'مستندات إثبات الصادرات بنسبة الصفر والتوريدات المعفاة (بوالص الشحن)',
      category: 'Special Supplies'
    },
    {
      item_number: 6,
      title_en: 'Bank Statements Reconciled against Output/Input VAT Calculations',
      title_ar: 'كشوفات الحسابات البنكية مطابقة لحسابات ضريبة المخرجات والمدخلات',
      category: 'Reconciliation'
    },
    {
      item_number: 7,
      title_en: 'Active VAT Registration Certificate Copy',
      title_ar: 'نسخة من شهادة التسجيل في ضريبة القيمة المضافة سارية المفعول',
      category: 'Certificates'
    }
  ],

  // 5. CONSULTANCY (Feasibility & Strategic Business Planning)
  consultancy: [
    {
      item_number: 1,
      title_en: 'Project Concept, Vision & Targeted Business Model',
      title_ar: 'نبذة عن فكرة المشروع والرؤية ونموذج العمل المستهدف وتفاصيل الشركاء',
      category: 'Project Framework'
    },
    {
      item_number: 2,
      title_en: 'Target Market Demographics & Field Competitor Survey Data',
      title_ar: 'دراسة السوق المستهدف والتحليل الميداني للمنافسين وحجم الطلب المتوقع',
      category: 'Market Research'
    },
    {
      item_number: 3,
      title_en: 'CapEx Equipment Vendor Quotations & Building Specifications',
      title_ar: 'عروض أسعار الآلات والمعدات ورأس المال التأسيسي والمواصفات الإنشائية',
      category: 'Technical & CapEx'
    },
    {
      item_number: 4,
      title_en: 'Projected Operational Costs (Manpower, Raw Materials, Lease)',
      title_ar: 'تقديرات التكاليف التشغيلية (العمالة، المواد الخام، الإيجارات، الطاقة)',
      category: 'Financial Modeling'
    },
    {
      item_number: 5,
      title_en: '5-Year Revenue Forecast & Pricing Strategy Model',
      title_ar: 'توقعات الإيرادات لخمس سنوات ونموذج استراتيجية التسعير وهيكل التكلفة',
      category: 'Financial Modeling'
    },
    {
      item_number: 6,
      title_en: 'Oman Development Bank / Jaheez Program Form Requirements',
      title_ar: 'متطلبات ومعايير بنك التنمية العماني أو برنامج جاهز للتمويل',
      category: 'Funding & Banking'
    },
    {
      item_number: 7,
      title_en: 'Environmental, Municipal & Sectoral Ministry Approval Letters',
      title_ar: 'الموافقات والتصاريح البيئية والبلدية وموافقات الوزارات المعنية',
      category: 'Legal & Approvals'
    }
  ],

  // 6. LIQUIDATION (Company Closure & Legal Dissolution)
  liquidation: [
    {
      item_number: 1,
      title_en: "Partners' Resolution for Dissolution & Liquidator Appointment (Attested)",
      title_ar: 'قرار الشركاء بحل وتصفية الشركة وتعيين المصفي القانوني (معتمد وموثق)',
      category: 'Legal Resolution'
    },
    {
      item_number: 2,
      title_en: 'Official Gazette & Daily Newspaper Liquidation Publication Proof',
      title_ar: 'إثبات نشر إعلان بدء التصفية في الجريدة الرسمية وصحيفتين يوميتين',
      category: 'Public Notices'
    },
    {
      item_number: 3,
      title_en: 'Tax Authority Final Clearance Certificate (Income Tax & VAT)',
      title_ar: 'شهادة براءة الذمة الضريبية النهائية من جهاز الضرائب (دخل وقيمة مضافة)',
      category: 'Govt Clearances'
    },
    {
      item_number: 4,
      title_en: 'PASI / Social Protection Fund Clearance Certificate',
      title_ar: 'شهادة براءة ذمة من صندوق الحماية الاجتماعية / التأمينات الاجتماعية',
      category: 'Govt Clearances'
    },
    {
      item_number: 5,
      title_en: 'Ministry of Labour Expatriate Workforce & Wage Clearance',
      title_ar: 'براءة ذمة وزارة العمل بخصوص إلغاء العمالة وتسوية الأجور',
      category: 'Govt Clearances'
    },
    {
      item_number: 6,
      title_en: 'Royal Oman Police (ROP) Immigration Clearance',
      title_ar: 'براءة ذمة شرطة عمان السلطانية (الجوازات والإقامة)',
      category: 'Govt Clearances'
    },
    {
      item_number: 7,
      title_en: 'Bank Accounts Liquidation & Balance Closure Confirmation Letters',
      title_ar: 'خطابات رسمية من جميع البنوك بإغلاق وتصفية الحسابات البنكية بالكامل',
      category: 'Banking & Treasury'
    },
    {
      item_number: 8,
      title_en: 'Municipal License Cancellation & Final Liquidator Closing Report',
      title_ar: 'إلغاء الترخيص البلدي والتقرير الختامي للمصفي لتوزيع الموجودات وشطب السجل',
      category: 'Final Dissolution'
    }
  ]
};

// -----------------------------------------------------------------------------
// Storage Keys Helper
// -----------------------------------------------------------------------------
function getStorageKey(clientId: string, deptId: string): string {
  return `maisarah_checklist_${clientId}_${normalizeDepartmentId(deptId)}`;
}

// -----------------------------------------------------------------------------
// Service Methods
// -----------------------------------------------------------------------------

/**
 * Fetches the checklist items for a client and department.
 * Syncs with Supabase if table exists, otherwise uses localStorage cache.
 */
export async function getClientChecklist(
  clientId: string,
  departmentId: string
): Promise<ChecklistItem[]> {
  const canonical = normalizeDepartmentId(departmentId);
  const storageKey = getStorageKey(clientId, canonical);

  // 1. Try fetching from Supabase
  try {
    const { data, error } = await supabase
      .from('client_checklists')
      .select('*')
      .eq('client_id', clientId)
      .eq('department_id', canonical)
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      const items: ChecklistItem[] = data.map((row: any) => ({
        id: row.id,
        item_number: row.item_key || row.item_number,
        client_id: row.client_id,
        department_id: row.department_id,
        title_en: row.title_en,
        title_ar: row.title_ar,
        category: row.category,
        sub_items: row.sub_items || undefined,
        is_completed: Boolean(row.is_completed),
        is_custom: Boolean(row.is_custom),
        completed_at: row.completed_at,
        completed_by_name: row.completed_by_name,
        notes: row.notes || ''
      }));
      // Cache locally
      localStorage.setItem(storageKey, JSON.stringify(items));
      return items;
    }
  } catch (err) {
    console.warn('Supabase checklist fetch note (falling back to local cache):', err);
  }

  // 2. Check Local Storage
  const cached = localStorage.getItem(storageKey);
  if (cached) {
    try {
      const parsed: ChecklistItem[] = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      /* ignore */
    }
  }

  // 3. Seed from default template
  const defaultList = DEFAULT_DEPARTMENT_CHECKLISTS[canonical] || DEFAULT_DEPARTMENT_CHECKLISTS.audit;
  const initialItems: ChecklistItem[] = defaultList.map((tpl, idx) => ({
    id: `chk-${clientId}-${canonical}-${idx + 1}`,
    item_number: tpl.item_number,
    client_id: clientId,
    department_id: canonical,
    title_en: tpl.title_en,
    title_ar: tpl.title_ar,
    category: tpl.category,
    sub_items: tpl.sub_items?.map(sub => ({
      code: sub.code,
      title_en: sub.title_en,
      title_ar: sub.title_ar,
      is_completed: false
    })),
    is_completed: false,
    is_custom: false,
    completed_at: null,
    completed_by_name: null,
    notes: ''
  }));

  localStorage.setItem(storageKey, JSON.stringify(initialItems));
  return initialItems;
}

/**
 * Toggles completion status of a checklist item.
 */
export async function toggleChecklistItem(
  clientId: string,
  departmentId: string,
  itemId: string,
  isCompleted: boolean,
  userFullName?: string
): Promise<ChecklistItem[]> {
  const canonical = normalizeDepartmentId(departmentId);
  const storageKey = getStorageKey(clientId, canonical);

  // Update in local cache
  const cached = localStorage.getItem(storageKey);
  let items: ChecklistItem[] = cached ? JSON.parse(cached) : [];

  const completedAt = isCompleted ? new Date().toISOString() : null;
  const completedBy = isCompleted ? (userFullName || 'Staff') : null;

  items = items.map(item => {
    if (item.id === itemId) {
      return {
        ...item,
        is_completed: isCompleted,
        completed_at: completedAt,
        completed_by_name: completedBy,
        // Also toggle all sub-items if present
        sub_items: item.sub_items?.map(sub => ({ ...sub, is_completed: isCompleted }))
      };
    }
    return item;
  });

  localStorage.setItem(storageKey, JSON.stringify(items));

  // Sync to Supabase if possible
  try {
    await supabase
      .from('client_checklists')
      .update({
        is_completed: isCompleted,
        completed_at: completedAt,
        completed_by_name: completedBy
      })
      .eq('id', itemId);
  } catch {
    /* silent */
  }

  // Dispatch live event
  window.dispatchEvent(new CustomEvent('maisarah_checklist_updated', {
    detail: { clientId, departmentId: canonical }
  }));

  return items;
}

/**
 * Toggles a specific sub-item (e.g. Audit item 7 sub-items A-F).
 */
export async function toggleChecklistSubItem(
  clientId: string,
  departmentId: string,
  parentId: string,
  subCode: string,
  isCompleted: boolean,
  userFullName?: string
): Promise<ChecklistItem[]> {
  const canonical = normalizeDepartmentId(departmentId);
  const storageKey = getStorageKey(clientId, canonical);

  const cached = localStorage.getItem(storageKey);
  let items: ChecklistItem[] = cached ? JSON.parse(cached) : [];

  items = items.map(item => {
    if (item.id === parentId && item.sub_items) {
      const updatedSub = item.sub_items.map(sub =>
        sub.code === subCode ? { ...sub, is_completed: isCompleted } : sub
      );
      const allDone = updatedSub.every(s => s.is_completed);
      return {
        ...item,
        sub_items: updatedSub,
        is_completed: allDone,
        completed_at: allDone ? new Date().toISOString() : null,
        completed_by_name: allDone ? (userFullName || 'Staff') : null
      };
    }
    return item;
  });

  localStorage.setItem(storageKey, JSON.stringify(items));

  window.dispatchEvent(new CustomEvent('maisarah_checklist_updated', {
    detail: { clientId, departmentId: canonical }
  }));

  return items;
}

/**
 * Adds a custom checklist item created by the employee or manager for this specific client.
 */
export async function addCustomChecklistItem(
  clientId: string,
  departmentId: string,
  titleEn: string,
  titleAr?: string,
  category = 'Custom Requirements',
  notes = ''
): Promise<ChecklistItem[]> {
  const canonical = normalizeDepartmentId(departmentId);
  const storageKey = getStorageKey(clientId, canonical);

  const cached = localStorage.getItem(storageKey);
  const items: ChecklistItem[] = cached ? JSON.parse(cached) : [];

  const newItem: ChecklistItem = {
    id: `custom-${clientId}-${canonical}-${Date.now()}`,
    item_number: `+${items.filter(i => i.is_custom).length + 1}`,
    client_id: clientId,
    department_id: canonical,
    title_en: titleEn,
    title_ar: titleAr || titleEn,
    category,
    is_completed: false,
    is_custom: true,
    completed_at: null,
    completed_by_name: null,
    notes
  };

  const updated = [...items, newItem];
  localStorage.setItem(storageKey, JSON.stringify(updated));

  // Try saving to Supabase
  try {
    await supabase.from('client_checklists').insert([{
      client_id: clientId,
      department_id: canonical,
      title_en: titleEn,
      title_ar: titleAr || titleEn,
      category,
      is_completed: false,
      is_custom: true,
      notes
    }]);
  } catch {
    /* silent */
  }

  window.dispatchEvent(new CustomEvent('maisarah_checklist_updated', {
    detail: { clientId, departmentId: canonical }
  }));

  return updated;
}

/**
 * Deletes a custom checklist item.
 */
export async function deleteCustomChecklistItem(
  clientId: string,
  departmentId: string,
  itemId: string
): Promise<ChecklistItem[]> {
  const canonical = normalizeDepartmentId(departmentId);
  const storageKey = getStorageKey(clientId, canonical);

  const cached = localStorage.getItem(storageKey);
  let items: ChecklistItem[] = cached ? JSON.parse(cached) : [];

  items = items.filter(i => i.id !== itemId);
  localStorage.setItem(storageKey, JSON.stringify(items));

  try {
    await supabase.from('client_checklists').delete().eq('id', itemId);
  } catch {
    /* silent */
  }

  window.dispatchEvent(new CustomEvent('maisarah_checklist_updated', {
    detail: { clientId, departmentId: canonical }
  }));

  return items;
}

/**
 * Updates remarks / notes for a checklist item.
 */
export async function updateChecklistItemNote(
  clientId: string,
  departmentId: string,
  itemId: string,
  notes: string
): Promise<ChecklistItem[]> {
  const canonical = normalizeDepartmentId(departmentId);
  const storageKey = getStorageKey(clientId, canonical);

  const cached = localStorage.getItem(storageKey);
  let items: ChecklistItem[] = cached ? JSON.parse(cached) : [];

  items = items.map(item => item.id === itemId ? { ...item, notes } : item);
  localStorage.setItem(storageKey, JSON.stringify(items));

  try {
    await supabase
      .from('client_checklists')
      .update({ notes })
      .eq('id', itemId);
  } catch {
    /* silent */
  }

  return items;
}

/**
 * Resets the department checklist to initial default template.
 */
export async function resetDepartmentChecklist(
  clientId: string,
  departmentId: string
): Promise<ChecklistItem[]> {
  const canonical = normalizeDepartmentId(departmentId);
  const storageKey = getStorageKey(clientId, canonical);

  const defaultList = DEFAULT_DEPARTMENT_CHECKLISTS[canonical] || DEFAULT_DEPARTMENT_CHECKLISTS.audit;
  const initialItems: ChecklistItem[] = defaultList.map((tpl, idx) => ({
    id: `chk-${clientId}-${canonical}-${idx + 1}`,
    item_number: tpl.item_number,
    client_id: clientId,
    department_id: canonical,
    title_en: tpl.title_en,
    title_ar: tpl.title_ar,
    category: tpl.category,
    sub_items: tpl.sub_items?.map(sub => ({
      code: sub.code,
      title_en: sub.title_en,
      title_ar: sub.title_ar,
      is_completed: false
    })),
    is_completed: false,
    is_custom: false,
    completed_at: null,
    completed_by_name: null,
    notes: ''
  }));

  localStorage.setItem(storageKey, JSON.stringify(initialItems));

  window.dispatchEvent(new CustomEvent('maisarah_checklist_updated', {
    detail: { clientId, departmentId: canonical }
  }));

  return initialItems;
}

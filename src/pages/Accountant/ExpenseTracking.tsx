import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import {
  Receipt,
  DollarSign,
  Calendar,
  Tag,
  FileText,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  ChevronDown,
  RefreshCw,
  Trash2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  expense_date: string;
  description: string | null;
  receipt_url: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Category Config
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { value: 'labor',       label_ar: 'عمالة',          label_en: 'Labor' },
  { value: 'materials',   label_ar: 'مواد',            label_en: 'Materials' },
  { value: 'equipment',   label_ar: 'معدات',           label_en: 'Equipment' },
  { value: 'utilities',   label_ar: 'خدمات',           label_en: 'Utilities' },
  { value: 'travel',      label_ar: 'سفر وتنقلات',     label_en: 'Travel' },
  { value: 'office',      label_ar: 'مستلزمات مكتبية', label_en: 'Office Supplies' },
  { value: 'maintenance', label_ar: 'صيانة',           label_en: 'Maintenance' },
  { value: 'other',       label_ar: 'أخرى',            label_en: 'Other' },
];

const CAT_COLORS: Record<string, string> = {
  labor:       'bg-blue-100 text-blue-700',
  materials:   'bg-amber-100 text-amber-700',
  equipment:   'bg-purple-100 text-purple-700',
  utilities:   'bg-cyan-100 text-cyan-700',
  travel:      'bg-indigo-100 text-indigo-700',
  office:      'bg-pink-100 text-pink-700',
  maintenance: 'bg-orange-100 text-orange-700',
  other:       'bg-gray-100 text-gray-600',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const formatOMR = (val: number) =>
  new Intl.NumberFormat('en-OM', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(val);

const inputCls =
  'w-full p-3 border border-gray-200 rounded-xl text-sm outline-none ' +
  'focus:border-red-700 focus:ring-2 focus:ring-red-700/10 transition bg-white';

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const ExpenseTracking = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isAr = i18n.language === 'ar';

  const [expenses, setExpenses]       = useState<Expense[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [formMsg, setFormMsg]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [filterCat, setFilterCat]     = useState('all');

  const [form, setForm] = useState({
    title: '',
    category: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    description: '',
  });

  // ── Fetch expenses ────────────────────────────────────────────────────────
  const fetchExpenses = useCallback(async () => {
    setLoadingList(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('id, title, category, amount, expense_date, description, receipt_url, created_at')
        .order('expense_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setExpenses((data as Expense[]) || []);
    } catch (err: any) {
      // If table doesn't exist yet, use empty state gracefully
      console.warn('Expenses table not found or error:', err.message);
      setExpenses([]);
    }
    setLoadingList(false);
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  // ── Upload receipt to Supabase Storage ────────────────────────────────────
  const uploadReceipt = async (file: File): Promise<string | null> => {
    try {
      const ext  = file.name.split('.').pop();
      const path = `receipts/${Date.now()}_${user?.id}.${ext}`;
      const { error } = await supabase.storage.from('receipts').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('receipts').getPublicUrl(path);
      return data.publicUrl;
    } catch {
      return null; // non-blocking — expense still saves without receipt
    }
  };

  // ── Submit expense ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormMsg(null);

    try {
      let receipt_url: string | null = null;
      if (receiptFile) {
        receipt_url = await uploadReceipt(receiptFile);
      }

      /**
       * Insert into `expenses` table.
       * Required Supabase table columns:
       *   id (uuid, default gen_random_uuid()),
       *   title text, category text, amount numeric,
       *   expense_date date, description text,
       *   receipt_url text, created_by uuid (FK → auth.users),
       *   created_at timestamptz (default now())
       *
       * SQL to create:
       *   CREATE TABLE expenses (
       *     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
       *     title text NOT NULL,
       *     category text,
       *     amount numeric NOT NULL,
       *     expense_date date,
       *     description text,
       *     receipt_url text,
       *     created_by uuid REFERENCES auth.users(id),
       *     created_at timestamptz DEFAULT now()
       *   );
       */
      const { error } = await supabase.from('expenses').insert([{
        title:        form.title,
        category:     form.category || 'other',
        amount:       parseFloat(form.amount),
        expense_date: form.expense_date,
        description:  form.description || null,
        receipt_url,
        created_by:   user?.id ?? null,
      }]);

      if (error) throw error;

      setFormMsg({ type: 'ok', text: t('accountant.expenseRecordedSuccess') });
      setForm({ title: '', category: '', amount: '', expense_date: new Date().toISOString().split('T')[0], description: '' });
      setReceiptFile(null);
      fetchExpenses();
      setTimeout(() => setFormMsg(null), 4000);
    } catch (err: any) {
      setFormMsg({ type: 'err', text: err.message || 'Failed to record expense' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    await supabase.from('expenses').delete().eq('id', id);
    setDeletingId(null);
  };

  // ── Filtered list + stats ─────────────────────────────────────────────────
  const filtered = expenses.filter(e => filterCat === 'all' || e.category === filterCat);
  const totalThisMonth = expenses.filter(e => {
    const d = new Date(e.expense_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, e) => s + e.amount, 0);
  const grandTotal = expenses.reduce((s, e) => s + e.amount, 0);

  const getCatLabel = (val: string) => {
    const c = CATEGORIES.find(c => c.value === val);
    return c ? (isAr ? c.label_ar : c.label_en) : val;
  };

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingDown size={24} className="text-brand-dark" />
            {t('accountant.expenseTracking')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isAr ? `${expenses.length} مصروف مسجّل` : `${expenses.length} expenses recorded`}
          </p>
        </div>
        <button onClick={fetchExpenses} className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-brand-dark transition-colors">
          <RefreshCw size={16} className={loadingList ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: isAr ? 'هذا الشهر' : 'This Month',    value: totalThisMonth, cls: 'bg-red-50 text-brand-dark' },
          { label: isAr ? 'الإجمالي الكلي' : 'All Time', value: grandTotal,     cls: 'bg-gray-50 text-gray-700' },
          { label: isAr ? 'عدد المصروفات' : 'Count',     value: expenses.length, cls: 'bg-blue-50 text-blue-700', isCount: true },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className={`text-lg font-bold ${s.cls.split(' ')[1]}`}>
              {(s as any).isCount ? s.value : `${formatOMR(s.value as number)}`}
            </div>
            <div className="text-xs text-gray-400 font-medium mt-0.5">
              {(s as any).isCount ? '' : 'OMR · '}{s.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Form (col 5) ──────────────────────────────────────────── */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Form Header */}
            <div className="bg-gradient-to-r from-brand-dark to-red-800 p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 className="font-bold">{t('accountant.recordNewExpense')}</h3>
                  <p className="text-xs text-red-200 mt-0.5">{isAr ? 'يتم الحفظ فوراً في السجلات المالية' : 'Saved directly to financial records'}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formMsg && (
                <div className={`p-3.5 text-sm rounded-xl flex items-center gap-2.5 border ${
                  formMsg.type === 'ok'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {formMsg.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span className="font-medium">{formMsg.text}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
                  <FileText size={14} className="text-gray-400" />
                  {isAr ? 'عنوان المصروف' : 'Expense Title'} <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder={isAr ? 'مثال: صيانة طابعة المكتب' : 'e.g., Office printer maintenance'}
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className={inputCls}
                />
              </div>

              {/* Category */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
                  <Tag size={14} className="text-gray-400" />
                  {isAr ? 'الفئة' : 'Category'} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    className={`${inputCls} appearance-none pe-9`}
                  >
                    <option value="">{isAr ? '-- اختر الفئة --' : '-- Select category --'}</option>
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{isAr ? c.label_ar : c.label_en}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Amount + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
                    <DollarSign size={14} className="text-gray-400" />
                    {t('accountant.amount')} (OMR) <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.000"
                    value={form.amount}
                    onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
                    <Calendar size={14} className="text-gray-400" />
                    {t('accountant.date')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={form.expense_date}
                    onChange={e => setForm(p => ({ ...p, expense_date: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                  {t('accountant.descriptionCategory')}
                </label>
                <textarea
                  rows={2}
                  placeholder={t('accountant.expenseDescPlaceholder')}
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className={`${inputCls} resize-none`}
                />
              </div>

              {/* Receipt Upload */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
                  <Paperclip size={14} className="text-gray-400" />
                  {isAr ? 'إرفاق الإيصال (اختياري)' : 'Attach Receipt (optional)'}
                </label>
                <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-brand-dark/40 hover:bg-red-50/30 transition-colors">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={e => setReceiptFile(e.target.files?.[0] || null)}
                  />
                  {receiptFile ? (
                    <div className="flex items-center gap-2 text-sm text-brand-dark font-semibold">
                      <Paperclip size={16} />
                      <span className="truncate max-w-[180px]">{receiptFile.name}</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Paperclip size={20} className="mx-auto text-gray-300 mb-1" />
                      <p className="text-xs text-gray-400">{isAr ? 'اسحب الملف هنا أو انقر للاختيار' : 'Drag or click to upload'}</p>
                      <p className="text-[10px] text-gray-300 mt-0.5">PNG, JPG, PDF</p>
                    </div>
                  )}
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-brand-dark hover:bg-red-800 disabled:opacity-60 text-white
                  font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm
                  shadow-md shadow-brand-dark/20"
              >
                {isSubmitting
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Receipt size={17} />{t('accountant.submitExpense')}</>}
              </button>
            </form>
          </div>
        </div>

        {/* ── Recent Expenses List (col 7) ───────────────────────────── */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* List Header + Category Filter */}
            <div className="p-4 border-b border-gray-50 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                  <TrendingDown size={16} className="text-brand-dark" />
                  {isAr ? 'سجل المصروفات' : 'Recent Expenses'}
                </h3>
                <span className="text-xs text-gray-400 font-medium">
                  {isAr ? `إجمالي: ${formatOMR(filtered.reduce((s, e) => s + e.amount, 0))} OMR` : `Total: ${formatOMR(filtered.reduce((s, e) => s + e.amount, 0))} OMR`}
                </span>
              </div>

              {/* Category filter pills */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setFilterCat('all')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all ${filterCat === 'all' ? 'bg-brand-dark text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {isAr ? 'الكل' : 'All'} ({expenses.length})
                </button>
                {CATEGORIES.filter(c => expenses.some(e => e.category === c.value)).map(c => (
                  <button
                    key={c.value}
                    onClick={() => setFilterCat(c.value)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all ${filterCat === c.value ? 'bg-brand-dark text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {isAr ? c.label_ar : c.label_en} ({expenses.filter(e => e.category === c.value).length})
                  </button>
                ))}
              </div>
            </div>

            {loadingList ? (
              <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-brand-dark" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center p-12 text-gray-400">
                <Receipt size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">{isAr ? 'لا توجد مصروفات مسجّلة' : 'No expenses recorded yet'}</p>
                <p className="text-xs mt-1 text-gray-300">{isAr ? 'ابدأ بتسجيل أول مصروف من النموذج' : 'Use the form to log your first expense'}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[540px] overflow-y-auto">
                {filtered.map(exp => (
                  <div key={exp.id} className="flex items-center gap-3 p-4 hover:bg-gray-50/60 transition-colors group">
                    {/* Category dot */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${CAT_COLORS[exp.category] || 'bg-gray-100 text-gray-600'}`}>
                      {getCatLabel(exp.category).charAt(0)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm text-gray-800 truncate">{exp.title}</p>
                        <span className="font-bold text-sm text-gray-800 flex-shrink-0">
                          {formatOMR(exp.amount)} <span className="text-xs text-gray-400 font-normal">OMR</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${CAT_COLORS[exp.category] || 'bg-gray-100 text-gray-600'}`}>
                          {getCatLabel(exp.category)}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(exp.expense_date).toLocaleDateString(isAr ? 'ar-OM' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        {exp.receipt_url && (
                          <a href={exp.receipt_url} target="_blank" rel="noreferrer" className="text-[10px] text-brand-dark font-bold hover:underline flex items-center gap-0.5">
                            <Paperclip size={9} /> {isAr ? 'إيصال' : 'Receipt'}
                          </a>
                        )}
                      </div>
                      {exp.description && (
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">{exp.description}</p>
                      )}
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(exp.id)}
                      disabled={deletingId === exp.id}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      {deletingId === exp.id
                        ? <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                        : <Trash2 size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ExpenseTracking;

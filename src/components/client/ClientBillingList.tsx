import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  FileText, 
  Receipt as ReceiptIcon, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Eye, 
  Printer, 
  DollarSign,
  ShieldCheck,
  Calendar,
  X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';

interface ClientInvoice {
  id: string;
  invoice_number?: string;
  client_id: string;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  status: string; // 'draft' | 'sent' | 'paid' | 'unpaid' | 'overdue' | 'partially_paid'
  due_date?: string;
  created_at: string;
  notes?: string;
}

interface ClientReceipt {
  id: string;
  receipt_number?: string;
  client_id?: string;
  invoice_id?: string;
  amount: number;
  payment_method: string;
  status: string; // 'draft' | 'verified' | 'cancelled'
  verified_at?: string;
  created_at: string;
  notes?: string;
}

interface ClientBillingListProps {
  clientId?: string;
  userId?: string;
}

export const ClientBillingList: React.FC<ClientBillingListProps> = ({ clientId, userId }) => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [receipts, setReceipts] = useState<ClientReceipt[]>([]);
  const [activeTab, setActiveTab] = useState<'invoices' | 'receipts'>('invoices');
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<ClientInvoice | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<ClientReceipt | null>(null);

  useEffect(() => {
    fetchBillingData();
  }, [clientId, userId]);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Invoices
      let invQuery = supabase.from('invoices').select('*').order('created_at', { ascending: false });
      if (clientId) {
        invQuery = invQuery.eq('client_id', clientId);
      } else if (userId) {
        invQuery = invQuery.eq('client_id', userId);
      }
      const { data: invData, error: invErr } = await invQuery;
      if (invErr) throw invErr;

      // 2. Fetch Receipts
      let recQuery = supabase.from('receipts').select('*').order('created_at', { ascending: false });
      if (clientId) {
        recQuery = recQuery.eq('client_id', clientId);
      } else if (userId) {
        recQuery = recQuery.eq('client_id', userId);
      }
      const { data: recData, error: recErr } = await recQuery;
      if (recErr) throw recErr;

      setInvoices(invData || []);
      setReceipts(recData || []);
    } catch (err: any) {
      console.error('Error fetching client billing:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Financial calculations
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
  const totalPaid = receipts
    .filter(r => r.status === 'verified' || r.status === 'paid')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalOutstanding = Math.max(0, totalInvoiced - totalPaid);

  const getInvoiceBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: CheckCircle2, labelEn: 'Paid', labelAr: 'مدفوعة' };
      case 'unpaid':
      case 'sent':
        return { bg: 'bg-amber-50 text-amber-800 border-amber-200', icon: Clock, labelEn: 'Payment Due', labelAr: 'مستحقة الدفع' };
      case 'overdue':
        return { bg: 'bg-red-50 text-red-800 border-red-200', icon: AlertCircle, labelEn: 'Overdue', labelAr: 'متأخرة' };
      case 'draft':
      default:
        return { bg: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock, labelEn: 'Draft', labelAr: 'مسودة' };
    }
  };

  const getReceiptBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'verified':
      case 'paid':
        return { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: ShieldCheck, labelEn: 'Verified by Accounts', labelAr: 'معتمد من الحسابات' };
      case 'draft':
      default:
        return { bg: 'bg-amber-50 text-amber-800 border-amber-200', icon: Clock, labelEn: 'Verification In Progress', labelAr: 'قيد الاعتماد' };
    }
  };

  return (
    <div className="space-y-5">
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm">
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
            {isAr ? 'إجمالي الفواتير' : 'TOTAL INVOICED'}
          </p>
          <p className="text-base sm:text-lg font-black text-gray-900 mt-1">
            {totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-bold text-gray-500">OMR</span>
          </p>
        </div>

        <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200/80 shadow-sm">
          <p className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
            {isAr ? 'المدفوعات المعتمدة' : 'VERIFIED PAID'}
          </p>
          <p className="text-base sm:text-lg font-black text-emerald-900 mt-1">
            {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-bold text-emerald-700">OMR</span>
          </p>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-amber-50/60 rounded-2xl p-4 border border-amber-200/80 shadow-sm">
          <p className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">
            {isAr ? 'الرصيد المستحق' : 'OUTSTANDING'}
          </p>
          <p className="text-base sm:text-lg font-black text-amber-900 mt-1">
            {totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-bold text-amber-700">OMR</span>
          </p>
        </div>
      </div>

      {/* Sub Tabs: Invoices vs Receipts */}
      <div className="flex bg-gray-100 p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            activeTab === 'invoices' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{isAr ? 'الفواتير الضريبية' : 'Tax Invoices'} ({invoices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('receipts')}
          className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            activeTab === 'receipts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <ReceiptIcon className="w-4 h-4" />
          <span>{isAr ? 'سندات القبض' : 'Payment Receipts'} ({receipts.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : activeTab === 'invoices' ? (
        /* ================= INVOICES LIST ================= */
        <div className="space-y-3">
          {invoices.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-gray-200/80 shadow-sm text-gray-400 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-gray-300" />
              <h4 className="font-bold text-gray-700 text-sm">{isAr ? 'لا توجد فواتير صادرة' : 'No tax invoices found'}</h4>
              <p className="text-xs text-gray-400">
                {isAr ? 'ستظهر جميع الفواتير الصادرة لحسابك هنا فور إعدادها' : 'Official VAT compliant invoices will appear here'}
              </p>
            </div>
          ) : (
            invoices.map((inv) => {
              const badge = getInvoiceBadge(inv.status);
              const BadgeIcon = badge.icon;
              const invNum = inv.invoice_number || `INV-${inv.id.substring(0, 8).toUpperCase()}`;

              return (
                <div
                  key={inv.id}
                  className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition-all space-y-3.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-black text-gray-900">
                        {invNum}
                      </span>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(inv.created_at).toLocaleDateString(isAr ? 'ar-OM' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border ${badge.bg}`}>
                      <BadgeIcon className="w-3 h-3" />
                      <span>{isAr ? badge.labelAr : badge.labelEn}</span>
                    </span>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="bg-gray-50 rounded-2xl p-3 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 block">{isAr ? 'قبل الضريبة + ضريبة 5%' : 'Subtotal + 5% VAT'}</span>
                      <span className="font-medium text-gray-600">
                        {(Number(inv.subtotal) || 0).toFixed(2)} + {(Number(inv.vat_amount) || 0).toFixed(2)} OMR
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block">{isAr ? 'الإجمالي الصافي' : 'Total Amount'}</span>
                      <span className="font-black text-base text-gray-900">
                        {(Number(inv.total_amount) || 0).toFixed(2)} OMR
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    {inv.due_date && (
                      <span className="text-[11px] text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{isAr ? 'الاستحقاق:' : 'Due:'} {inv.due_date}</span>
                      </span>
                    )}

                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isAr ? 'معاينة الفاتورة' : 'View Invoice'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ================= RECEIPTS LIST ================= */
        <div className="space-y-3">
          {receipts.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-gray-200/80 shadow-sm text-gray-400 space-y-2">
              <ReceiptIcon className="w-10 h-10 mx-auto text-gray-300" />
              <h4 className="font-bold text-gray-700 text-sm">{isAr ? 'لا توجد سندات قبض' : 'No payment receipts found'}</h4>
              <p className="text-xs text-gray-400">
                {isAr ? 'ستظهر هنا سندات التحصيل المعتمدة من قسم الحسابات فور توثيق السداد' : 'All confirmed receipts will be archived here for your tax records'}
              </p>
            </div>
          ) : (
            receipts.map((rec) => {
              const badge = getReceiptBadge(rec.status);
              const BadgeIcon = badge.icon;
              const recNum = rec.receipt_number || `RCT-${rec.id.substring(0, 8).toUpperCase()}`;

              return (
                <div
                  key={rec.id}
                  className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition-all space-y-3.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-black text-gray-900">
                        {recNum}
                      </span>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(rec.created_at).toLocaleDateString(isAr ? 'ar-OM' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border ${badge.bg}`}>
                      <BadgeIcon className="w-3 h-3" />
                      <span>{isAr ? badge.labelAr : badge.labelEn}</span>
                    </span>
                  </div>

                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-3 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-[10px] text-emerald-600 font-bold block uppercase">{isAr ? 'طريقة السداد' : 'PAYMENT METHOD'}</span>
                      <span className="font-extrabold text-gray-800 uppercase">
                        {rec.payment_method || 'Bank Transfer'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-emerald-600 font-bold block uppercase">{isAr ? 'المبلغ المستلم' : 'AMOUNT PAID'}</span>
                      <span className="font-black text-base text-emerald-900">
                        {(Number(rec.amount) || 0).toFixed(2)} OMR
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => setSelectedReceipt(rec)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isAr ? 'معاينة السند' : 'View Receipt'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-base text-gray-900">{isAr ? 'فاتورة ضريبية رسمية' : 'Official Tax Invoice'}</h3>
                <p className="text-xs font-mono text-gray-500">{selectedInvoice.invoice_number || `INV-${selectedInvoice.id.substring(0, 8)}`}</p>
              </div>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">{isAr ? 'المبلغ الخاضع للضريبة:' : 'Taxable Subtotal:'}</span>
                <span className="font-bold text-gray-800">{(Number(selectedInvoice.subtotal) || 0).toFixed(2)} OMR</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">{isAr ? 'ضريبة القيمة المضافة (5%):' : 'VAT Amount (5%):'}</span>
                <span className="font-bold text-gray-800">{(Number(selectedInvoice.vat_amount) || 0).toFixed(2)} OMR</span>
              </div>

              <div className="flex justify-between py-2 border-b border-gray-200 text-sm font-black text-gray-900 bg-gray-50 p-2 rounded-xl">
                <span>{isAr ? 'الإجمالي الشامل:' : 'Net Total:'}</span>
                <span className="text-brand-dark">{(Number(selectedInvoice.total_amount) || 0).toFixed(2)} OMR</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>{isAr ? 'طباعة / حفظ PDF' : 'Print / Save PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Detail Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-base text-gray-900">{isAr ? 'سند قبض معتمد' : 'Official Payment Receipt'}</h3>
                <p className="text-xs font-mono text-gray-500">{selectedReceipt.receipt_number || `RCT-${selectedReceipt.id.substring(0, 8)}`}</p>
              </div>
              <button 
                onClick={() => setSelectedReceipt(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">{isAr ? 'المبلغ المستلم:' : 'Amount Received:'}</span>
                <span className="font-bold text-emerald-800 text-sm">{(Number(selectedReceipt.amount) || 0).toFixed(2)} OMR</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">{isAr ? 'طريقة السداد:' : 'Payment Method:'}</span>
                <span className="font-bold text-gray-800 uppercase">{selectedReceipt.payment_method || 'Bank Transfer'}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">{isAr ? 'حالة الاعتماد:' : 'Verification:'}</span>
                <span className="font-bold text-emerald-700">{selectedReceipt.status === 'verified' ? (isAr ? 'معتمد رسمياً' : 'Verified') : (isAr ? 'قيد المراجعة' : 'Draft')}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>{isAr ? 'طباعة / حفظ PDF' : 'Print / Save PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientBillingList;

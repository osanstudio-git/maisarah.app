import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calculator, AlertTriangle, CheckCircle2, Clock, Calendar,
  CreditCard, Search, Share2, FileText, ArrowRight, ShieldCheck,
  Scale, AlertCircle, RefreshCw
} from 'lucide-react';
import HandoffModal from '../HandoffModal';

interface IncomeTaxClient {
  id: string;
  client_name: string;
  fy_end_date: string;       // e.g. '2025-12-31'
  return_deadline: string;   // 120 days post FY: '2026-04-30'
  days_remaining: number;
  tax_card_expiry: string;   // e.g. '2026-11-30'
  tax_card_days_left: number;
  pl_prepared: boolean;
  is_zero_filing: boolean;
  return_status: 'draft' | 'under_review' | 'submitted' | 'late';
  objection_active?: boolean;
  objection_days_left?: number; // 60-day window
}

const INITIAL_TAX_CLIENTS: IncomeTaxClient[] = [
  {
    id: 'it1',
    client_name: 'Al Barakah Trading LLC',
    fy_end_date: '2025-12-31',
    return_deadline: '2026-04-30',
    days_remaining: 5,
    tax_card_expiry: '2026-11-30',
    tax_card_days_left: 34,
    pl_prepared: true,
    is_zero_filing: false,
    return_status: 'under_review',
    objection_active: false
  },
  {
    id: 'it2',
    client_name: 'Gulf Horizons Investment',
    fy_end_date: '2025-12-31',
    return_deadline: '2026-04-30',
    days_remaining: 12,
    tax_card_expiry: '2026-05-15',
    tax_card_days_left: 19,
    pl_prepared: true,
    is_zero_filing: false,
    return_status: 'submitted',
    objection_active: true,
    objection_days_left: 28
  },
  {
    id: 'it3',
    client_name: 'Oman Speciality Logistics',
    fy_end_date: '2026-03-31',
    return_deadline: '2026-07-31',
    days_remaining: 95,
    tax_card_expiry: '2027-01-31',
    tax_card_days_left: 279,
    pl_prepared: false,
    is_zero_filing: true,
    return_status: 'draft',
    objection_active: false
  }
];

export const IncomeTaxCockpit: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [clients, setClients] = useState<IncomeTaxClient[]>(INITIAL_TAX_CLIENTS);
  const [searchTerm, setSearchTerm] = useState('');

  // Handoff state
  const [handoffModalOpen, setHandoffModalOpen] = useState(false);
  const [selectedClientForHandoff, setSelectedClientForHandoff] = useState<IncomeTaxClient | null>(null);

  const filteredClients = clients.filter(c =>
    c.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 120-Day Countdown & Tax Card Expiry Radar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Radar Card 1 */}
        <div className="p-5 bg-gradient-to-br from-sky-500 to-blue-700 text-white rounded-3xl shadow-lg shadow-sky-500/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase text-sky-200">
              {isAr ? 'قاعدة 120 يوماً بعد السنة المالية' : '120-Day FY Rule'}
            </span>
            <Clock size={18} className="text-sky-200" />
          </div>
          <h4 className="text-xl font-black mb-1">
            {isAr ? 'مواعيد الإقرارات السنوية' : 'Annual Return Deadlines'}
          </h4>
          <p className="text-xs text-sky-100 font-medium">
            {isAr ? 'يتم احتساب موعد التقديم آلياً وفق تاريخ نهاية السنة المالية لكل شركة' : 'Calculated automatically based on each company fiscal year end'}
          </p>
        </div>

        {/* Radar Card 2: Tax Card Expiries */}
        <div className="p-5 bg-gradient-to-br from-indigo-500 to-indigo-800 text-white rounded-3xl shadow-lg shadow-indigo-500/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase text-indigo-200">
              {isAr ? 'رادار البطاقات الضريبية' : 'Tax Card Radar'}
            </span>
            <CreditCard size={18} className="text-indigo-200" />
          </div>
          <h4 className="text-xl font-black mb-1">
            {isAr ? '2 بطاقات بحاجة للتجديد' : '2 Cards Due for Renewal'}
          </h4>
          <p className="text-xs text-indigo-100 font-medium">
            {isAr ? 'تنبيه استباقي قبل 30 و 15 يوماً من انتهاء صلاحية البطاقة' : 'Proactive alerts at 30 and 15 days before tax card expiration'}
          </p>
        </div>

        {/* Radar Card 3: Objections */}
        <div className="p-5 bg-gradient-to-br from-amber-500 to-orange-700 text-white rounded-3xl shadow-lg shadow-amber-500/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase text-amber-200">
              {isAr ? 'مهلة الاعتراضات (60 يوماً)' : 'Tax Objection Window'}
            </span>
            <Scale size={18} className="text-amber-200" />
          </div>
          <h4 className="text-xl font-black mb-1">
            {isAr ? 'قضية اعتراض نشطة' : '1 Active Objection'}
          </h4>
          <p className="text-xs text-amber-100 font-medium">
            {isAr ? 'متبقي 28 يوماً لتقديم المذكرات القانونية لجهاز الضرائب' : '28 days remaining to submit formal objection memoranda'}
          </p>
        </div>
      </div>

      {/* Main Income Tax Clients Grid */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h4 className="font-black text-sm text-gray-900">
              {isAr ? 'سجل إقرارات ضريبة الدخل والبطاقات الضريبية' : 'Income Tax Returns & Tax Cards Register'}
            </h4>
            <p className="text-[11px] text-gray-500">
              {isAr ? 'متابعة حساب الأرباح والخسائر، مهلة الـ 120 يوماً، وتجديدات البطاقات' : 'P&L prep, 120-day countdowns, and renewal schedules'}
            </p>
          </div>

          <div className="relative">
            <Search className={`absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-gray-400`} size={14} />
            <input
              type="text"
              placeholder={isAr ? 'بحث بالعميل...' : 'Search client...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`py-2 ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-sky-500`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-gray-100">
              <tr>
                <th className="py-3 px-4">{isAr ? 'اسم العميل' : 'Client Name'}</th>
                <th className="py-3 px-3">{isAr ? 'نهاية السنة المالية' : 'FY End Date'}</th>
                <th className="py-3 px-3">{isAr ? 'الموعد (120 يوماً)' : '120-Day Deadline'}</th>
                <th className="py-3 px-3 text-center">{isAr ? 'حساب الأرباح والخسائر' : 'P&L Prepared'}</th>
                <th className="py-3 px-3 text-center">{isAr ? 'حالة الإقرار' : 'Return Status'}</th>
                <th className="py-3 px-3 text-center">{isAr ? 'البطاقة الضريبية' : 'Tax Card'}</th>
                <th className="py-3 px-4 text-center">{isAr ? 'إجراءات وربط' : 'Actions & Handoff'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClients.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-gray-900">
                    <div>{c.client_name}</div>
                    {c.is_zero_filing && (
                      <span className="text-[10px] text-sky-600 font-bold">
                        {isAr ? 'إقرار صفري (0 Filing)' : 'Zero Filing'}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-gray-600">
                    {c.fy_end_date}
                  </td>
                  <td className="py-3.5 px-3 font-mono font-bold text-gray-800">
                    <div>{c.return_deadline}</div>
                    <span className={`text-[10px] font-bold ${
                      c.days_remaining <= 7 ? 'text-rose-600' : 'text-sky-600'
                    }`}>
                      {isAr ? `متبقي ${c.days_remaining} يوم` : `${c.days_remaining}d left`}
                    </span>
                  </td>

                  {/* P&L Prepared Status */}
                  <td className="py-3.5 px-3 text-center">
                    {c.pl_prepared ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {isAr ? 'جاهز' : 'Ready'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {isAr ? 'قيد التجهيز' : 'In Prep'}
                      </span>
                    )}
                  </td>

                  {/* Return Status */}
                  <td className="py-3.5 px-3 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      c.return_status === 'submitted'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : c.return_status === 'under_review'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {c.return_status}
                    </span>
                  </td>

                  {/* Tax Card Expiry */}
                  <td className="py-3.5 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                      c.tax_card_days_left <= 30
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {c.tax_card_expiry}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClientForHandoff(c);
                        setHandoffModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-sky-50 hover:text-sky-700 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1 mx-auto transition-all cursor-pointer border border-gray-200"
                    >
                      <Share2 size={12} />
                      <span>{isAr ? 'تحويل' : 'Handoff'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Handoff Modal */}
      {selectedClientForHandoff && (
        <HandoffModal
          isOpen={handoffModalOpen}
          onClose={() => setHandoffModalOpen(false)}
          sourceDeptId="income_tax"
          clientName={selectedClientForHandoff.client_name}
          clientId={selectedClientForHandoff.id}
          serviceName="Annual Income Tax Return"
        />
      )}
    </div>
  );
};

export default IncomeTaxCockpit;

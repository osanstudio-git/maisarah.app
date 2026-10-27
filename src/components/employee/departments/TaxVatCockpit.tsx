import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar, AlertTriangle, CheckCircle2, Clock, FileText,
  Search, Filter, ShieldCheck, Share2, AlertCircle, ArrowUpRight,
  Receipt, Download, Plus, Check, RefreshCw
} from 'lucide-react';
import HandoffModal from '../HandoffModal';

interface ClientVatRecord {
  id: string;
  client_name: string;
  vat_number: string;
  q1_status: 'filed' | 'pending' | 'review' | 'overdue';
  q2_status: 'filed' | 'pending' | 'review' | 'overdue';
  q3_status: 'filed' | 'pending' | 'review' | 'overdue';
  q4_status: 'filed' | 'pending' | 'review' | 'overdue';
  books_cleared: boolean; // Cleared by bookkeeping
  tax_card_expiry: string;
  pending_notices: number;
}

const MOCK_VAT_CLIENTS: ClientVatRecord[] = [
  {
    id: 'c1',
    client_name: 'Al Barakah Trading LLC',
    vat_number: 'OM1002345678',
    q1_status: 'filed',
    q2_status: 'review',
    q3_status: 'pending',
    q4_status: 'pending',
    books_cleared: true,
    tax_card_expiry: '2026-12-31',
    pending_notices: 0
  },
  {
    id: 'c2',
    client_name: 'Sohar Logistics Group',
    vat_number: 'OM1009876543',
    q1_status: 'filed',
    q2_status: 'overdue',
    q3_status: 'pending',
    q4_status: 'pending',
    books_cleared: false,
    tax_card_expiry: '2026-08-15',
    pending_notices: 2
  },
  {
    id: 'c3',
    client_name: 'Muscat Tech Solutions',
    vat_number: 'OM1004561234',
    q1_status: 'filed',
    q2_status: 'filed',
    q3_status: 'review',
    q4_status: 'pending',
    books_cleared: true,
    tax_card_expiry: '2027-03-31',
    pending_notices: 0
  },
  {
    id: 'c4',
    client_name: 'Batinah Industrial Co.',
    vat_number: 'OM1007894561',
    q1_status: 'review',
    q2_status: 'pending',
    q3_status: 'pending',
    q4_status: 'pending',
    books_cleared: false,
    tax_card_expiry: '2026-06-30',
    pending_notices: 1
  }
];

export const TaxVatCockpit: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [clients, setClients] = useState<ClientVatRecord[]>(MOCK_VAT_CLIENTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState<'all' | 'q1' | 'q2' | 'q3' | 'q4'>('q2');

  // Handoff Modal state
  const [handoffModalOpen, setHandoffModalOpen] = useState(false);
  const [selectedClientForHandoff, setSelectedClientForHandoff] = useState<ClientVatRecord | null>(null);

  const filteredClients = clients.filter(c =>
    c.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.vat_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: 'filed' | 'pending' | 'review' | 'overdue') => {
    switch (status) {
      case 'filed':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
            <CheckCircle2 size={11} />
            <span>{isAr ? 'تم التقديم' : 'Filed'}</span>
          </span>
        );
      case 'review':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-fit">
            <Clock size={11} />
            <span>{isAr ? 'مراجعة العميل' : 'Review'}</span>
          </span>
        );
      case 'overdue':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-fit animate-pulse">
            <AlertTriangle size={11} />
            <span>{isAr ? 'خطر غرامة' : 'Penalty Risk'}</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200 w-fit">
            {isAr ? 'قيد الانتظار' : 'Pending'}
          </span>
        );
    }
  };

  const toggleQuarterStatus = (clientId: string, quarter: 'q1' | 'q2' | 'q3' | 'q4') => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const key = `${quarter}_status` as const;
      const current = c[key];
      const next = current === 'pending' ? 'review' : current === 'review' ? 'filed' : 'pending';
      return { ...c, [key]: next };
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Quarterly Deadlines Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { q: 'Q1 (Jan–Mar)', deadline: '30 Apr', status: 'closed', desc: isAr ? 'مكتمل ومعتمد' : 'Cycle Closed' },
          { q: 'Q2 (Apr–Jun)', deadline: '31 Jul', status: 'active', desc: isAr ? 'دورة الإقرار الحالية' : 'Active Filing Cycle', urgent: true },
          { q: 'Q3 (Jul–Sep)', deadline: '31 Oct', status: 'upcoming', desc: isAr ? 'الإقرار القادم' : 'Upcoming' },
          { q: 'Q4 (Oct–Dec)', deadline: '31 Jan', status: 'upcoming', desc: isAr ? 'إغلاق نهاية السنة' : 'Year-end Closing' }
        ].map((item, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-2xl border transition-all ${
              item.urgent
                ? 'bg-gradient-to-br from-indigo-50/80 to-purple-50/50 border-indigo-200 ring-2 ring-indigo-200/50 shadow-md'
                : 'bg-white border-gray-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-gray-900">{item.q}</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black bg-indigo-100 text-indigo-800">
                {item.deadline}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* KPI & Penalty Warnings Alert */}
      <div className="p-4 bg-gradient-to-r from-rose-500 to-red-600 rounded-2xl text-white shadow-lg shadow-rose-500/20 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} className="text-white" />
          </div>
          <div>
            <h4 className="font-black text-sm">
              {isAr ? 'رادار متابعة الغرامات الضريبية (Penalty Prevention Radar)' : 'Tax Penalty Prevention Radar'}
            </h4>
            <p className="text-xs text-rose-100 font-medium">
              {isAr 
                ? 'تنبيه: عميل واحد تجاوز موعد تسليم فواتير Q2، وعميلان بحاجة لمطابقة مسك الدفاتر' 
                : 'Alert: 1 client at risk for Q2 filing deadline. 2 clients awaiting Bookkeeping clearance.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-white text-rose-700 font-black text-xs shadow-sm">
            {isAr ? '98.5% نسبة الالتزام' : '98.5% On-Time Rate'}
          </span>
        </div>
      </div>

      {/* Interactive VAT Client Grid */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Receipt size={18} />
            </div>
            <div>
              <h3 className="font-black text-sm text-gray-900">
                {isAr ? 'مصفوفة إقرارات ضريبة القيمة المضافة لجميع العملاء' : 'Quarterly VAT Client Filing Matrix'}
              </h3>
              <p className="text-[11px] text-gray-500">
                {isAr ? 'انقر على حالة الإقرار لتغييرها فورياً أو تحويل المعاملة' : 'Click any quarter status to toggle state or trigger handoff'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className={`absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-gray-400`} size={14} />
              <input
                type="text"
                placeholder={isAr ? 'بحث بالعميل أو الرقم الضريبي...' : 'Search client or VAT #...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`py-2 ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-500`}
              />
            </div>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-gray-100">
              <tr>
                <th className="py-3 px-4">{isAr ? 'اسم العميل' : 'Client Name'}</th>
                <th className="py-3 px-4">{isAr ? 'الرقم الضريبي' : 'VAT Number'}</th>
                <th className="py-3 px-4">{isAr ? 'اعتماد مسك الدفاتر' : 'Bookkeeping Clearance'}</th>
                <th className="py-3 px-3 text-center">Q1 (30 Apr)</th>
                <th className="py-3 px-3 text-center bg-indigo-50/40 text-indigo-900">Q2 (31 Jul)</th>
                <th className="py-3 px-3 text-center">Q3 (31 Oct)</th>
                <th className="py-3 px-3 text-center">Q4 (31 Jan)</th>
                <th className="py-3 px-4 text-center">{isAr ? 'إجراءات وربط' : 'Actions & Handoff'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClients.map(client => (
                <tr key={client.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-gray-900">
                    {client.client_name}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-gray-500 text-[11px]">
                    {client.vat_number}
                  </td>
                  <td className="py-3.5 px-4">
                    {client.books_cleared ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                        <CheckCircle2 size={11} />
                        <span>{isAr ? 'دفاتر جاهزة' : 'Books Ready'}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-fit">
                        <Clock size={11} />
                        <span>{isAr ? 'بانتظار المحاسبة' : 'Pending Books'}</span>
                      </span>
                    )}
                  </td>

                  {/* Quarters (Clickable) */}
                  <td className="py-3.5 px-3 text-center">
                    <button onClick={() => toggleQuarterStatus(client.id, 'q1')} className="cursor-pointer">
                      {getStatusBadge(client.q1_status)}
                    </button>
                  </td>
                  <td className="py-3.5 px-3 text-center bg-indigo-50/20">
                    <button onClick={() => toggleQuarterStatus(client.id, 'q2')} className="cursor-pointer">
                      {getStatusBadge(client.q2_status)}
                    </button>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <button onClick={() => toggleQuarterStatus(client.id, 'q3')} className="cursor-pointer">
                      {getStatusBadge(client.q3_status)}
                    </button>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <button onClick={() => toggleQuarterStatus(client.id, 'q4')} className="cursor-pointer">
                      {getStatusBadge(client.q4_status)}
                    </button>
                  </td>

                  {/* Optional Cross-Portal Handoff */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClientForHandoff(client);
                        setHandoffModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 rounded-xl text-[11px] font-bold flex items-center gap-1 mx-auto transition-all cursor-pointer border border-gray-200"
                      title={isAr ? 'تحويل المعاملة لقسم آخر (مثل التصفية أو الإدارة)' : 'Optional handoff to another department'}
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
          sourceDeptId="tax_vat"
          clientName={selectedClientForHandoff.client_name}
          clientId={selectedClientForHandoff.id}
          serviceName="VAT Q2 Return Filing"
        />
      )}
    </div>
  );
};

export default TaxVatCockpit;

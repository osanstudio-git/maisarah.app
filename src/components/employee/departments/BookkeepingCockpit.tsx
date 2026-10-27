import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar, CheckCircle2, Clock, FileText, Search, Share2,
  Check, AlertCircle, BookOpen, ArrowRight, BarChart2,
  Landmark, RefreshCw, Send, CheckSquare, Square
} from 'lucide-react';
import HandoffModal from '../HandoffModal';

interface BookkeepingClient {
  id: string;
  client_name: string;
  month: string;
  step1_statements: boolean;   // By 5th
  step2_transactions: boolean; // By 10th
  step3_reconciliation: boolean; // By 15th
  step4_report: boolean;       // By 20th
  step5_delivery: boolean;     // By 25th
  reconciliation_rate: number; // e.g. 96%
  handoff_status?: 'pending' | 'sent' | 'none';
}

const INITIAL_BOOKKEEPING_CLIENTS: BookkeepingClient[] = [
  {
    id: 'b1',
    client_name: 'Al Barakah Trading LLC',
    month: 'October 2026',
    step1_statements: true,
    step2_transactions: true,
    step3_reconciliation: true,
    step4_report: true,
    step5_delivery: false,
    reconciliation_rate: 100,
    handoff_status: 'none'
  },
  {
    id: 'b2',
    client_name: 'Sohar Logistics Group',
    month: 'October 2026',
    step1_statements: true,
    step2_transactions: true,
    step3_reconciliation: false,
    step4_report: false,
    step5_delivery: false,
    reconciliation_rate: 74,
    handoff_status: 'none'
  },
  {
    id: 'b3',
    client_name: 'Muscat Tech Solutions',
    month: 'October 2026',
    step1_statements: true,
    step2_transactions: true,
    step3_reconciliation: true,
    step4_report: true,
    step5_delivery: true,
    reconciliation_rate: 100,
    handoff_status: 'sent'
  },
  {
    id: 'b4',
    client_name: 'Batinah Industrial Co.',
    month: 'October 2026',
    step1_statements: false,
    step2_transactions: false,
    step3_reconciliation: false,
    step4_report: false,
    step5_delivery: false,
    reconciliation_rate: 0,
    handoff_status: 'none'
  }
];

export const BookkeepingCockpit: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [clients, setClients] = useState<BookkeepingClient[]>(INITIAL_BOOKKEEPING_CLIENTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('October 2026');

  // Handoff state
  const [handoffModalOpen, setHandoffModalOpen] = useState(false);
  const [selectedClientForHandoff, setSelectedClientForHandoff] = useState<BookkeepingClient | null>(null);

  const toggleStep = (clientId: string, stepKey: keyof BookkeepingClient) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const currentVal = !!c[stepKey];
      return { ...c, [stepKey]: !currentVal };
    }));
  };

  const filteredClients = clients.filter(c =>
    c.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 5-Step Milestone Roadmap Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-5 shadow-lg shadow-emerald-600/20">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-bold">
              <BookOpen size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm">
                {isAr ? 'خارطة دورة الإغلاق المالي الشهري (5 إلى 25 من كل شهر)' : 'Monthly Financial Closure Cycle (5th to 25th)'}
              </h3>
              <p className="text-xs text-emerald-100 font-medium">
                {isAr ? 'متابعة الخطوات الخمس الإلزامية لكل عميل لضمان جاهزية الدفاتر' : 'Strict 5-step milestone cadence ensuring client financial readiness'}
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-xl bg-white text-emerald-800 text-xs font-black shadow-sm">
            {selectedMonth}
          </span>
        </div>

        {/* 5 Steps Indicator */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2 border-t border-white/20 text-center">
          {[
            { step: '1', date: isAr ? 'بحلول 5' : 'By 5th', title: isAr ? 'كشوفات البنوك' : 'Bank Statements' },
            { step: '2', date: isAr ? 'بحلول 10' : 'By 10th', title: isAr ? 'تسجيل العمليات' : 'Transactions Recorded' },
            { step: '3', date: isAr ? 'بحلول 15' : 'By 15th', title: isAr ? 'التسوية البنكية' : 'Reconciliation Done' },
            { step: '4', date: isAr ? 'بحلول 20' : 'By 20th', title: isAr ? 'استخراج التقرير' : 'Report Generated' },
            { step: '5', date: isAr ? 'بحلول 25' : 'By 25th', title: isAr ? 'تسليم العميل' : 'Client Delivery' }
          ].map((s, idx) => (
            <div key={idx} className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs text-xs">
              <span className="font-mono text-[10px] font-black uppercase text-emerald-200 block">
                {s.date}
              </span>
              <span className="font-bold text-white text-[11px] block mt-0.5">
                {s.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Checklist Matrix */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Controls */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h4 className="font-black text-sm text-gray-900">
              {isAr ? 'جدول الإغلاقات الشهرية لعملاء مسك الدفاتر' : 'Monthly Client Closure Checklist Grid'}
            </h4>
            <p className="text-[11px] text-gray-500">
              {isAr ? 'انقر على أي خطوة للتأشير عليها بالإنجاز فورياً' : 'Click any milestone box to update real-time closure status'}
            </p>
          </div>

          <div className="relative">
            <Search className={`absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-gray-400`} size={14} />
            <input
              type="text"
              placeholder={isAr ? 'بحث بالعميل...' : 'Search client...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`py-2 ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-emerald-500`}
            />
          </div>
        </div>

        {/* Grid Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-gray-100">
              <tr>
                <th className="py-3 px-4">{isAr ? 'اسم العميل' : 'Client Name'}</th>
                <th className="py-3 px-3 text-center">{isAr ? '1. كشوفات (5)' : '1. Statements (5th)'}</th>
                <th className="py-3 px-3 text-center">{isAr ? '2. تسجيل (10)' : '2. Recorded (10th)'}</th>
                <th className="py-3 px-3 text-center">{isAr ? '3. تسوية (15)' : '3. Reconciled (15th)'}</th>
                <th className="py-3 px-3 text-center">{isAr ? '4. تقرير (20)' : '4. Report (20th)'}</th>
                <th className="py-3 px-3 text-center">{isAr ? '5. تسليم (25)' : '5. Delivery (25th)'}</th>
                <th className="py-3 px-4 text-center">{isAr ? 'دقة المطابقة' : 'Reconciliation'}</th>
                <th className="py-3 px-4 text-center">{isAr ? 'الربط بقسم الضرائب' : 'Tax & VAT Handoff'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClients.map(c => {
                const isFullyClosed = c.step1_statements && c.step2_transactions && c.step3_reconciliation && c.step4_report;
                return (
                  <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      {c.client_name}
                    </td>

                    {/* Checkbox 1 */}
                    <td className="py-3.5 px-3 text-center">
                      <button 
                        onClick={() => toggleStep(c.id, 'step1_statements')} 
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          c.step1_statements ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {c.step1_statements ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </td>

                    {/* Checkbox 2 */}
                    <td className="py-3.5 px-3 text-center">
                      <button 
                        onClick={() => toggleStep(c.id, 'step2_transactions')} 
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          c.step2_transactions ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {c.step2_transactions ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </td>

                    {/* Checkbox 3 */}
                    <td className="py-3.5 px-3 text-center">
                      <button 
                        onClick={() => toggleStep(c.id, 'step3_reconciliation')} 
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          c.step3_reconciliation ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {c.step3_reconciliation ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </td>

                    {/* Checkbox 4 */}
                    <td className="py-3.5 px-3 text-center">
                      <button 
                        onClick={() => toggleStep(c.id, 'step4_report')} 
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          c.step4_report ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {c.step4_report ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </td>

                    {/* Checkbox 5 */}
                    <td className="py-3.5 px-3 text-center">
                      <button 
                        onClick={() => toggleStep(c.id, 'step5_delivery')} 
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          c.step5_delivery ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {c.step5_delivery ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </td>

                    {/* Reconciliation Rate Progress */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              c.reconciliation_rate >= 90 ? 'bg-emerald-500' : c.reconciliation_rate > 50 ? 'bg-amber-400' : 'bg-rose-400'
                            }`}
                            style={{ width: `${c.reconciliation_rate}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] font-bold text-gray-700">
                          {c.reconciliation_rate}%
                        </span>
                      </div>
                    </td>

                    {/* 1-Click Handoff to Tax & VAT */}
                    <td className="py-3.5 px-4 text-center">
                      {c.handoff_status === 'sent' ? (
                        <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 mx-auto w-fit">
                          <CheckCircle2 size={11} />
                          <span>{isAr ? 'تم التحويل للضرائب' : 'Sent to Tax'}</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClientForHandoff(c);
                            setHandoffModalOpen(true);
                          }}
                          disabled={!isFullyClosed}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 mx-auto transition-all cursor-pointer border ${
                            isFullyClosed
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                              : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                          }`}
                          title={isFullyClosed ? 'Pass closed books to Tax team' : 'Complete steps 1-4 first'}
                        >
                          <Share2 size={12} />
                          <span>{isAr ? 'تحويل للضرائب' : 'Handoff to Tax'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Handoff Modal */}
      {selectedClientForHandoff && (
        <HandoffModal
          isOpen={handoffModalOpen}
          onClose={() => setHandoffModalOpen(false)}
          sourceDeptId="bookkeeping"
          clientName={selectedClientForHandoff.client_name}
          clientId={selectedClientForHandoff.id}
          serviceName={`Monthly Bookkeeping Closure (${selectedClientForHandoff.month})`}
          onSuccess={() => {
            setClients(prev => prev.map(c => c.id === selectedClientForHandoff.id ? { ...c, handoff_status: 'sent' } : c));
          }}
        />
      )}
    </div>
  );
};

export default BookkeepingCockpit;

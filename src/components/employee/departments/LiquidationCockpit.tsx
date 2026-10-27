import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2, AlertOctagon, CheckCircle2, Clock, Share2,
  ChevronRight, Search, ShieldAlert, Landmark, FileText, Check
} from 'lucide-react';
import HandoffModal from '../HandoffModal';

interface LiquidationCase {
  id: string;
  company_name: string;
  cr_number: string;
  current_stage: number; // 1 to 5
  liquidator_name: string;
  days_in_process: number;
  is_blocked: boolean;
  blocked_reason?: string;
  tax_cleared: boolean;
  gosi_cleared: boolean;
  moc_approved: boolean;
}

const LIQUIDATION_STAGES = [
  { step: 1, name_en: 'Engagement & Appointment', name_ar: 'التعاقد وتعيين المصفي', time: 'Day 1' },
  { step: 2, name_en: 'Tax Clearance (ZATCA / OTA)', name_ar: 'براءة ذمة الضرائب والدخل', time: '2-6 wks' },
  { step: 3, name_en: 'GOSI & Labour Clearance', name_ar: 'براءة ذمة التأمينات ومكتب العمل', time: '2-4 wks' },
  { step: 4, name_en: 'Ministry of Commerce', name_ar: 'إجراءات وزارة التجارة والصناعة', time: 'Varies' },
  { step: 5, name_en: 'CR Cancellation Confirmed', name_ar: 'شطب السجل التجاري نهائياً', time: 'Final' }
];

const INITIAL_CASES: LiquidationCase[] = [
  {
    id: 'l1',
    company_name: 'Al Shamal Contracting LLC',
    cr_number: 'CR-1049281',
    current_stage: 2,
    liquidator_name: 'Corporate Officer (Salim)',
    days_in_process: 24,
    is_blocked: true,
    blocked_reason: 'بانتظار تدقيق فحص الضرائب لعام 2024 / Awaiting Tax Audit Clearance',
    tax_cleared: false,
    gosi_cleared: true,
    moc_approved: false
  },
  {
    id: 'l2',
    company_name: 'Nizwa Gulf Import & Export',
    cr_number: 'CR-1082739',
    current_stage: 3,
    liquidator_name: 'Service Head',
    days_in_process: 42,
    is_blocked: false,
    tax_cleared: true,
    gosi_cleared: false,
    moc_approved: false
  },
  {
    id: 'l3',
    company_name: 'Al Safa Restaurant Management',
    cr_number: 'CR-1029384',
    current_stage: 4,
    liquidator_name: 'PRO Specialist (Hamad)',
    days_in_process: 65,
    is_blocked: false,
    tax_cleared: true,
    gosi_cleared: true,
    moc_approved: false
  }
];

export const LiquidationCockpit: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [cases, setCases] = useState<LiquidationCase[]>(INITIAL_CASES);
  const [searchTerm, setSearchTerm] = useState('');

  // Handoff state
  const [handoffModalOpen, setHandoffModalOpen] = useState(false);
  const [selectedCaseForHandoff, setSelectedCaseForHandoff] = useState<LiquidationCase | null>(null);

  const advanceStage = (id: string) => {
    setCases(prev => prev.map(c => {
      if (c.id !== id) return c;
      const next = Math.min(5, c.current_stage + 1);
      return { ...c, current_stage: next, is_blocked: false };
    }));
  };

  const filteredCases = cases.filter(c =>
    c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cr_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 5 Government Clearance Stages Banner */}
      <div className="bg-gradient-to-r from-rose-600 to-pink-700 text-white rounded-3xl p-5 shadow-lg shadow-rose-600/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-bold">
            <Building2 size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-black text-sm">
              {isAr ? 'مسار إجراءات تصفية الشركات وشطب السجلات التجارية' : 'Corporate Liquidation & CR Cancellation Pipeline'}
            </h3>
            <p className="text-xs text-rose-100 font-medium">
              {isAr ? 'تسلسل براءات الذمة الحكومية: الضرائب ➔ التأمينات ➔ التجارة والصناعة ➔ الشطب النهائي' : 'Govt clearances sequential workflow: Tax ➔ GOSI ➔ Ministry of Commerce ➔ Final Cancellation'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-white/20">
          {LIQUIDATION_STAGES.map((s) => (
            <div key={s.step} className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs text-center">
              <span className="text-[10px] font-black uppercase text-rose-200 block">
                Stage {s.step} • {s.time}
              </span>
              <span className="font-bold text-white text-[11px] block mt-0.5">
                {isAr ? s.name_ar : s.name_en}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Blocked Cases Alert Radar */}
      {cases.some(c => c.is_blocked) && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
              <AlertOctagon size={18} />
            </div>
            <div>
              <h5 className="font-black text-xs text-rose-900">
                {isAr ? 'تنبيه: توجد ملفات تصفية متوقفة بحاجة لمتابعة حكومية' : 'Blocked Cases Escalation Radar'}
              </h5>
              <p className="text-[11px] text-rose-700">
                {isAr ? 'ملف شركة الشمال للمقاولات متوقف عند براءة ذمة الضرائب منذ 14 يوماً' : 'Al Shamal Contracting is blocked at Tax Authority clearance stage.'}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-rose-600 text-white font-black text-xs rounded-xl shadow-xs">
            {isAr ? 'مطلوب تصعيد' : 'Action Needed'}
          </span>
        </div>
      )}

      {/* Cases Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h4 className="font-black text-sm text-gray-900">
              {isAr ? 'قضايا وملفات التصفية النشطة' : 'Active Liquidation Cases'}
            </h4>
            <p className="text-[11px] text-gray-500">
              {isAr ? 'متابعة براءات الذمة والتحويل بين الأقسام' : 'Monitor clearance progress and trigger inter-dept handoffs'}
            </p>
          </div>

          <div className="relative">
            <Search className={`absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-gray-400`} size={14} />
            <input
              type="text"
              placeholder={isAr ? 'بحث بالشركة أو رقم السجل...' : 'Search company or CR #...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`py-2 ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-rose-500`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCases.map(item => (
            <div
              key={item.id}
              className={`p-5 bg-white rounded-3xl border shadow-sm transition-all space-y-4 ${
                item.is_blocked ? 'border-rose-300 ring-2 ring-rose-100' : 'border-gray-200 hover:border-rose-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h5 className="font-black text-sm text-gray-900">{item.company_name}</h5>
                  <span className="text-xs font-mono font-bold text-gray-500">{item.cr_number}</span>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                    {item.liquidator_name} • {item.days_in_process} days elapsed
                  </p>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                  item.is_blocked 
                    ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  Stage {item.current_stage}/5
                </span>
              </div>

              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold text-gray-600">
                  <span>{isAr ? 'المرحلة:' : 'Stage:'} {isAr ? LIQUIDATION_STAGES[item.current_stage - 1].name_ar : LIQUIDATION_STAGES[item.current_stage - 1].name_en}</span>
                  <span className="text-rose-600 font-mono">{Math.round((item.current_stage / 5) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden flex">
                  {[1, 2, 3, 4, 5].map(st => (
                    <div
                      key={st}
                      className={`h-full border-r border-white flex-1 transition-all ${
                        st <= item.current_stage ? 'bg-rose-500' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Blocked Reason notice */}
              {item.is_blocked && (
                <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-800 font-bold flex items-center gap-2">
                  <AlertOctagon size={14} className="shrink-0" />
                  <span>{item.blocked_reason}</span>
                </div>
              )}

              {/* Clearances Checklist */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className={`p-2 rounded-xl text-[10px] font-black border ${
                  item.tax_cleared ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                }`}>
                  {isAr ? 'براءة الضرائب' : 'Tax Clearance'}
                </div>
                <div className={`p-2 rounded-xl text-[10px] font-black border ${
                  item.gosi_cleared ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                }`}>
                  {isAr ? 'براءة التأمينات' : 'GOSI Clearance'}
                </div>
                <div className={`p-2 rounded-xl text-[10px] font-black border ${
                  item.moc_approved ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                }`}>
                  {isAr ? 'موافقة التجارة' : 'MOC Approval'}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCaseForHandoff(item);
                    setHandoffModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-rose-50 hover:text-rose-700 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border border-gray-200"
                >
                  <Share2 size={12} />
                  <span>{isAr ? 'طلب براءة ذمة' : 'Request Clearance'}</span>
                </button>

                {item.current_stage < 5 ? (
                  <button
                    type="button"
                    onClick={() => advanceStage(item.id)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <span>{isAr ? 'المرحلة التالية' : 'Next Stage'}</span>
                    <ChevronRight size={14} className={isAr ? 'rotate-180' : ''} />
                  </button>
                ) : (
                  <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black flex items-center gap-1">
                    <CheckCircle2 size={14} />
                    <span>{isAr ? 'تم شطب السجل نهائياً' : 'CR Cancelled'}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Handoff Modal */}
      {selectedCaseForHandoff && (
        <HandoffModal
          isOpen={handoffModalOpen}
          onClose={() => setHandoffModalOpen(false)}
          sourceDeptId="liquidation"
          clientName={selectedCaseForHandoff.company_name}
          clientId={selectedCaseForHandoff.id}
          serviceName="Tax & Final Accounts Clearance for Liquidation"
        />
      )}
    </div>
  );
};

export default LiquidationCockpit;

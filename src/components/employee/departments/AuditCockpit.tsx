import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileCheck, Shield, Clock, CheckCircle2, ChevronRight,
  AlertTriangle, Search, Filter, Share2, Upload, FileText,
  UserCheck, ArrowRight, Eye, Check
} from 'lucide-react';
import HandoffModal from '../HandoffModal';

interface AuditEngagement {
  id: string;
  client_name: string;
  audit_type: string; // e.g. Statutory Audit, Internal Audit
  fy_period: string;  // e.g. FY 2025-2026
  current_stage: number; // 1 to 6
  lead_auditor: string;
  docs_collected: number; // e.g. 8 of 10
  docs_total: number;
  manager_signoff: boolean;
  status: 'on_track' | 'review' | 'delayed' | 'completed';
}

const AUDIT_STAGES = [
  { step: 1, name_en: 'Engagement Letter', name_ar: 'توقيع خطاب الارتباط', tag: 'Start' },
  { step: 2, name_en: 'Doc Collection', name_ar: 'تجميع الوثائق', tag: 'Ongoing' },
  { step: 3, name_en: 'Fieldwork', name_ar: 'التدقيق الميداني', tag: '2-4 wks' },
  { step: 4, name_en: 'Draft Report', name_ar: 'مسودة التقرير', tag: 'Review' },
  { step: 5, name_en: 'Manager Approval', name_ar: 'اعتماد مدير التدقيق', tag: 'Sign-off' },
  { step: 6, name_en: 'Client Delivery', name_ar: 'التسليم للعميل', tag: 'Done' }
];

const INITIAL_AUDITS: AuditEngagement[] = [
  {
    id: 'a1',
    client_name: 'Al Barakah Contracting LLC',
    audit_type: 'Statutory Audit (تدقيق قانوني)',
    fy_period: 'FY 2025',
    current_stage: 3,
    lead_auditor: 'Senior Auditor (Sami)',
    docs_collected: 10,
    docs_total: 10,
    manager_signoff: false,
    status: 'on_track'
  },
  {
    id: 'a2',
    client_name: 'Sohar Logistics Group',
    audit_type: 'Financial Statements Audit (قوائم مالية)',
    fy_period: 'FY 2025',
    current_stage: 4,
    lead_auditor: 'Auditor (Ahmed)',
    docs_collected: 9,
    docs_total: 10,
    manager_signoff: false,
    status: 'review'
  },
  {
    id: 'a3',
    client_name: 'Khimji Global Trading',
    audit_type: 'KSA Audit (تدقيق فروع السعودية)',
    fy_period: 'FY 2025',
    current_stage: 5,
    lead_auditor: 'Audit Head',
    docs_collected: 12,
    docs_total: 12,
    manager_signoff: true,
    status: 'on_track'
  },
  {
    id: 'a4',
    client_name: 'Oman Horizons Real Estate',
    audit_type: 'Internal Audit (تدقيق داخلي)',
    fy_period: 'Q3 2026',
    current_stage: 2,
    lead_auditor: 'Audit Assistant (Maryam)',
    docs_collected: 4,
    docs_total: 8,
    manager_signoff: false,
    status: 'delayed'
  }
];

export const AuditCockpit: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [audits, setAudits] = useState<AuditEngagement[]>(INITIAL_AUDITS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAuditForDocs, setSelectedAuditForDocs] = useState<AuditEngagement | null>(null);

  // Handoff state
  const [handoffModalOpen, setHandoffModalOpen] = useState(false);
  const [selectedAuditForHandoff, setSelectedAuditForHandoff] = useState<AuditEngagement | null>(null);

  const advanceStage = (id: string) => {
    setAudits(prev => prev.map(a => {
      if (a.id !== id) return a;
      const next = Math.min(6, a.current_stage + 1);
      return { 
        ...a, 
        current_stage: next,
        status: next === 6 ? 'completed' : next === 5 ? 'review' : a.status
      };
    }));
  };

  const filteredAudits = audits.filter(a =>
    a.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.audit_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 6-Stage Overview Pipeline Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-3xl p-5 shadow-lg shadow-orange-500/20">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-bold">
              <FileCheck size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm">
                {isAr ? 'مسار مراحل عمليات التدقيق (Audit 6-Stage Pipeline)' : 'Audit Engagement 6-Stage Pipeline'}
              </h3>
              <p className="text-xs text-orange-100 font-medium">
                {isAr ? 'تتبع مراحل التعاقد وفحص المستندات والاعتماد النهائي للتقارير' : 'Sequential delivery pipeline from engagement letter to client sign-off'}
              </p>
            </div>
          </div>
        </div>

        {/* 6 Stages Stepper */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-white/20">
          {AUDIT_STAGES.map((s) => (
            <div key={s.step} className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs text-center">
              <span className="text-[10px] font-black uppercase text-orange-200 block">
                Stage {s.step} • {s.tag}
              </span>
              <span className="font-bold text-white text-[11px] block mt-0.5">
                {isAr ? s.name_ar : s.name_en}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Engagements Cards / Pipeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h4 className="font-black text-sm text-gray-900">
              {isAr ? 'الارتباطات وعمليات التدقيق الجارية' : 'Active Audit Engagements'}
            </h4>
            <p className="text-[11px] text-gray-500">
              {isAr ? 'انقر على "المرحلة التالية" لنقل العميل للمرحلة اللاحقة' : 'Click "Next Stage" to advance engagement status'}
            </p>
          </div>

          <div className="relative">
            <Search className={`absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-gray-400`} size={14} />
            <input
              type="text"
              placeholder={isAr ? 'بحث بالعميل أو نوع التدقيق...' : 'Search client or audit type...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`py-2 ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredAudits.map(audit => (
            <div
              key={audit.id}
              className="p-5 bg-white rounded-3xl border border-gray-200 shadow-sm hover:border-orange-300 transition-all space-y-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h5 className="font-black text-sm text-gray-900">{audit.client_name}</h5>
                  <p className="text-xs text-orange-600 font-bold">{audit.audit_type}</p>
                  <span className="text-[10px] font-mono text-gray-400">{audit.fy_period} • {audit.lead_auditor}</span>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                  audit.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : audit.status === 'delayed'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-orange-50 text-orange-700 border border-orange-200'
                }`}>
                  Stage {audit.current_stage}/6
                </span>
              </div>

              {/* Visual Pipeline Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold text-gray-600">
                  <span>{isAr ? 'المرحلة الحالية:' : 'Current Stage:'} {isAr ? AUDIT_STAGES[audit.current_stage - 1].name_ar : AUDIT_STAGES[audit.current_stage - 1].name_en}</span>
                  <span className="text-orange-600 font-mono">{Math.round((audit.current_stage / 6) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden flex">
                  {[1, 2, 3, 4, 5, 6].map(st => (
                    <div
                      key={st}
                      className={`h-full border-r border-white flex-1 transition-all ${
                        st <= audit.current_stage ? 'bg-orange-500' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Document Collection & Approval Status */}
              <div className="p-3 bg-gray-50 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-gray-500" />
                  <span className="text-gray-600">
                    {isAr ? 'الوثائق المستلمة:' : 'Evidence Collected:'}
                  </span>
                  <span className="font-bold text-gray-900">
                    {audit.docs_collected}/{audit.docs_total}
                  </span>
                </div>

                {audit.current_stage >= 5 && (
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black flex items-center gap-1 ${
                    audit.manager_signoff 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    <Shield size={11} />
                    <span>{audit.manager_signoff ? (isAr ? 'معتمد من المدير' : 'Approved') : (isAr ? 'بانتظار الاعتماد' : 'Pending Sign-off')}</span>
                  </span>
                )}
              </div>

              {/* Actions Strip */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAuditForHandoff(audit);
                    setHandoffModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-orange-50 hover:text-orange-700 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border border-gray-200"
                >
                  <Share2 size={12} />
                  <span>{isAr ? 'تحويل المعاملة' : 'Handoff'}</span>
                </button>

                {audit.current_stage < 6 ? (
                  <button
                    type="button"
                    onClick={() => advanceStage(audit.id)}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <span>{isAr ? 'الانتقال للمرحلة التالية' : 'Next Stage'}</span>
                    <ChevronRight size={14} className={isAr ? 'rotate-180' : ''} />
                  </button>
                ) : (
                  <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black flex items-center gap-1">
                    <CheckCircle2 size={14} />
                    <span>{isAr ? 'تم التسليم والاعتماد' : 'Delivered & Done'}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Handoff Modal */}
      {selectedAuditForHandoff && (
        <HandoffModal
          isOpen={handoffModalOpen}
          onClose={() => setHandoffModalOpen(false)}
          sourceDeptId="audit"
          clientName={selectedAuditForHandoff.client_name}
          clientId={selectedAuditForHandoff.id}
          serviceName={selectedAuditForHandoff.audit_type}
        />
      )}
    </div>
  );
};

export default AuditCockpit;

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Lightbulb, ChevronRight, CheckCircle2, Clock, Share2,
  FileText, Search, BarChart3, TrendingUp, Layers, Check
} from 'lucide-react';
import HandoffModal from '../HandoffModal';

interface AdvisoryProject {
  id: string;
  project_title: string;
  client_name: string;
  service_type: string; // Feasibility Study, Business Plan, Valuation, Jaheez
  current_stage: number; // 1 to 5
  lead_consultant: string;
  financial_model_reviewed: boolean;
  status: 'active' | 'review' | 'completed';
}

const CONSULTANCY_STAGES = [
  { step: 1, name_en: 'Brief & Scope', name_ar: 'تحديد النطاق والاحتياج', time: 'Week 1' },
  { step: 2, name_en: 'Research & Data', name_ar: 'أبحاث السوق والبيانات', time: '1-2 wks' },
  { step: 3, name_en: 'Analysis & Modelling', name_ar: 'التحليل والنمذجة المالية', time: '1-2 wks' },
  { step: 4, name_en: 'Draft Report', name_ar: 'مسودة التقرير والمراجعة', time: 'Review' },
  { step: 5, name_en: 'Client Presentation', name_ar: 'العرض التقديمي والتسليم', time: 'Delivery' }
];

const INITIAL_PROJECTS: AdvisoryProject[] = [
  {
    id: 'p1',
    project_title: 'EcoPlast Manufacturing Feasibility Study',
    client_name: 'Oman Green Industries',
    service_type: 'Bank Feasibility Study (دراسة جدوى بنكية)',
    current_stage: 3,
    lead_consultant: 'Senior Consultant (Rashid)',
    financial_model_reviewed: true,
    status: 'active'
  },
  {
    id: 'p2',
    project_title: 'Retail Chain Expansion Business Plan',
    client_name: 'Al Noor Supermarkets',
    service_type: 'Business Plan (خطة عمل استراتيجية)',
    current_stage: 4,
    lead_consultant: 'Financial Analyst (Ziyad)',
    financial_model_reviewed: false,
    status: 'review'
  },
  {
    id: 'p3',
    project_title: 'Logistics Fleet Valuation & Restructuring',
    client_name: 'Muscat Fast Freight',
    service_type: 'Jaheez SME Program (برنامج جاهز)',
    current_stage: 2,
    lead_consultant: 'Advisory Head',
    financial_model_reviewed: false,
    status: 'active'
  }
];

export const ConsultancyCockpit: React.FC = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [projects, setProjects] = useState<AdvisoryProject[]>(INITIAL_PROJECTS);
  const [searchTerm, setSearchTerm] = useState('');

  // Handoff state
  const [handoffModalOpen, setHandoffModalOpen] = useState(false);
  const [selectedProjectForHandoff, setSelectedProjectForHandoff] = useState<AdvisoryProject | null>(null);

  const advanceStage = (id: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== id) return p;
      const next = Math.min(5, p.current_stage + 1);
      return { ...p, current_stage: next, status: next === 5 ? 'completed' : p.status };
    }));
  };

  const filteredProjects = projects.filter(p =>
    p.project_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 5 Project Stages Banner */}
      <div className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-3xl p-5 shadow-lg shadow-amber-500/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-bold">
            <Lightbulb size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-black text-sm">
              {isAr ? 'مراحل المشروعات الاستشارية ودراسات الجدوى (5 Stages)' : 'Consultancy Project Stages & Milestones'}
            </h3>
            <p className="text-xs text-amber-100 font-medium">
              {isAr ? 'إدارة مشروعات خطط العمل، النمذجة المالية، وبرامج جاهز' : 'Business plans, feasibility studies, and SME advisory lifecycle'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-white/20">
          {CONSULTANCY_STAGES.map((s) => (
            <div key={s.step} className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs text-center">
              <span className="text-[10px] font-black uppercase text-amber-200 block">
                Stage {s.step} • {s.time}
              </span>
              <span className="font-bold text-white text-[11px] block mt-0.5">
                {isAr ? s.name_ar : s.name_en}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Projects Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h4 className="font-black text-sm text-gray-900">
              {isAr ? 'المشروعات الاستشارية الجارية' : 'Active Advisory Projects'}
            </h4>
            <p className="text-[11px] text-gray-500">
              {isAr ? 'متابعة مسار الإنجاز ومراجعة النموذج المالي' : 'Track milestone progression and financial model peer-review'}
            </p>
          </div>

          <div className="relative">
            <Search className={`absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-gray-400`} size={14} />
            <input
              type="text"
              placeholder={isAr ? 'بحث بالمشروع أو العميل...' : 'Search project or client...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`py-2 ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-amber-500`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map(proj => (
            <div
              key={proj.id}
              className="p-5 bg-white rounded-3xl border border-gray-200 shadow-sm hover:border-amber-300 transition-all space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h5 className="font-black text-sm text-gray-900">{proj.project_title}</h5>
                  <p className="text-xs text-amber-700 font-bold">{proj.client_name}</p>
                  <span className="text-[10px] text-gray-400 font-mono">{proj.service_type}</span>
                </div>

                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                  Stage {proj.current_stage}/5
                </span>
              </div>

              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold text-gray-600">
                  <span>{isAr ? 'المرحلة:' : 'Stage:'} {isAr ? CONSULTANCY_STAGES[proj.current_stage - 1].name_ar : CONSULTANCY_STAGES[proj.current_stage - 1].name_en}</span>
                  <span className="text-amber-600 font-mono">{Math.round((proj.current_stage / 5) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden flex">
                  {[1, 2, 3, 4, 5].map(st => (
                    <div
                      key={st}
                      className={`h-full border-r border-white flex-1 transition-all ${
                        st <= proj.current_stage ? 'bg-amber-500' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Model Review Gate */}
              <div className="p-3 bg-gray-50 rounded-2xl flex items-center justify-between text-xs">
                <span className="text-gray-600">
                  {isAr ? 'اعتماد النموذج المالي:' : 'Financial Model Peer Review:'}
                </span>
                {proj.financial_model_reviewed ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 size={11} />
                    <span>{isAr ? 'تمت المراجعة والاعتماد' : 'Reviewed & Approved'}</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 flex items-center gap-1">
                    <Clock size={11} />
                    <span>{isAr ? 'بانتظار المراجعة الفنية' : 'Pending Review'}</span>
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProjectForHandoff(proj);
                    setHandoffModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-amber-50 hover:text-amber-700 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border border-gray-200"
                >
                  <Share2 size={12} />
                  <span>{isAr ? 'تحويل' : 'Handoff'}</span>
                </button>

                {proj.current_stage < 5 ? (
                  <button
                    type="button"
                    onClick={() => advanceStage(proj.id)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <span>{isAr ? 'المرحلة التالية' : 'Next Stage'}</span>
                    <ChevronRight size={14} className={isAr ? 'rotate-180' : ''} />
                  </button>
                ) : (
                  <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black flex items-center gap-1">
                    <CheckCircle2 size={14} />
                    <span>{isAr ? 'تم التسليم النهائي' : 'Presented & Delivered'}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Handoff Modal */}
      {selectedProjectForHandoff && (
        <HandoffModal
          isOpen={handoffModalOpen}
          onClose={() => setHandoffModalOpen(false)}
          sourceDeptId="consultancy"
          clientName={selectedProjectForHandoff.client_name}
          clientId={selectedProjectForHandoff.id}
          serviceName={selectedProjectForHandoff.project_title}
        />
      )}
    </div>
  );
};

export default ConsultancyCockpit;

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Star,
  Building2,
  Users,
  Layers,
  Activity,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  Award,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BusinessClubAdmin from '../../components/crm/BusinessClubAdmin';

export const ManagerBusinessClub: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isAr = i18n.language === 'ar';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ── Executive Breadcrumb & Quick Navigation ───────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black">
            <Star size={20} className="fill-amber-500 text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
              <button
                onClick={() => navigate('/manager')}
                className="hover:text-brand-dark transition-colors cursor-pointer"
              >
                {isAr ? 'لوحة القيادة التنفيذية' : 'Executive Dashboard'}
              </button>
              <span>/</span>
              <span className="text-gray-700 font-bold">
                {isAr ? 'نادي ميسرة للأعمال' : 'Maisarah Business Club'}
              </span>
            </div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>{isAr ? 'الإدارة التنفيذية لنادي الأعمال' : 'Business Club Executive Oversight'}</span>
              <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-widest">
                VIP Suite
              </span>
            </h1>
          </div>
        </div>

        {/* Quick Cross-Navigation Links for Manager */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => navigate('/manager/clients')}
            className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-gray-200"
          >
            <Building2 size={13} className="text-gray-500" />
            <span>{isAr ? 'دليل العملاء' : 'Clients'}</span>
          </button>
          <button
            onClick={() => navigate('/manager/operations')}
            className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-gray-200"
          >
            <Activity size={13} className="text-gray-500" />
            <span>{isAr ? 'مركز العمليات' : 'Operations'}</span>
          </button>
          <button
            onClick={() => navigate('/manager/reports')}
            className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-gray-200"
          >
            <TrendingUp size={13} className="text-gray-500" />
            <span>{isAr ? 'التقارير' : 'Reports'}</span>
          </button>
        </div>
      </div>

      {/* ── Main Executive Business Club Controller & Workspace ──────────── */}
      <BusinessClubAdmin />
    </div>
  );
};

export default ManagerBusinessClub;

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  DollarSign, 
  Clock,
  Download,
  FileText,
  ShieldAlert,
  ChevronRight,
  Activity
} from 'lucide-react';
import { getAllDepartments } from '../../config/departments';

const ManagerDashboard = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [loading, setLoading] = useState(false);

  // Mock Data for the 5 Daily Questions
  const dailyIntelligence = {
    urgent: { count: 5, desc: isAr ? 'تقارير تدقيق متأخرة' : 'Audit reports overdue', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
    struggling: { dept: isAr ? 'الضرائب' : 'Tax & VAT', desc: isAr ? 'تأخير في 3 مهام' : 'Missed 3 deadlines', icon: TrendingDown, color: 'text-orange-500', bg: 'bg-orange-50' },
    growth: { metric: '+12', desc: isAr ? 'عملاء جدد هذا الشهر' : 'New clients this month', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
    finance: { amount: '4,250 OMR', desc: isAr ? 'فواتير غير مسددة' : 'Pending collection', icon: DollarSign, color: 'text-blue-500', bg: 'bg-blue-50' },
    decisions: { count: 8, desc: isAr ? 'موافقات معلقة' : 'Pending approvals', icon: Clock, color: 'text-purple-500', bg: 'bg-purple-50' }
  };

  // Mock Health for Departments
  const deptHealth = getAllDepartments().map(dept => {
    // Randomize health for mockup: 70% healthy, 20% warning, 10% critical
    const rand = Math.random();
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (rand > 0.9) status = 'critical';
    else if (rand > 0.7) status = 'warning';

    return {
      ...dept,
      status,
      activeTasks: Math.floor(Math.random() * 40) + 10,
      completionRate: Math.floor(Math.random() * 30) + 70
    };
  });

  return (
    <div className="space-y-8 pb-10" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Activity className="text-brand-dark" size={32} />
            {isAr ? 'لوحة القيادة التنفيذية' : 'Executive Dashboard'}
          </h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            {isAr ? 'نظرة شاملة على أداء الشركة ومراكز العمليات' : 'Comprehensive overview of company performance and operations'}
          </p>
        </div>
      </div>

      {/* ── Section 1: The 5 Daily Questions ────────────────────────────── */}
      <div>
        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">
          {isAr ? 'الذكاء اليومي (5 أسئلة)' : 'Daily Intelligence (The 5 Questions)'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* 1. Urgent Attention */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
            <div className={`w-12 h-12 rounded-2xl ${dailyIntelligence.urgent.bg} ${dailyIntelligence.urgent.color} flex items-center justify-center mb-4`}>
              <ShieldAlert size={24} />
            </div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{isAr ? 'انتباه عاجل' : 'Urgent Attention'}</h3>
            <p className="text-2xl font-black text-gray-900 leading-none mb-2">{dailyIntelligence.urgent.count}</p>
            <p className="text-xs font-bold text-gray-500">{dailyIntelligence.urgent.desc}</p>
          </div>

          {/* 2. Struggling */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
            <div className={`w-12 h-12 rounded-2xl ${dailyIntelligence.struggling.bg} ${dailyIntelligence.struggling.color} flex items-center justify-center mb-4`}>
              <dailyIntelligence.struggling.icon size={24} />
            </div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{isAr ? 'أقسام متعثرة' : 'Struggling'}</h3>
            <p className="text-lg font-black text-gray-900 leading-tight mb-2 truncate">{dailyIntelligence.struggling.dept}</p>
            <p className="text-xs font-bold text-gray-500">{dailyIntelligence.struggling.desc}</p>
          </div>

          {/* 3. Growth */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
            <div className={`w-12 h-12 rounded-2xl ${dailyIntelligence.growth.bg} ${dailyIntelligence.growth.color} flex items-center justify-center mb-4`}>
              <dailyIntelligence.growth.icon size={24} />
            </div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{isAr ? 'النمو' : 'Growth'}</h3>
            <p className="text-2xl font-black text-gray-900 leading-none mb-2">{dailyIntelligence.growth.metric}</p>
            <p className="text-xs font-bold text-gray-500">{dailyIntelligence.growth.desc}</p>
          </div>

          {/* 4. Finance */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
            <div className={`w-12 h-12 rounded-2xl ${dailyIntelligence.finance.bg} ${dailyIntelligence.finance.color} flex items-center justify-center mb-4`}>
              <dailyIntelligence.finance.icon size={24} />
            </div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{isAr ? 'المالية' : 'Financial'}</h3>
            <p className="text-xl font-black text-gray-900 leading-tight mb-2">{dailyIntelligence.finance.amount}</p>
            <p className="text-xs font-bold text-gray-500">{dailyIntelligence.finance.desc}</p>
          </div>

          {/* 5. Decisions */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
            <div className={`w-12 h-12 rounded-2xl ${dailyIntelligence.decisions.bg} ${dailyIntelligence.decisions.color} flex items-center justify-center mb-4`}>
              <dailyIntelligence.decisions.icon size={24} />
            </div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{isAr ? 'قرارات مطلوبة' : 'Decisions'}</h3>
            <p className="text-2xl font-black text-gray-900 leading-none mb-2">{dailyIntelligence.decisions.count}</p>
            <p className="text-xs font-bold text-gray-500">{dailyIntelligence.decisions.desc}</p>
          </div>
        </div>
      </div>

      {/* ── Section 2: Department Health Matrix ─────────────────────────── */}
      <div>
        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">
          {isAr ? 'مصفوفة صحة الأقسام' : 'Department Health Matrix'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {deptHealth.map(dept => (
            <div key={dept.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between h-40 hover:shadow-md transition-all group cursor-pointer relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-2 h-full ${dept.status === 'healthy' ? 'bg-green-500' : dept.status === 'warning' ? 'bg-orange-500' : 'bg-red-500'}`} />
              
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-black text-sm text-gray-900 leading-tight w-4/5">{dept.name}</h3>
                  <span className={`w-3 h-3 rounded-full ${dept.status === 'healthy' ? 'bg-green-500' : dept.status === 'warning' ? 'bg-orange-500' : 'bg-red-500'}`} />
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">{dept.head_title}</p>
              </div>

              <div className="flex justify-between items-end mt-4">
                <div>
                  <p className="text-xl font-black text-gray-900 leading-none">{dept.completionRate}%</p>
                  <p className="text-[10px] font-bold text-gray-500 mt-1">{isAr ? 'معدل الإنجاز' : 'Completion'}</p>
                </div>
                <div className="text-end">
                  <p className="text-lg font-black text-gray-900 leading-none">{dept.activeTasks}</p>
                  <p className="text-[10px] font-bold text-gray-500 mt-1">{isAr ? 'مهام نشطة' : 'Active Tasks'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 3: Quick Action Hub ─────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">
          {isAr ? 'مركز الإجراءات السريعة' : 'Quick Action Hub'}
        </h2>
        <div className="bg-brand-dark rounded-3xl p-8 text-white relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
            {[
              { title: isAr ? 'التقرير التنفيذي' : 'Executive Report', desc: isAr ? 'الصحة العامة للشركة' : 'Overall company health' },
              { title: isAr ? 'التقرير المالي' : 'Financial Report', desc: isAr ? 'الإيرادات والمصروفات' : 'Revenue & expenses' },
              { title: isAr ? 'تقرير المخاطر' : 'Risk Report', desc: isAr ? 'التأخيرات والمشاكل' : 'Delays and issues' }
            ].map((report, idx) => (
              <button key={idx} className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl p-5 flex items-center justify-between transition-all group text-start">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{report.title}</h4>
                    <p className="text-xs text-white/60 mt-1">{report.desc}</p>
                  </div>
                </div>
                <Download size={18} className="text-white/40 group-hover:text-white transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default ManagerDashboard;

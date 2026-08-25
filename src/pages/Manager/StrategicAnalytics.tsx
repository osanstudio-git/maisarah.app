import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  BarChart2,
  Target,
  Zap,
  Activity,
  Users,
  Star,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Rocket
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { getAllDepartments } from '../../config/departments';

const StrategicAnalytics = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading advanced models
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // ── Mock Predictive Data ────────────────────────────────────────────────
  const departments = getAllDepartments();
  
  // 1. Radar Chart Data (Comparing Departments)
  const radarData = departments.slice(0, 5).map(d => ({
    subject: d.name,
    Efficiency: Math.floor(Math.random() * 40 + 60),
    Revenue: Math.floor(Math.random() * 40 + 60),
    Satisfaction: Math.floor(Math.random() * 30 + 70),
    Speed: Math.floor(Math.random() * 50 + 50),
    Growth: Math.floor(Math.random() * 60 + 40),
  }));

  // 2. Revenue vs Target Trajectory (Area Chart)
  const months = isAr ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  let cumulativeActual = 0;
  let cumulativeTarget = 0;
  const trajectoryData = months.map(m => {
    const act = Math.floor(Math.random() * 5000 + 10000);
    const tgt = 12000;
    cumulativeActual += act;
    cumulativeTarget += tgt;
    return {
      name: m,
      Actual: cumulativeActual,
      Target: cumulativeTarget
    };
  });

  // 3. Top Performing Services Leaderboard
  const allServices = departments.flatMap(d => d.services.map(s => ({ name: s, dept: d.name })));
  // Pick random 5 and assign scores
  const topServices = allServices.sort(() => 0.5 - Math.random()).slice(0, 5).map(s => ({
    ...s,
    score: Math.floor(Math.random() * 500 + 1000)
  })).sort((a, b) => b.score - a.score);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-dark" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <BarChart2 className="text-brand-dark" size={32} />
            {isAr ? 'التحليلات الاستراتيجية' : 'Strategic Analytics'}
          </h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            {isAr ? 'ذكاء الأعمال، التوقعات المالية، ومؤشرات النمو' : 'Business intelligence, financial forecasting, and growth metrics'}
          </p>
        </div>
      </div>

      {/* ── Section 1: The Growth Predictor ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Client Acquisition Rate */}
        <div className="bg-brand-dark text-white rounded-[2rem] p-6 shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">{isAr ? 'معدل الاستحواذ' : 'Acquisition Rate'}</p>
              <Users size={16} className="text-white/40" />
            </div>
            <div>
              <div className="flex items-end gap-2">
                <p className="text-4xl font-black leading-none">+24%</p>
                <ArrowUpRight size={20} className="text-green-400 mb-1" />
              </div>
              <p className="text-[10px] text-white/50 font-bold mt-1 uppercase tracking-widest">{isAr ? 'عن الشهر الماضي' : 'vs Last Month'}</p>
            </div>
          </div>
        </div>

        {/* Projected Revenue */}
        <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-50 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{isAr ? 'الإيرادات المتوقعة' : 'Projected Revenue'}</p>
              <TrendingUp size={16} className="text-green-500" />
            </div>
            <div>
              <p className="text-3xl font-black text-gray-900 leading-none">145K</p>
              <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">{isAr ? 'لنهاية الربع' : 'End of Quarter'}</p>
            </div>
          </div>
        </div>

        {/* Service Velocity */}
        <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{isAr ? 'سرعة الإنجاز' : 'Service Velocity'}</p>
              <Zap size={16} className="text-blue-500" />
            </div>
            <div>
              <p className="text-3xl font-black text-gray-900 leading-none">2.4 <span className="text-sm">Days</span></p>
              <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">{isAr ? 'متوسط وقت الخدمة' : 'Avg Time to Complete'}</p>
            </div>
          </div>
        </div>

        {/* Resource Utilization */}
        <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-50 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{isAr ? 'استغلال الموارد' : 'Utilization'}</p>
              <Activity size={16} className="text-purple-500" />
            </div>
            <div>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-black text-gray-900 leading-none">88%</p>
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-black tracking-widest mb-1">OPTIMAL</span>
              </div>
              <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">{isAr ? 'قدرة الموظفين' : 'Workforce Capacity'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── Section 3: Revenue Trajectory (Area Chart) ────────────────── */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
                <Target size={18} className="text-brand-dark" />
                {isAr ? 'مسار الإيرادات مقابل الهدف' : 'Revenue Trajectory vs Target'}
              </h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                {isAr ? 'تراكمي - السنة الحالية' : 'Cumulative - Year to Date'}
              </p>
            </div>
          </div>
          
          <div className="flex-1 min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trajectoryData} margin={{ top: 10, right: 10, left: isAr ? 0 : 30, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#111827" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#111827" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 700 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 700 }} tickFormatter={(v) => `${v / 1000}K`} orientation={isAr ? "right" : "left"} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0/0.1)', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="Actual" stroke="#111827" strokeWidth={4} fillOpacity={1} fill="url(#colorActual)" />
                <Area type="monotone" dataKey="Target" stroke="#D1D5DB" strokeWidth={3} strokeDasharray="5 5" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Section 2: Department Radar ───────────────────────────────── */}
        <div className="bg-brand-dark rounded-[2rem] shadow-xl p-6 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <div className="flex justify-between items-center mb-6 relative z-10">
            <div>
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                <ShieldCheck size={18} className="text-white/60" />
                {isAr ? 'مصفوفة أداء الأقسام' : 'Department Performance Matrix'}
              </h2>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-1">
                {isAr ? 'مقارنة شاملة لـ 5 قطاعات رئيسية' : 'Comprehensive comparison across 5 axes'}
              </p>
            </div>
          </div>

          <div className="flex-1 min-h-[350px] relative z-10 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 800 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderRadius: '12px', border: '1px solid #374151', color: 'white' }}
                  itemStyle={{ color: 'white', fontWeight: 'bold' }}
                />
                <Radar name="Department Index" dataKey="Efficiency" stroke="#3B82F6" strokeWidth={2} fill="#3B82F6" fillOpacity={0.2} />
                <Radar name="Growth Index" dataKey="Growth" stroke="#10B981" strokeWidth={2} fill="#10B981" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Section 4: Top Performing Services ────────────────────────── */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
          <div>
            <h2 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Rocket size={18} className="text-brand-dark" />
              {isAr ? 'أفضل الخدمات أداءً' : 'Top Performing Services'}
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              {isAr ? 'الخدمات التي تولد أكبر قيمة للشركة' : 'Services generating the most value company-wide'}
            </p>
          </div>
        </div>
        <div className="p-2">
          {topServices.map((svc, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-yellow-50 text-yellow-600' : idx === 1 ? 'bg-gray-100 text-gray-500' : idx === 2 ? 'bg-orange-50 text-orange-600' : 'bg-brand-dark/5 text-brand-dark'}`}>
                  #{idx + 1}
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">{svc.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Building2 size={12} className="text-gray-400" />
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{svc.dept}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-black text-gray-900">{svc.score} <span className="text-[10px] text-gray-400 ml-1 uppercase tracking-widest">Score</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StrategicAnalytics;

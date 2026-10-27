import React, { useState, useMemo } from 'react';
import {
  TrendingUp, Users, DollarSign, Briefcase, Plus, Search, Info, Trash2,
  Lock, Printer, Heart, Crown, Zap, ChevronDown, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Clock, Filter, Eye, RefreshCw, X, FileText
} from 'lucide-react';

export interface ModernCRMDashboardProps {
  isAr?: boolean;
  leads?: any[];
  clients?: any[];
  quotations?: any[];
  onOpenAddDeal?: () => void;
  onViewAllDeals?: () => void;
}

export default function ModernCRMDashboard({
  isAr = false,
  leads = [],
  clients = [],
  quotations = [],
  onOpenAddDeal,
  onViewAllDeals,
}: ModernCRMDashboardProps) {
  // --- States ---
  const [period, setPeriod] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [tableSearch, setTableSearch] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [bounceDropdown, setBounceDropdown] = useState(false);
  const [bouncePeriod, setBouncePeriod] = useState<'Monthly' | 'Weekly' | 'Quarterly'>('Monthly');

  // --- Dynamic Financial & Sales Metrics ---
  const stats = useMemo(() => {
    const totalWon = leads.filter(l => l.status === 'won' || l.status === 'converted');
    const wonRevenue = totalWon.reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0);
    const pipelineRevenue = leads
      .filter(l => l.status !== 'won' && l.status !== 'lost' && l.status !== 'rejected')
      .reduce((acc, l) => acc + (Number(l.estimated_value) || 0), 0);
    const clientsMrr = clients.reduce((acc, c) => acc + (Number(c.monthlyBilling) || 0), 0);

    return {
      monthlyEarnings: wonRevenue > 0 ? wonRevenue : 34680,
      monthlySales: totalWon.length > 0 ? totalWon.length : 82,
      walletBalance: 4567.53,
      referralEarnings: 1689.53,
      estimateSales: pipelineRevenue > 0 ? pipelineRevenue : 28515.00,
      totalEarnings: (wonRevenue > 0 ? wonRevenue : 34680) + 17887.53,
      revenueStatus1: 4320,
      pipelineForecast: pipelineRevenue > 0 ? pipelineRevenue : 8432,
      collectionRate: '94.2%',
      recurringMrr: clientsMrr > 0 ? clientsMrr : 6432,
    };
  }, [leads, clients]);

  // --- Order Status Table Mock / Bound Data ---
  const orders = useMemo(() => {
    // If real leads or quotations exist, prioritize them, otherwise provide the exact reference styling
    const sampleRows = [
      {
        id: '12386',
        customer: isAr ? 'سالم البوسعيدي' : 'Charly Duer',
        company: isAr ? 'شركة صحار للحديد' : 'Brand',
        country: isAr ? 'عُمان' : 'Brand',
        price: 299,
        currency: 'OMR',
        status: 'Process',
        statusColor: 'bg-rose-500 text-white',
        statusLabel: isAr ? 'قيد التنفيذ' : 'Process',
      },
      {
        id: '12385',
        customer: isAr ? 'ناصر الرواحي' : 'Marko',
        company: isAr ? 'الطاقة الشمسية' : 'Italy',
        country: isAr ? 'إيطاليا' : 'Italy',
        price: 2642,
        currency: 'OMR',
        status: 'Open',
        statusColor: 'bg-purple-600 text-white',
        statusLabel: isAr ? 'مفتوح' : 'Open',
      },
      {
        id: '12386',
        customer: isAr ? 'فاطمة البلوشي' : 'Denyel Onak',
        company: isAr ? 'أزياء النخبة' : 'Russia',
        country: isAr ? 'روسيا' : 'Russia',
        price: 981,
        currency: 'OMR',
        status: 'On Hold',
        statusColor: 'bg-sky-500 text-white',
        statusLabel: isAr ? 'معلق' : 'On Hold',
      },
      {
        id: '12385',
        customer: isAr ? 'حامد السيابي' : 'Belgiri Bastana',
        company: isAr ? 'تموين الضيافة' : 'Korea',
        country: isAr ? 'كوريا' : 'Korea',
        price: 369,
        currency: 'OMR',
        status: 'Process',
        statusColor: 'bg-amber-500 text-white',
        statusLabel: isAr ? 'قيد المعالجة' : 'Process',
      },
      {
        id: '12386',
        customer: isAr ? 'منى المسروري' : 'Sami Onuska',
        company: isAr ? 'مجموعة الشركاء' : 'Japan',
        country: isAr ? 'اليابان' : 'Japan',
        price: 1240,
        currency: 'OMR',
        status: 'Open',
        statusColor: 'bg-emerald-500 text-white',
        statusLabel: isAr ? 'مكتمل' : 'Open',
      },
    ];

    // If leads exist, enrich or combine
    if (leads && leads.length >= 3) {
      return leads.slice(0, 5).map((l, idx) => ({
        id: (12380 + idx).toString(),
        customer: l.contact_name || l.name || 'Client',
        company: l.company_name || l.companyName || (isAr ? 'عُمان' : 'Oman'),
        country: l.department_id || (isAr ? 'مسقط' : 'Muscat'),
        price: Number(l.estimated_value) || (idx === 0 ? 299 : idx === 1 ? 2642 : 1240),
        currency: 'OMR',
        status: l.status === 'won' ? 'Open' : l.status === 'in_progress' ? 'Process' : 'On Hold',
        statusColor:
          idx % 5 === 0
            ? 'bg-rose-500 text-white'
            : idx % 5 === 1
            ? 'bg-purple-600 text-white'
            : idx % 5 === 2
            ? 'bg-sky-500 text-white'
            : idx % 5 === 3
            ? 'bg-amber-500 text-white'
            : 'bg-emerald-500 text-white',
        statusLabel:
          idx % 5 === 0
            ? isAr ? 'قيد التنفيذ' : 'Process'
            : idx % 5 === 1
            ? isAr ? 'مفتوح' : 'Open'
            : idx % 5 === 2
            ? isAr ? 'معلق' : 'On Hold'
            : idx % 5 === 3
            ? isAr ? 'قيد المعالجة' : 'Process'
            : isAr ? 'مكتمل' : 'Open',
      }));
    }

    return sampleRows;
  }, [leads, isAr]);

  const filteredOrders = useMemo(() => {
    if (!tableSearch.trim()) return orders;
    return orders.filter(o =>
      o.customer.toLowerCase().includes(tableSearch.toLowerCase()) ||
      o.id.includes(tableSearch) ||
      o.country.toLowerCase().includes(tableSearch.toLowerCase())
    );
  }, [orders, tableSearch]);

  // --- Recent Activities Feed Items ---
  const recentActivities = [
    {
      id: '1',
      title: isAr ? 'تحديث المهمة' : 'Task Updated',
      actor: isAr ? 'علي الحارثي قام بتحديث مهمة الإقرار' : 'Nikolai Updated a Task',
      time: isAr ? 'منذ 42 دقيقة' : '42 Mins Ago',
      color: 'bg-pink-500 text-white',
      ringColor: 'ring-pink-100',
    },
    {
      id: '2',
      title: isAr ? 'إضافة صفقة جديدة' : 'Deal Added',
      actor: isAr ? 'فاطمة البوسعيدي أضافت عقداً جديداً' : 'Purobi Updated a Task',
      time: isAr ? 'منذ يوم واحد' : '1 day Ago',
      color: 'bg-purple-600 text-white',
      ringColor: 'ring-purple-100',
    },
    {
      id: '3',
      title: isAr ? 'إصدار خطاب ارتباط' : 'Published Article',
      actor: isAr ? 'خلفان العبري أصدر مسودة عرض السعر' : 'Rasel Published a Article',
      time: isAr ? 'منذ 42 دقيقة' : '42 Mins Ago',
      color: 'bg-sky-500 text-white',
      ringColor: 'ring-sky-100',
    },
    {
      id: '4',
      title: isAr ? 'تحديث المستندات' : 'Dock Updated',
      actor: isAr ? 'مراجعة السجل التجاري والشهادة الضريبية' : 'Reshmi Updated a Dock',
      time: isAr ? 'منذ يوم واحد' : '1 day Ago',
      color: 'bg-amber-500 text-white',
      ringColor: 'ring-amber-100',
    },
    {
      id: '5',
      title: isAr ? 'تسجيل إيصال الدفعة' : 'Replied Comment',
      actor: isAr ? 'توثيق سداد الدفعة الأولى 1,200 ر.ع' : 'Jenathon Added a Comment',
      time: isAr ? 'منذ يوم واحد' : '1 day Ago',
      color: 'bg-emerald-500 text-white',
      ringColor: 'ring-emerald-100',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ── ROW 1: HERO ANALYTICS (65%) & TRAFFIC DONUT (35%) ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* HERO ANALYTICS CARD (Col span 8) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
          {/* Card Header: Title + Period Filter + Legend */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
            <div>
              <h2 className="text-sm font-black text-gray-900 tracking-tight">
                {isAr ? 'لوحة القيادة' : 'Dashboard'}
              </h2>
              <p className="text-[11px] font-semibold text-gray-400 mt-0.5">
                {isAr ? 'نظرة عامة على الشهر الأخير' : 'Overview of Latest Month'}
              </p>
            </div>

            {/* Time Filter Tabs with Underline */}
            <div className="flex items-center gap-4 sm:gap-6 border-b border-gray-100 sm:border-0 pb-2 sm:pb-0">
              {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const).map(p => {
                const isActive = period === p;
                const labels = {
                  DAILY: isAr ? 'يومي' : 'DAILY',
                  WEEKLY: isAr ? 'أسبوعي' : 'WEEKLY',
                  MONTHLY: isAr ? 'شهري' : 'MONTHLY',
                  YEARLY: isAr ? 'سنوي' : 'YEARLY',
                };
                return (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`text-[10px] font-black uppercase tracking-wider relative pb-1 transition-all cursor-pointer ${
                      isActive ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {labels[p]}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#A11212] rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend Dots */}
            <div className="flex items-center gap-3 text-[11px] font-bold text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0284C7]" />
                {isAr ? 'الصفقات الرابحة' : 'Online'}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                {isAr ? 'الفرص الجديدة' : 'Store'}
              </span>
            </div>
          </div>

          {/* Middle Row: Left Metrics + Multi-Curve Area Chart */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 my-3 items-center">
            {/* Left Headline Earnings & CTA */}
            <div className="md:col-span-4 space-y-4">
              <div>
                <h3 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight font-mono">
                  ${stats.monthlyEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <p className="text-xs font-semibold text-gray-400 mt-1">
                  {isAr ? 'أرباح الشهر الحالي' : 'Current Month Earnings'}
                </p>
              </div>

              <div>
                <h4 className="text-2xl font-black text-gray-900 tracking-tight font-mono">
                  {stats.monthlySales}
                </h4>
                <p className="text-xs font-semibold text-gray-400 mt-0.5">
                  {isAr ? 'مبيعات الشهر الحالي' : 'Current Month Sales'}
                </p>
              </div>

              <div>
                <button
                  onClick={() => setShowSummaryModal(true)}
                  className="bg-gradient-to-r from-[#A11212] to-[#E11D48] hover:from-[#8B0E0E] hover:to-[#BE123C] text-white text-[11px] font-black px-4 py-2.5 rounded-full shadow-md shadow-rose-900/20 transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
                >
                  <span>{isAr ? 'ملخص الشهر السابق' : 'Last Month Summary'}</span>
                </button>
              </div>
            </div>

            {/* Right: Modern SVG Dual-Curve Area Chart */}
            <div className="md:col-span-8 h-48 sm:h-52 relative flex items-end">
              <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
                <defs>
                  {/* Amber/Gold Wave Gradient */}
                  <linearGradient id="amberWave" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                  </linearGradient>
                  {/* Crimson/Rose Wave Gradient */}
                  <linearGradient id="roseWave" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A11212" stopOpacity="0.45" />
                    <stop offset="50%" stopColor="#E11D48" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#E11D48" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Dashed Grid Lines & Y-Axis Labels */}
                {[
                  { y: 20, label: '35' },
                  { y: 55, label: '30' },
                  { y: 95, label: '20' },
                  { y: 135, label: '15' },
                  { y: 170, label: '10' },
                  { y: 195, label: '0' },
                ].map((grid, i) => (
                  <g key={i}>
                    <line
                      x1="25"
                      y1={grid.y}
                      x2="490"
                      y2={grid.y}
                      stroke="#F1F5F9"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <text
                      x="10"
                      y={grid.y + 3}
                      fill="#94A3B8"
                      fontSize="9"
                      fontFamily="sans-serif"
                      fontWeight="bold"
                    >
                      {grid.label}
                    </text>
                  </g>
                ))}

                {/* Orange/Amber Area Path */}
                <path
                  d="M 30 170 C 70 160, 95 125, 135 125 C 175 125, 195 150, 235 140 C 275 130, 290 95, 335 105 C 380 115, 395 120, 435 100 C 465 85, 475 130, 490 170 L 490 195 L 30 195 Z"
                  fill="url(#amberWave)"
                />
                {/* Orange/Amber Stroke Path */}
                <path
                  d="M 30 170 C 70 160, 95 125, 135 125 C 175 125, 195 150, 235 140 C 275 130, 290 95, 335 105 C 380 115, 395 120, 435 100 C 465 85, 475 130, 490 170"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Rose/Crimson Area Path */}
                <path
                  d="M 30 185 C 65 175, 90 145, 135 140 C 180 135, 195 160, 235 150 C 275 140, 295 130, 335 125 C 375 120, 395 40, 440 50 C 460 55, 475 140, 490 175 L 490 195 L 30 195 Z"
                  fill="url(#roseWave)"
                />
                {/* Rose/Crimson Stroke Path */}
                <path
                  d="M 30 185 C 65 175, 90 145, 135 140 C 180 135, 195 160, 235 150 C 275 140, 295 130, 335 125 C 375 120, 395 40, 440 50 C 460 55, 475 140, 490 175"
                  fill="none"
                  stroke="#A11212"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Accent Data Points */}
                <circle cx="135" cy="125" r="3.5" fill="#F59E0B" />
                <circle cx="335" cy="105" r="4.5" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="2" />
                <circle cx="335" cy="125" r="3.5" fill="#A11212" />
                <circle cx="440" cy="50" r="5" fill="#A11212" stroke="#FFFFFF" strokeWidth="2.5" />

                {/* X-Axis Month Markers */}
                {[
                  { x: 30, m: 'Jan' },
                  { x: 125, m: 'Feb' },
                  { x: 220, m: 'Mar' },
                  { x: 315, m: 'Apr' },
                  { x: 405, m: 'May' },
                  { x: 485, m: 'Jun' },
                ].map((item, idx) => (
                  <text
                    key={idx}
                    x={item.x}
                    y="198"
                    fill="#94A3B8"
                    fontSize="9.5"
                    fontFamily="sans-serif"
                    textAnchor="middle"
                  >
                    {item.m}
                  </text>
                ))}
              </svg>
            </div>
          </div>

          {/* Bottom 4 Icon Stat Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-gray-100">
            {/* Stat 1: Wallet Balance */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0 text-[#A11212]">
                <Crown size={15} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 leading-tight">
                  {isAr ? 'رصيد المحفظة' : 'Wallet Balance'}
                </p>
                <p className="text-xs font-black text-gray-900 font-mono">
                  ${stats.walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Stat 2: Referral Earning */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0 text-purple-600">
                <Heart size={15} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 leading-tight">
                  {isAr ? 'أرباح الإحالات' : 'Referral Earning'}
                </p>
                <p className="text-xs font-black text-gray-900 font-mono">
                  ${stats.referralEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Stat 3: Estimate Sales */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center flex-shrink-0 text-sky-600">
                <Zap size={15} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 leading-tight">
                  {isAr ? 'المبيعات المقدرة' : 'Estimate Sales'}
                </p>
                <p className="text-xs font-black text-gray-900 font-mono">
                  ${stats.estimateSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Stat 4: Earning */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0 text-amber-600">
                <Briefcase size={15} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 leading-tight">
                  {isAr ? 'إجمالي الأرباح' : 'Earning'}
                </p>
                <p className="text-xs font-black text-gray-900 font-mono">
                  ${stats.totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* TRAFFIC / DONUT CARD (Col span 4) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-black text-gray-900 tracking-tight">
              {isAr ? 'مصادر الزيارات وحركة الصفقات' : 'Traffic'}
            </h2>
            <p className="text-[11px] font-semibold text-gray-400 mt-0.5">
              {isAr ? 'توزيع القنوات والإحالات' : 'Channel distribution & conversion'}
            </p>
          </div>

          {/* Centered Donut Chart */}
          <div className="my-5 flex items-center justify-center">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#F8FAFC"
                  strokeWidth="14"
                />
                {/* Segment 1: B2B Partners / Youtube (55%) - Crimson / Rose */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#A11212"
                  strokeWidth="14"
                  strokeDasharray="131.3 238.8"
                  strokeDashoffset="0"
                />
                {/* Segment 2: Direct / Facebook (33%) - Deep Violet */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#7C3AED"
                  strokeWidth="14"
                  strokeDasharray="78.8 238.8"
                  strokeDashoffset="-131.3"
                />
                {/* Segment 3: Inbound / Search (12%) - Golden Amber */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#F59E0B"
                  strokeWidth="14"
                  strokeDasharray="28.7 238.8"
                  strokeDashoffset="-210.1"
                />
              </svg>
            </div>
          </div>

          {/* Bottom Breakdown Legends */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-50 text-center">
            <div>
              <p className="text-lg font-black text-gray-900 font-mono">33%</p>
              <p className="text-[10px] font-bold text-gray-400 flex items-center justify-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
                {isAr ? 'مباشر' : 'Facebook'}
              </p>
            </div>

            <div>
              <p className="text-lg font-black text-gray-900 font-mono">55%</p>
              <p className="text-[10px] font-bold text-gray-400 flex items-center justify-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A11212]" />
                {isAr ? 'إحالات' : 'Youtube'}
              </p>
            </div>

            <div>
              <p className="text-lg font-black text-gray-900 font-mono">12%</p>
              <p className="text-[10px] font-bold text-gray-400 flex items-center justify-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                {isAr ? 'الموقع' : 'Direct Search'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 2: 4 VIBRANT GRADIENT METRIC CARDS ──────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* CARD 1: REVENUE STATUS (Crimson Gradient) */}
        <div className="rounded-3xl p-5 text-white bg-gradient-to-r from-[#A11212] via-[#B91C1C] to-[#E11D48] shadow-md shadow-rose-950/20 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-100">
              {isAr ? 'حالة الإيرادات' : 'Revenue Status'}
            </span>
          </div>

          <div className="flex items-end justify-between mt-3">
            {/* Mini Bar Chart Graphic */}
            <div className="flex items-end gap-1.5 h-12">
              <span className="w-2 bg-white/40 rounded-t h-4" />
              <span className="w-2 bg-white/70 rounded-t h-7" />
              <span className="w-2 bg-white rounded-t h-11" />
              <span className="w-2 bg-white/50 rounded-t h-5" />
              <span className="w-2 bg-white/80 rounded-t h-9" />
            </div>

            {/* Amount & Date Range */}
            <div className="text-right">
              <h3 className="text-2xl font-black font-mono tracking-tight text-white">
                $432
              </h3>
              <p className="text-[10px] font-semibold text-rose-100/90 mt-0.5">
                Jan 01 - Jan 10
              </p>
            </div>
          </div>
        </div>

        {/* CARD 2: PAGE VIEW (Violet / Purple Gradient) */}
        <div className="rounded-3xl p-5 text-white bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] shadow-md shadow-purple-950/20 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-100">
              {isAr ? 'مشاهدات الصفحة' : 'Page View'}
            </span>
            <h3 className="text-2xl font-black font-mono tracking-tight text-white mt-1">
              $432
            </h3>
          </div>

          {/* Smooth Bezier Wave SVG at bottom */}
          <div className="w-full h-10 mt-2">
            <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
              <path
                d="M 0 25 C 20 10, 40 30, 60 15 C 80 5, 90 20, 100 15 L 100 30 L 0 30 Z"
                fill="rgba(255, 255, 255, 0.25)"
              />
              <path
                d="M 0 25 C 20 10, 40 30, 60 15 C 80 5, 90 20, 100 15"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* CARD 3: BOUNCE RATE (Sky / Cyan Gradient) */}
        <div className="rounded-3xl p-5 text-white bg-gradient-to-r from-[#0284C7] to-[#06B6D4] shadow-md shadow-cyan-950/20 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-100">
                {isAr ? 'معدل الارتداد' : 'Bounce Rate'}
              </span>
              <h3 className="text-2xl font-black font-mono tracking-tight text-white mt-1">
                $432
              </h3>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            {/* Period Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => setBounceDropdown(!bounceDropdown)}
                className="bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer backdrop-blur-xs"
              >
                <span>{bouncePeriod}</span>
                <ChevronDown size={11} />
              </button>
              {bounceDropdown && (
                <div className="absolute bottom-full mb-1 left-0 bg-white text-gray-800 text-[10px] font-bold rounded-xl shadow-lg border border-gray-100 p-1 z-20 min-w-[90px]">
                  {(['Monthly', 'Weekly', 'Quarterly'] as const).map(item => (
                    <button
                      key={item}
                      onClick={() => {
                        setBouncePeriod(item);
                        setBounceDropdown(false);
                      }}
                      className="w-full text-left px-2 py-1 hover:bg-gray-50 rounded-lg"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mini Sparkline Line with Data Points */}
            <div className="w-24 h-8">
              <svg viewBox="0 0 100 30" className="w-full h-full overflow-visible">
                <path
                  d="M 5 22 L 25 15 L 45 25 L 65 8 L 85 18 L 95 10"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="5" cy="22" r="2.5" fill="#FFFFFF" />
                <circle cx="25" cy="15" r="2.5" fill="#FFFFFF" />
                <circle cx="45" cy="25" r="2.5" fill="#FFFFFF" />
                <circle cx="65" cy="8" r="3" fill="#FFFFFF" />
                <circle cx="85" cy="18" r="2.5" fill="#FFFFFF" />
                <circle cx="95" cy="10" r="3" fill="#FFFFFF" />
              </svg>
            </div>
          </div>
        </div>

        {/* CARD 4: REVENUE STATUS (Warm Amber / Gold Gradient) */}
        <div className="rounded-3xl p-5 text-white bg-gradient-to-r from-[#EA580C] via-[#D97706] to-[#F59E0B] shadow-md shadow-amber-950/20 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-100">
              {isAr ? 'حالة الإيرادات' : 'Revenue Status'}
            </span>
          </div>

          <div className="flex items-end justify-between mt-3">
            {/* Mini Bar Chart Graphic */}
            <div className="flex items-end gap-1.5 h-12">
              <span className="w-2 bg-white/40 rounded-t h-8" />
              <span className="w-2 bg-white/70 rounded-t h-4" />
              <span className="w-2 bg-white rounded-t h-10" />
              <span className="w-2 bg-white/50 rounded-t h-6" />
              <span className="w-2 bg-white/80 rounded-t h-9" />
            </div>

            {/* Amount & Date Range */}
            <div className="text-right">
              <h3 className="text-2xl font-black font-mono tracking-tight text-white">
                $432
              </h3>
              <p className="text-[10px] font-semibold text-amber-100/90 mt-0.5">
                Jan 01 - Jan 10
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 3: RECENT ACTIVITIES (35%) & ORDER STATUS TABLE (65%) ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* RECENT ACTIVITIES (Col span 4) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-black text-gray-900 tracking-tight">
              {isAr ? 'الأنشطة الأخيرة' : 'Recent Activities'}
            </h2>
            <p className="text-[11px] font-semibold text-gray-400 mt-0.5">
              {isAr ? 'أحدث الإجراءات والمتابعات التلقائية' : 'Latest pipeline actions & updates'}
            </p>
          </div>

          {/* Activities List */}
          <div className="space-y-4 my-4">
            {recentActivities.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-gray-400 min-w-[65px] text-left">
                    {item.time}
                  </span>
                  <div className={`w-7 h-7 rounded-full ${item.color} flex items-center justify-center font-bold text-[10px] flex-shrink-0 shadow-xs`}>
                    <CheckCircle2 size={13} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 leading-tight">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                      {item.actor}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-gray-50 text-center">
            <button
              onClick={onViewAllDeals}
              className="text-[11px] font-bold text-[#A11212] hover:text-[#800e0e] inline-flex items-center gap-1 transition-all"
            >
              <span>{isAr ? 'عرض كافة العمليات' : 'View All Pipeline Activities'}</span>
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>

        {/* ORDER STATUS TABLE (Col span 8) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm flex flex-col justify-between">
          {/* Top Header & Action Buttons */}
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3">
              <div>
                <h2 className="text-sm font-black text-gray-900 tracking-tight">
                  {isAr ? 'حالة الطلبات والعقود' : 'Order Status'}
                </h2>
                <p className="text-[11px] font-semibold text-gray-400 mt-0.5">
                  {isAr ? 'نظرة عامة على الشهر الأخير' : 'Overview of Latest Month'}
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                {/* + Add Button */}
                <button
                  onClick={onOpenAddDeal}
                  className="bg-[#A11212] hover:bg-[#850e0e] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <Plus size={13} />
                  <span>{isAr ? 'إضافة' : 'Add'}</span>
                </button>

                {/* Secondary Action Icons */}
                <div className="flex items-center gap-1">
                  <button
                    title="Information"
                    className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg transition-all cursor-pointer"
                  >
                    <Info size={13} />
                  </button>
                  <button
                    title="Delete Selected"
                    className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg transition-all cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                  <button
                    title="Lock View"
                    className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg transition-all cursor-pointer"
                  >
                    <Lock size={13} />
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={e => setTableSearch(e.target.value)}
                    placeholder={isAr ? 'بحث...' : 'Search...'}
                    className="bg-gray-50 border border-gray-200 rounded-lg pl-7 pr-2.5 py-1 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#A11212] w-28 sm:w-36"
                  />
                  <Search size={12} className="absolute left-2 top-2 text-gray-400 pointer-events-none" />
                </div>

                {/* Print/Export Button */}
                <button
                  title="Print / Export"
                  onClick={() => window.print()}
                  className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg transition-all cursor-pointer"
                >
                  <Printer size={13} />
                </button>
              </div>
            </div>

            {/* Dark Sleek Table Header & Rows */}
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1E293B] text-white text-[10px] font-black uppercase tracking-wider rounded-xl">
                    <th className="py-2.5 px-4 rounded-l-xl">{isAr ? 'الفاتورة' : 'INVOICE'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'العميل' : 'CUSTOMERS'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'الجهة' : 'FROM'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'السعر' : 'PRICE'}</th>
                    <th className="py-2.5 px-4 rounded-r-xl text-center">{isAr ? 'الحالة' : 'STATUS'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredOrders.map(row => (
                    <tr key={row.id + row.customer} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-600 font-mono">
                        {row.id}
                      </td>
                      <td className="py-3 px-3 font-bold text-gray-900">
                        {row.customer}
                      </td>
                      <td className="py-3 px-3 text-gray-500 font-semibold">
                        {row.country}
                      </td>
                      <td className="py-3 px-3 font-black text-gray-900 font-mono">
                        ${row.price}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-wide ${row.statusColor} shadow-xs`}>
                          {row.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table Footer: Entries info + Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100 text-xs">
            <p className="text-[11px] font-bold text-gray-400">
              {isAr
                ? `عرض 1 إلى ${filteredOrders.length} من أصل 20 مدخل`
                : `Showing 1 to ${filteredOrders.length} of 20 entries`}
            </p>

            {/* Pagination with active red circle */}
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <button
                disabled={tablePage === 1}
                onClick={() => setTablePage(prev => Math.max(1, prev - 1))}
                className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 disabled:opacity-40 cursor-pointer"
              >
                ‹
              </button>

              {[1, 2, 3, 4, 5, 6].map(page => (
                <button
                  key={page}
                  onClick={() => setTablePage(page)}
                  className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-black transition-all cursor-pointer ${
                    tablePage === page
                      ? 'bg-[#A11212] text-white shadow-xs'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                disabled={tablePage === 6}
                onClick={() => setTablePage(prev => Math.min(6, prev + 1))}
                className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 disabled:opacity-40 cursor-pointer"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── SUMMARY MODAL: "Last Month Summary" ───────────────────────────── */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#A11212]/10 text-[#A11212] flex items-center justify-center">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">
                    {isAr ? 'ملخص أداء الشهر السابق' : 'Last Month Executive Summary'}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold">
                    {isAr ? 'تقرير تحليلي مالي وتشغيلي معتمد' : 'Verified Financial & Operational Metrics'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex justify-between font-bold">
                  <span className="text-gray-500">{isAr ? 'إجمالي الإيرادات المحققة:' : 'Total Earned Revenue:'}</span>
                  <span className="text-gray-900 font-mono font-black">${stats.monthlyEarnings.toLocaleString()} OMR</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-gray-500">{isAr ? 'عدد الصفقات المنجزة:' : 'Completed Deals Count:'}</span>
                  <span className="text-emerald-700 font-mono font-black">{stats.monthlySales} {isAr ? 'عقداً' : 'deals'}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-gray-500">{isAr ? 'كفاءة التحصيل النقدي:' : 'Cash Collection Efficiency:'}</span>
                  <span className="text-[#A11212] font-mono font-black">94.2%</span>
                </div>
              </div>

              <p className="text-[11px] text-gray-500 leading-relaxed">
                {isAr
                  ? 'سجلت منصة ميسرة أداءً متميزاً خلال الشهر المنصرم مع نمو بنسبة 28% في حجم العقود الرابحة وزيادة حصة إحالات الشركاء بنسبة 55%.'
                  : 'Maisarah recorded strong quarterly growth with a 28% increase in closed won contracts, driven by high B2B partner referral velocity (55% share).'}
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="bg-[#A11212] hover:bg-[#800e0e] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                {isAr ? 'إغلاق' : 'Close Summary'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

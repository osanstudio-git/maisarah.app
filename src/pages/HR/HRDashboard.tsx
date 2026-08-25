import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import {
  Users, Clock, Calendar, AlertTriangle, CheckCircle2,
  TrendingUp, FileText, Bell, Star, CreditCard,
  UserCheck, UserX, AlertCircle, Award, Briefcase
} from 'lucide-react';

// ── Mock Data ─────────────────────────────────────────────────────────────────
const MOCK_ALERTS = [
  { type: 'urgent', msg: "Sara Al-Balushi's Residence Permit expires in 8 days." },
  { type: 'urgent', msg: "Ahmed Al-Kharusi's contract expires in 15 days." },
  { type: 'warning', msg: 'Mohammed Maamari exceeded 1-hour break limit (75 mins).' },
  { type: 'warning', msg: "3 pending leave requests awaiting HR approval." },
  { type: 'info', msg: "Today is Fatma Al-Harthy's work anniversary (3 years)! 🎉" },
];

const MOCK_PENDING = [
  { id: 'LR-001', name: 'Ahmed Al-Kharusi', type: 'Annual Leave', days: 5, submitted: 'Jun 29' },
  { id: 'LR-002', name: 'Sara Al-Balushi', type: 'Sick Leave', days: 2, submitted: 'Jun 28' },
  { id: 'REQ-003', name: 'Khalid Maamari', type: 'Salary Certificate', submitted: 'Jun 27' },
];

const MOCK_BIRTHDAYS = [
  { name: 'Noor Al-Lawati', dept: 'Audit', date: 'Today' },
  { name: 'Bader Al-Raisi', dept: 'Tax & VAT', date: 'Tomorrow' },
];

const MOCK_DEPT = [
  { name: 'Audit', count: 12, color: '#A11212' },
  { name: 'Tax & VAT', count: 9, color: '#1a56db' },
  { name: 'Accounting', count: 8, color: '#057a55' },
  { name: 'Admin', count: 6, color: '#c27803' },
  { name: 'IT', count: 4, color: '#7e3af2' },
  { name: 'HR', count: 3, color: '#e02424' },
];

// ── Sub-Components ─────────────────────────────────────────────────────────────
const KPICard = ({ label, value, sub, icon: Icon, accent = false }: any) => (
  <div className={`rounded-2xl p-6 shadow-sm border relative overflow-hidden group ${accent ? 'bg-[#A11212] text-white border-transparent' : 'bg-white border-gray-100'}`}>
    <div className={`absolute -end-4 -top-4 w-24 h-24 rounded-full blur-xl transition-transform duration-700 group-hover:scale-150 ${accent ? 'bg-white/10' : 'bg-[#A11212]/5'}`} />
    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 relative z-10 ${accent ? 'text-white/60' : 'text-gray-400'}`}>{label}</p>
    <div className="flex justify-between items-end relative z-10">
      <div>
        <p className={`text-4xl font-black leading-none ${accent ? 'text-white' : 'text-gray-900'}`}>{value}</p>
        {sub && <p className={`text-xs font-bold mt-1 ${accent ? 'text-white/60' : 'text-gray-400'}`}>{sub}</p>}
      </div>
      <Icon size={28} className={accent ? 'text-white/20' : 'text-[#A11212]/20'} />
    </div>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────
const HRDashboard = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [alerts, setAlerts] = React.useState<any[]>(MOCK_ALERTS);
  const [expiringDocsCount, setExpiringDocsCount] = React.useState(4);
  const [expiringContractsCount, setExpiringContractsCount] = React.useState(2);

  React.useEffect(() => {
    const savedDocs = localStorage.getItem('hr_documents');
    if (savedDocs) {
      const parsedDocs = JSON.parse(savedDocs) as any[];
      const expired = parsedDocs.filter(d => d.status === 'Expired');
      const expiring = parsedDocs.filter(d => d.status === 'Expiring Soon');
      
      setExpiringDocsCount(expired.length + expiring.length);

      const newAlerts: any[] = [];
      expired.forEach(d => {
        newAlerts.push({
          type: 'urgent',
          msg: `${d.employeeName}'s ${d.docType} (${d.docName}) expired on ${d.expiryDate}!`
        });
      });
      expiring.forEach(d => {
        newAlerts.push({
          type: 'warning',
          msg: `${d.employeeName}'s ${d.docType} (${d.docName}) is expiring soon (on ${d.expiryDate}).`
        });
      });

      // Merge with non-document mock alerts
      const otherAlerts = MOCK_ALERTS.filter(a => !a.msg.includes('Residence Permit') && !a.msg.includes('contract') && !a.msg.includes('Visa'));
      setAlerts([...newAlerts, ...otherAlerts]);
    }
  }, []);

  return (
    <div className="space-y-8 pb-12" dir={isAr ? 'rtl' : 'ltr'}>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label={isAr ? 'إجمالي الموظفين' : 'Total Employees'} value="42" sub="+2 this month" icon={Users} accent />
        <KPICard label={isAr ? 'الحضور اليوم' : 'Present Today'} value="38" sub="4 absent" icon={UserCheck} />
        <KPICard label={isAr ? 'في إجازة' : 'On Leave'} value="3" sub="Approved" icon={Calendar} />
        <KPICard label={isAr ? 'طلبات معلقة' : 'Pending Requests'} value="6" sub="Need action" icon={AlertCircle} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label={isAr ? 'عقود تنتهي قريبًا' : 'Expiring Contracts'} value={expiringContractsCount.toString()} sub="Within 30 days" icon={FileText} />
        <KPICard label={isAr ? 'وثائق تنتهي' : 'Expiring Docs'} value={expiringDocsCount.toString()} sub="Within 30 days" icon={Bell} />
        <KPICard label={isAr ? 'شواغر مفتوحة' : 'Open Vacancies'} value="3" sub="Recruitment active" icon={Briefcase} />
        <KPICard label={isAr ? 'تقييمات معلقة' : 'Pending Reviews'} value="5" sub="Q3 cycle" icon={Star} />
      </div>

      {/* Main Grid: Alerts + Pending + Dept Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Urgent Alerts */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2 bg-red-50/50">
            <AlertTriangle size={18} className="text-red-600" />
            <h3 className="font-black text-sm text-red-600 uppercase tracking-widest">
              {isAr ? 'تنبيهات تتطلب إجراء' : 'Action Required Alerts'}
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {alerts.map((a, i) => (
              <div key={i} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50/50 transition-colors">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  a.type === 'urgent' ? 'bg-red-500' : a.type === 'warning' ? 'bg-orange-400' : 'bg-blue-400'
                }`} />
                <p className="text-sm text-gray-700 font-medium">{a.msg}</p>
                {a.type === 'urgent' && (
                  <span className="ms-auto text-[9px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-lg uppercase tracking-widest whitespace-nowrap">Urgent</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dept Headcount */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-black text-sm text-gray-900 uppercase tracking-widest mb-5 flex items-center gap-2">
            <Users size={16} className="text-[#A11212]" />
            {isAr ? 'توزيع الأقسام' : 'Dept Headcount'}
          </h3>
          <div className="space-y-3">
            {MOCK_DEPT.map(d => (
              <div key={d.name}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-gray-700">{d.name}</span>
                  <span className="text-xs font-black text-gray-900">{d.count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${(d.count / 42) * 100}%`, backgroundColor: d.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending Approvals + Birthdays Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Pending Approvals */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
            <h3 className="font-black text-sm text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Clock size={16} className="text-[#A11212]" />
              {isAr ? 'طلبات بانتظار الاعتماد' : 'Pending Approvals'}
            </h3>
            <span className="bg-[#A11212] text-white text-[10px] font-black px-2 py-1 rounded-lg">{MOCK_PENDING.length}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {MOCK_PENDING.map(req => (
              <div key={req.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#A11212]/5 flex items-center justify-center text-[#A11212] font-black text-sm">
                    {req.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-sm text-gray-900">{req.name}</p>
                    <p className="text-[10px] text-gray-500 font-bold">{req.type} {req.days ? `· ${req.days} days` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-400 font-bold">{req.submitted}</span>
                  <button className="bg-[#A11212] text-white text-[10px] font-black px-3 py-1.5 rounded-lg hover:bg-[#800e0e] transition-colors">
                    {isAr ? 'مراجعة' : 'Review'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Birthdays & Events */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-black text-sm text-gray-900 uppercase tracking-widest mb-5 flex items-center gap-2">
            <Award size={16} className="text-[#A11212]" />
            {isAr ? 'المناسبات' : 'Events & Birthdays'}
          </h3>
          <div className="space-y-3">
            {MOCK_BIRTHDAYS.map((b, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
                <span className="text-2xl">🎂</span>
                <div>
                  <p className="font-black text-sm text-gray-900">{b.name}</p>
                  <p className="text-[10px] text-gray-500 font-bold">{b.dept} · {b.date}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="font-black text-sm text-gray-900">Fatma Al-Harthy</p>
                <p className="text-[10px] text-gray-500 font-bold">HR · 3-Year Anniversary</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Summary Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-black text-sm text-gray-900 uppercase tracking-widest mb-5 flex items-center gap-2">
          <TrendingUp size={16} className="text-[#A11212]" />
          {isAr ? 'ملخص حضور اليوم' : "Today's Attendance Summary"}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Present', value: 38, color: 'bg-green-500', pct: '90%' },
            { label: 'Absent', value: 4, color: 'bg-red-500', pct: '10%' },
            { label: 'Late', value: 2, color: 'bg-orange-400', pct: '5%' },
            { label: 'On Leave', value: 3, color: 'bg-blue-400', pct: '7%' },
          ].map(s => (
            <div key={s.label} className="text-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className={`w-3 h-3 rounded-full ${s.color} mx-auto mb-2`} />
              <p className="text-2xl font-black text-gray-900">{s.value}</p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
              <p className="text-xs font-bold text-gray-500 mt-1">{s.pct} of workforce</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;

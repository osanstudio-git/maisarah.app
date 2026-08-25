import React from 'react';
import { Briefcase, Clock, CreditCard, Wallet, AlertCircle, FileText, Upload } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useTranslation } from 'react-i18next';

const Dashboard = () => {
  const { t } = useTranslation();

  const lineData = [
    { name: '1', expenses: 10000, revenue: 15000 },
    { name: '2', expenses: 12000, revenue: 20000 },
    { name: '3', expenses: 18000, revenue: 25000 },
    { name: '4', expenses: 15000, revenue: 30000 },
    { name: '5', expenses: 22000, revenue: 35000 },
    { name: '6', expenses: 20000, revenue: 45000 },
  ];

  const pieData = [
    { name: t('dashboard.labor'), value: 40, color: '#A01020' }, // Red
    { name: t('dashboard.materials'), value: 35, color: '#DC2626' }, // Light red
    { name: t('dashboard.equipment'), value: 15, color: '#10B981' }, // Green
    { name: t('dashboard.others'), value: 10, color: '#FCD34D' }, // Yellow
  ];

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t('dashboard.activeProjects')} value="5" subtitle={t('dashboard.activeProjectsSub')} icon={<Briefcase size={24} />} iconBg="bg-red-100 text-brand-dark" />
        <StatCard title={t('dashboard.dueInvoices')} value="28,750" subtitle={t('dashboard.dueInvoicesSub')} icon={<Clock size={24} />} iconBg="bg-red-500 text-white" />
        <StatCard title={t('dashboard.expensesMonth')} value="12,300" subtitle={t('dashboard.expensesMonthSub')} subtitleColor="text-red-500" icon={<CreditCard size={24} />} iconBg="bg-red-500 text-white" />
        <StatCard title={t('dashboard.cashFlow')} value="36,800" subtitle={t('dashboard.cashFlowSub')} subtitleColor="text-green-500" icon={<Wallet size={24} />} iconBg="bg-red-500 text-white" />
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-6 xl:w-2/3">
          
          {/* Current Projects */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-gray-800">{t('dashboard.currentProjects')}</h3>
              <a href="#" className="text-sm text-brand-dark hover:underline">{t('dashboard.viewAllProjects')}</a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ProjectCard 
                title="مشروع مجمع فلل الموالح" 
                progress={65} 
                budget="58,200" 
                cost="28,000" 
                profit="+17,500" 
                profitColor="text-green-500"
                image="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=400&h=250"
                t={t}
              />
              <ProjectCard 
                title="مشروع طريق الباطنة" 
                progress={45} 
                budget="22,000" 
                cost="19,300" 
                profit="-2,700" 
                profitColor="text-red-500"
                image="https://images.unsplash.com/photo-1541888086225-ae820bf3f639?auto=format&fit=crop&q=80&w=400&h=250"
                t={t}
              />
              <ProjectCard 
                title="مشروع تشييد مبنى تجاري" 
                progress={80} 
                budget="86,500" 
                cost="39,000" 
                profit="+47,500" 
                profitColor="text-green-500"
                image="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=400&h=250"
                t={t}
              />
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-gray-800">{t('dashboard.expensesOverview')}</h3>
                <select className="text-sm border-gray-200 rounded text-gray-500 outline-none">
                  <option>{t('dashboard.thisMonth')}</option>
                </select>
              </div>
              <div className="h-64 flex items-center">
                <ResponsiveContainer width="60%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-40 space-y-3">
                  {pieData.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-gray-600">{item.name}</span>
                      </div>
                      <span className="font-semibold">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex gap-2 border-t pt-4">
                 <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-brand-dark">
                   <BarChartIcon /> {t('dashboard.financialReport')}
                 </button>
              </div>
            </div>

            {/* Line Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-gray-800">{t('dashboard.revenueVsExpenses')}</h3>
                <select className="text-sm border-gray-200 rounded text-gray-500 outline-none">
                  <option>{t('dashboard.last6Months')}</option>
                </select>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={(val) => `${val/1000}k`} />
                    <Line type="monotone" dataKey="revenue" stroke="#A01020" strokeWidth={3} dot={{ r: 4, fill: '#A01020' }} name={t('dashboard.revenue')} />
                    <Line type="monotone" dataKey="expenses" stroke="#374151" strokeWidth={3} dot={{ r: 4, fill: '#374151' }} name={t('dashboard.expenses')} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 rounded-full bg-brand-dark"></div> {t('dashboard.revenue')}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 rounded-full bg-gray-700"></div> {t('dashboard.expenses')}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="font-bold text-lg text-gray-800 mb-4">{t('dashboard.quickActions')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <QuickAction icon={<Briefcase size={20} />} label={t('dashboard.newProject')} />
              <QuickAction icon={<Upload size={20} />} label={t('dashboard.uploadDocument')} />
              <QuickAction icon={<Wallet size={20} />} label={t('dashboard.newExpense')} />
              <QuickAction icon={<FileText size={20} />} label={t('dashboard.newInvoice')} />
            </div>
          </div>
        </div>

        {/* Side Panels */}
        <div className="w-full xl:w-1/3 space-y-6">
          
          {/* Tax Alerts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1 bg-red-500 h-full"></div>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center flex-shrink-0 relative">
                <AlertCircle size={18} />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{t('dashboard.taxAlerts')}</h3>
                <p className="text-sm text-gray-600 mt-1">{t('dashboard.taxAlertDesc')} <strong className="text-brand-dark">{t('dashboard.days')}</strong></p>
              </div>
            </div>
            <button className="w-full bg-brand-dark hover:bg-red-800 text-white font-medium py-2.5 rounded-lg transition-colors text-sm">
              {t('dashboard.prepareTax')}
            </button>
          </div>

          {/* Recent Documents */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800">{t('dashboard.recentDocuments')}</h3>
              <a href="#" className="text-xs text-brand-dark hover:underline">{t('dashboard.viewAll')}</a>
            </div>
            <div className="space-y-4">
              <DocumentRow title="عقد مشروع فلل الموالح" />
              <DocumentRow title="فاتورة مواد - مشروع طريق" />
              <DocumentRow title="كشف حساب عميل" />
            </div>
          </div>

          {/* Upcoming Payments */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800">{t('dashboard.upcomingPayments')}</h3>
              <a href="#" className="text-xs text-brand-dark hover:underline">{t('dashboard.viewAll')}</a>
            </div>
            <div className="space-y-4">
              <PaymentRow title="وزارة الإسكان" amount="18,500" date="25 مارس 2025" />
              <PaymentRow title="شركة الباطنة للتجارة" amount="12,800" date="31 مارس 2025" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

/* Subcomponents for cleaner code */

const StatCard = ({ title, value, subtitle, subtitleColor = 'text-gray-500', icon, iconBg }: any) => (
  <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex items-start justify-between">
    <div>
      <h4 className="text-gray-500 text-sm font-medium mb-1">{title}</h4>
      <div className="text-2xl font-bold text-gray-800 mb-1">{value}</div>
      <p className={`text-xs ${subtitleColor}`}>{subtitle}</p>
    </div>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
      {icon}
    </div>
  </div>
);

const ProjectCard = ({ title, progress, budget, cost, profit, profitColor, image, t }: any) => (
  <div className="border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
    <div className="h-32 bg-gray-200 relative">
       <img src={image} alt={title} className="w-full h-full object-cover" />
       <div className="absolute bottom-2 right-2 bg-brand-dark text-white text-xs px-2 py-1 rounded">
         {t('dashboard.inProgress')}
       </div>
       <div className="absolute bottom-2 left-2 bg-white/90 text-brand-dark text-xs px-2 py-1 rounded font-bold">
         {progress}%
       </div>
    </div>
    <div className="p-4">
      <h4 className="font-bold text-sm text-gray-800 mb-4">{title}</h4>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between border-b pb-1">
          <span className="text-gray-500">{t('dashboard.budget')}</span>
          <span className="font-semibold">{budget}</span>
        </div>
        <div className="flex justify-between border-b pb-1">
          <span className="text-gray-500">{t('dashboard.costSoFar')}</span>
          <span className="font-semibold">{cost}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">{t('dashboard.profit')}</span>
          <span className={`font-bold ${profitColor}`}>{profit}</span>
        </div>
      </div>
    </div>
  </div>
);

const QuickAction = ({ icon, label }: any) => (
  <button className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm hover:border-brand-dark hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group">
    <div className="text-brand-dark group-hover:scale-110 transition-transform">{icon}</div>
    <span className="text-sm font-medium text-gray-700">{label}</span>
  </button>
);

const DocumentRow = ({ title }: { title: string }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded bg-red-100 text-brand-dark flex items-center justify-center flex-shrink-0">
        <span className="text-[10px] font-bold">PDF</span>
      </div>
      <span className="text-sm text-gray-700 font-medium">{title}</span>
    </div>
  </div>
);

const PaymentRow = ({ title, amount, date }: any) => (
  <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
    <div>
      <h4 className="text-sm font-bold text-gray-800">{title}</h4>
      <p className="text-xs text-gray-500">{date}</p>
    </div>
    <div className="text-start">
      <div className="font-bold text-brand-dark">{amount}</div>
    </div>
  </div>
);

const BarChartIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"></line>
    <line x1="12" y1="20" x2="12" y2="4"></line>
    <line x1="6" y1="20" x2="6" y2="14"></line>
  </svg>
);

export default Dashboard;

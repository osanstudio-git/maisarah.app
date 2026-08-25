import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Users, 
  FileText, 
  Briefcase,
  LogOut,
  BarChart2,
  Settings,
  Receipt,
  Wallet,
  MessageCircle,
  Folder,
  Building2,
  Layers,
  PieChart,
  ClipboardCheck,
  Activity,
  FileBarChart,
  Target,
  Clock,
  Calendar,
  UserPlus,
  Star,
  FileCheck,
  AlertOctagon,
  TrendingUp,
  DoorOpen,
  Bot,
  Bell,
  CreditCard
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';

const Sidebar = ({ isOpen, toggleSidebar }: { isOpen: boolean, toggleSidebar: () => void }) => {
  const { t, i18n } = useTranslation();
  const { role, signOut } = useAuth();
  const isAr = i18n.language === 'ar';

  // Define menus based on role
  const getMenuItems = () => {
    switch (role) {
      case 'employee':
        return [
          { title: t('employee.dashboardTitle'), icon: Home, path: '/employee' },
          { title: t('employee.clientManager'), icon: Users, path: '/employee/clients' },
          { title: t('employee.invoiceCreator'), icon: FileText, path: '/employee/invoices' },
          { title: t('employee.tasksView'), icon: Briefcase, path: '/employee/tasks' },
          { title: isAr ? 'إدارة الخدمات' : 'Services', icon: Receipt, path: '/employee/services' },
          { title: isAr ? 'الخدمة الذاتية (ESS)' : 'Self-Service (ESS)', icon: Clock, path: '/employee/hr' },
          { title: t('messaging.messages'), icon: MessageCircle, path: '/employee/messages' },
          { title: t('vault.documents'), icon: Folder, path: '/employee/documents' },
        ];
      case 'accountant':
        return [
          { title: t('accountant.dashboardTitle'), icon: Home, path: '/accountant' },
          { title: t('accountant.invoiceManagement'), icon: FileText, path: '/accountant/invoices' },
          { title: t('accountant.expenseTracking'), icon: Wallet, path: '/accountant/expenses' },
          { title: t('messaging.messages'), icon: MessageCircle, path: '/accountant/messages' },
          { title: t('vault.documents'), icon: Folder, path: '/accountant/documents' },
        ];
      case 'manager':
        return [
          { title: isAr ? 'لوحة القيادة التنفيذية' : 'Executive Dashboard', icon: BarChart2, path: '/manager' },
          { title: isAr ? 'مركز العمليات' : 'Operations Center', icon: Activity, path: '/manager/operations' },
          { title: isAr ? 'الرقابة المالية' : 'Financial Control', icon: Wallet, path: '/manager/finance' },
          { title: isAr ? 'ذكاء العملاء' : 'Client Intelligence', icon: Building2, path: '/manager/clients' },
          { title: isAr ? 'أداء الأقسام' : 'Department Performance', icon: Layers, path: '/manager/departments' },
          { title: isAr ? 'إدارة الموظفين والتعيينات' : 'Employee Placements', icon: Users, path: '/manager/hr' },
          { title: isAr ? 'التحليلات الاستراتيجية' : 'Strategic Analytics', icon: Target, path: '/manager/analytics' },
          { title: isAr ? 'الاعتمادات التنفيذية' : 'Executive Approvals', icon: ClipboardCheck, path: '/manager/approvals' },
          { title: isAr ? 'التقارير' : 'Reports', icon: FileBarChart, path: '/manager/reports' },
          { title: isAr ? 'سجل النشاطات' : 'Activity Log', icon: FileText, path: '/manager/activity-log' },
          { title: t('messaging.messages'), icon: MessageCircle, path: '/manager/messages' },
          { title: t('vault.documents'), icon: Folder, path: '/manager/documents' },
        ];
      case 'hr':
        return [
          { title: isAr ? 'لوحة القيادة' : 'HR Dashboard',         icon: BarChart2,      path: '/hr/dashboard' },
          { title: isAr ? 'ملفات الموظفين' : 'Employee Files',       icon: Users,          path: '/hr/employees' },
          { title: isAr ? 'الحضور والانصراف' : 'Attendance',        icon: Clock,          path: '/hr/attendance' },
          { title: isAr ? 'إدارة الإجازات' : 'Leave Management',    icon: Calendar,       path: '/hr/leave' },
          { title: isAr ? 'الطلبات الإلكترونية' : 'Online Requests', icon: ClipboardCheck, path: '/hr/requests' },
          { title: isAr ? 'الرواتب' : 'Payroll',                   icon: CreditCard,     path: '/hr/payroll' },
          { title: isAr ? 'تقييم الأداء' : 'Performance',          icon: Star,           path: '/hr/performance' },
          { title: isAr ? 'إدارة العقود' : 'Contracts',            icon: FileCheck,      path: '/hr/contracts' },
          { title: isAr ? 'إدارة الوثائق' : 'Documents',           icon: Folder,         path: '/hr/documents' },
          { title: isAr ? 'الجزاءات والمكافآت' : 'Disciplinary',    icon: AlertOctagon,   path: '/hr/disciplinary' },
          { title: isAr ? 'التوظيف' : 'Recruitment',               icon: UserPlus,       path: '/hr/recruitment' },
          { title: isAr ? 'الموظفون الجدد' : 'Onboarding',         icon: TrendingUp,     path: '/hr/onboarding' },
          { title: isAr ? 'انتهاء الخدمة' : 'Termination',         icon: DoorOpen,       path: '/hr/termination' },
          { title: isAr ? 'التقارير' : 'Reports',                  icon: FileBarChart,   path: '/hr/reports' },
          { title: isAr ? 'مساعد الذكاء الاصطناعي' : 'AI Assistant', icon: Bot,           path: '/hr/ai' },
        ];
      case 'crm':
        return [
          { title: isAr ? 'لوحة قيادة CRM' : 'CRM Dashboard', icon: Home, path: '/crm/dashboard' },
          { title: isAr ? 'إدارة العملاء والفرص' : 'Clients & Leads', icon: Users, path: '/crm/clients' },
          { title: isAr ? 'خط تأهيل الفرص' : 'Lead Pipeline', icon: Target, path: '/crm/leads' },
          { title: isAr ? 'إدارة العمل المركب' : 'Combo Work', icon: Layers, path: '/crm/combo' },
          { title: isAr ? 'الاعتمادات المالية' : 'Financial Controls', icon: FileCheck, path: '/crm/financials' },
          { title: isAr ? 'التذكيرات والمهام' : 'Reminders & Tasks', icon: Clock, path: '/crm/reminders' },
          { title: isAr ? 'نادي الأعمال' : 'Business Club', icon: Star, path: '/crm/club' },
          { title: t('messaging.messages'), icon: MessageCircle, path: '/crm/messages' },
          { title: t('vault.documents'), icon: Folder, path: '/crm/documents' },
        ];
      case 'client':
        return [
          { title: t('client.dashboardTitle'), icon: Home, path: '/client' },
          { title: t('messaging.messages'), icon: MessageCircle, path: '/client/messages' },
          { title: t('vault.documents'), icon: Folder, path: '/client/documents' },
        ];
      default:
        return []; // Fallback for no role / loading
    }
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside 
        dir={isAr ? 'rtl' : 'ltr'}
        className={`
          fixed top-0 h-screen w-64 bg-brand-dark text-white flex flex-col z-50 transition-transform duration-300
          ${isAr ? 'right-0' : 'left-0'}
          ${isOpen 
            ? 'translate-x-0' 
            : (isAr ? 'translate-x-full' : '-translate-x-full')
          }
          lg:translate-x-0
        `}
      >
        {/* Logo Area */}
        <div className={`p-6 flex items-center gap-3 ${isAr ? 'flex-row' : 'flex-row'}`}>
          <div className="w-10 h-10 bg-white rounded flex items-center justify-center text-brand-dark font-bold text-xl flex-shrink-0">
            {isAr ? 'م' : 'M'}
          </div>
          <div className={isAr ? 'text-right' : 'text-left'}>
            <h1 className="text-xl font-bold leading-none">{isAr ? 'ميسرة' : 'Maisarah'}</h1>
            <p className="text-[10px] text-red-200 mt-1 uppercase tracking-wider font-bold">
              {isAr ? 'النظام المالي' : 'Financial System'}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto mt-6 scrollbar-hide">
          <ul className="space-y-2 px-4">
            {menuItems.map((item, index) => (
              <li key={index}>
                <NavLink 
                  to={item.path}
                  onClick={() => {
                    if (window.innerWidth < 1024) toggleSidebar();
                  }}
                  end
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${isAr ? 'flex-row' : 'flex-row'}
                    ${isActive 
                      ? 'bg-red-900 shadow-inner font-bold text-white scale-[1.02]' 
                      : 'text-red-100 hover:bg-red-800/40 hover:translate-x-1 ltr:hover:translate-x-1 rtl:hover:-translate-x-1'}
                  `}
                >
                  <item.icon size={20} className="flex-shrink-0 opacity-90" />
                  <span className="text-sm truncate">{item.title}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom Profile / Logout */}
        <div className="p-6 border-t border-red-800/50 mt-auto">
          <button 
            onClick={signOut}
            className={`
              flex items-center gap-2 w-full py-3 px-4 border border-red-400/30 rounded-xl text-sm font-bold
              hover:bg-red-800 hover:border-red-400 transition-all active:scale-95
              ${isAr ? 'flex-row' : 'flex-row'}
            `}
          >
            <LogOut size={18} />
            <span>{t('sidebar.logout')}</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

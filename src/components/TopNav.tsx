import React from 'react';
import { Bell, HelpCircle, Settings, Menu, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import LanguageSwitcher from './LanguageSwitcher';

const TopNav = ({ toggleSidebar }: { toggleSidebar: () => void }) => {
  const { t, i18n } = useTranslation();
  const { signOut, user, role, secondaryRoles, switchPortal } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [isPortalDropdownOpen, setIsPortalDropdownOpen] = React.useState(false);
  const isAr = i18n.language === 'ar';
  const isClient = role === 'client';
  const displayName = user?.user_metadata?.full_name || 
                      user?.email?.split('@')[0] || 
                      (isAr ? 'المستخدم' : 'User');

  const portalNames: Record<string, { en: string; ar: string; icon: string }> = {
    accountant: { en: 'Accountant Portal', ar: 'بوابة المحاسب والفواتير', icon: '💼' },
    employee: { en: 'Staff Workspace', ar: 'مساحة عمل الموظف', icon: '👤' },
    department_head: { en: 'HOD Leadership', ar: 'بوابة رئيس القسم (HOD)', icon: '👑' },
    hr: { en: 'HR Control Center', ar: 'إدارة الموارد البشرية', icon: '📋' },
    crm: { en: 'CRM & Client Portal', ar: 'بوابة علاقات العملاء', icon: '🤝' },
    manager: { en: 'Executive Manager Panel', ar: 'لوحة المدير التنفيذي', icon: '⭐' }
  };

  // Allow switching only for employees/staff with explicitly assigned secondary roles (manager does not switch portals)
  const availablePortals = React.useMemo(() => {
    if (role === 'manager') return [];
    const list = new Set<string>();
    if (role) list.add(role);
    (secondaryRoles || []).forEach(r => list.add(r));
    return Array.from(list);
  }, [role, secondaryRoles]);

  return (
    <header 
      dir={isAr ? 'rtl' : 'ltr'}
      className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-xs"
    >
      <div className="flex items-center gap-4">
        {!isClient && (
          <button 
            onClick={toggleSidebar}
            className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg cursor-pointer"
          >
            <Menu size={24} />
          </button>
        )}
        <div className={isAr ? 'text-right' : 'text-left'}>
          <h2 className="text-2xl font-bold text-gray-800">
            {isAr ? `مرحباً، ${displayName}` : `Welcome, ${displayName}`}
          </h2>
          <p className="text-sm text-gray-500 hidden sm:block">{t('topNav.subtitle')}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Switch Portal Dropdown */}
        {!isClient && availablePortals.length > 1 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => { setIsPortalDropdownOpen(!isPortalDropdownOpen); setIsProfileOpen(false); }}
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-50 to-amber-50 hover:from-red-100 hover:to-amber-100 border border-red-200/60 rounded-xl text-xs font-black text-brand-dark transition-all shadow-xs cursor-pointer"
            >
              <span>🔄</span>
              <span className="hidden md:inline">{isAr ? 'تبديل البوابة' : 'Switch Portal'}</span>
              <ChevronDown size={14} className="text-brand-dark" />
            </button>

            {isPortalDropdownOpen && (
              <div className={`absolute mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-scale-up ${isAr ? 'left-0' : 'right-0'}`}>
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    {isAr ? 'البوابات المتاحة لك' : 'Your Authorized Portals'}
                  </p>
                </div>
                <div className="py-1">
                  {availablePortals.map(pKey => {
                    const info = portalNames[pKey] || { en: pKey, ar: pKey, icon: '🌐' };
                    const isActive = role === pKey;
                    return (
                      <button
                        key={pKey}
                        onClick={() => {
                          setIsPortalDropdownOpen(false);
                          switchPortal(pKey);
                        }}
                        className={`w-full px-4 py-2.5 text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                          isActive 
                            ? 'bg-red-50 text-[#A11212] font-black' 
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{info.icon}</span>
                          <span>{isAr ? info.ar : info.en}</span>
                        </span>
                        {isActive && <span className="text-[10px] font-black bg-[#A11212] text-white px-2 py-0.5 rounded-full">{isAr ? 'نشط' : 'Active'}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <LanguageSwitcher />

        <div className="flex items-center gap-2 sm:gap-3 text-brand-dark">
          <button className="relative p-2 hover:bg-red-50 rounded-full transition-colors hidden sm:block cursor-pointer">
            <Bell size={20} />
            <span className={`absolute top-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white ${isAr ? 'left-2' : 'right-2'}`}>
              3
            </span>
          </button>
          <button className="p-2 hover:bg-red-50 rounded-full transition-colors hidden sm:block cursor-pointer">
            <HelpCircle size={20} />
          </button>
          <button className="p-2 hover:bg-red-50 rounded-full transition-colors hidden sm:block cursor-pointer">
            <Settings size={20} />
          </button>
        </div>

        <div className="h-8 w-px bg-gray-200 hidden md:block"></div>

        <div className="relative">
          <div 
            className="hidden md:flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg"
            onClick={() => { setIsProfileOpen(!isProfileOpen); setIsPortalDropdownOpen(false); }}
          >
            <div className="w-9 h-9 rounded-full bg-brand-dark flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className={isAr ? 'text-right' : 'text-left'}>
              <p className="font-semibold text-xs text-gray-800 flex items-center gap-1">
                {user?.email?.split('@')[0] || 'User'} <ChevronDown size={14} className="text-gray-500" />
              </p>
              <p className="text-[11px] text-gray-500 capitalize">{role ? (portalNames[role]?.[isAr ? 'ar' : 'en'] || role) : t('topNav.role')}</p>
            </div>
          </div>

          {/* Dropdown Menu */}
          {isProfileOpen && (
            <div className={`absolute mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-scale-up ${isAr ? 'left-0' : 'right-0'}`}>
              <div className="px-4 py-2 border-b border-gray-100 md:hidden">
                <p className="font-bold text-sm text-gray-800 truncate">{user?.email}</p>
                <p className="text-xs text-gray-500 capitalize">{role}</p>
              </div>
              <button 
                onClick={signOut}
                className={`w-full px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 font-bold transition flex items-center gap-2 cursor-pointer ${isAr ? 'text-right' : 'text-left'}`}
              >
                {t('sidebar.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNav;

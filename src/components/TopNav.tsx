import React from 'react';
import { Bell, HelpCircle, Settings, Menu, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import LanguageSwitcher from './LanguageSwitcher';

const TopNav = ({ toggleSidebar }: { toggleSidebar: () => void }) => {
  const { t, i18n } = useTranslation();
  const { signOut, user, role } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const isAr = i18n.language === 'ar';
  const isClient = role === 'client';

  return (
    <header 
      dir={isAr ? 'rtl' : 'ltr'}
      className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30"
    >
      <div className="flex items-center gap-4">
        {!isClient && (
          <button 
            onClick={toggleSidebar}
            className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            <Menu size={24} />
          </button>
        )}
        <div className={isAr ? 'text-right' : 'text-left'}>
          <h2 className="text-2xl font-bold text-gray-800">{t('topNav.welcome')}</h2>
          <p className="text-sm text-gray-500 hidden sm:block">{t('topNav.subtitle')}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-6">
        <LanguageSwitcher />

        <div className="flex items-center gap-2 sm:gap-4 text-brand-dark">
          <button className="relative p-2 hover:bg-red-50 rounded-full transition-colors hidden sm:block">
            <Bell size={24} />
            <span className={`absolute top-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white ${isAr ? 'left-2' : 'right-2'}`}>
              3
            </span>
          </button>
          <button className="p-2 hover:bg-red-50 rounded-full transition-colors hidden sm:block">
            <HelpCircle size={24} />
          </button>
          <button className="p-2 hover:bg-red-50 rounded-full transition-colors hidden sm:block">
            <Settings size={24} />
          </button>
        </div>

        <div className="h-10 w-px bg-gray-200 hidden md:block"></div>

        <div className="relative">
          <div 
            className="hidden md:flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            <div className="w-10 h-10 rounded-full bg-brand-dark flex items-center justify-center text-white font-bold flex-shrink-0">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className={isAr ? 'text-right' : 'text-left'}>
              <p className="font-semibold text-sm text-gray-800 flex items-center gap-1">
                {user?.email?.split('@')[0] || 'User'} <ChevronDown size={14} className="text-gray-500" />
              </p>
              <p className="text-xs text-gray-500 capitalize">{role || t('topNav.role')}</p>
            </div>
          </div>

          {/* Dropdown Menu */}
          {isProfileOpen && (
            <div className={`absolute mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 ${isAr ? 'left-0' : 'right-0'}`}>
              <div className="px-4 py-2 border-b border-gray-100 md:hidden">
                <p className="font-bold text-sm text-gray-800 truncate">{user?.email}</p>
                <p className="text-xs text-gray-500 capitalize">{role}</p>
              </div>
              <button 
                onClick={signOut}
                className={`w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium transition flex items-center gap-2 ${isAr ? 'text-right' : 'text-left'}`}
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

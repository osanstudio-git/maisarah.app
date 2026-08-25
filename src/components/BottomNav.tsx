import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Briefcase, Folder, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const BottomNav = () => {
  const { t } = useTranslation();

  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const navItems = [
    { icon: Home, path: '/client', label: t('client.dashboardTitle') },
    { icon: Briefcase, path: '/client/services', label: isAr ? 'خدماتي' : 'Services' }, // Assuming this route exists or will
    { icon: Folder, path: '/client/documents', label: t('vault.documents') },
    { icon: MessageCircle, path: '/client/messages', label: t('messaging.messages') },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 px-2 pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            className={({ isActive }) => `
              flex flex-col items-center justify-center w-full h-full transition-colors
              ${isActive ? 'text-brand-dark' : 'text-gray-400 hover:text-gray-600'}
            `}
          >
            <item.icon size={20} />
            <span className="text-[10px] mt-1 font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;

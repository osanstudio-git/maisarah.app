import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import BottomNav from './BottomNav';
import { useAuth } from '../hooks/useAuth';

export const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { role } = useAuth();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const isClient = role === 'client';

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="flex h-screen overflow-hidden bg-gray-50 font-inter">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col overflow-hidden w-full 
        ${isAr ? 'lg:mr-64 lg:ml-0' : 'lg:ml-64 lg:mr-0'} 
        ${isClient ? 'pb-16 lg:pb-0' : ''}`}
      >
        <TopNav toggleSidebar={toggleSidebar} />
        
        {/* Scrollable page content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 md:p-6">
          <Outlet />
        </main>

        {/* Bottom Nav for clients on subroutes if not on root client dashboard */}
        {isClient && window.location.pathname !== '/client' && <BottomNav />}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import BottomNav from './BottomNav';
import { useAuth } from '../hooks/useAuth';

export const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { role } = useAuth();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const isClient = role === 'client';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 font-inter">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col overflow-hidden w-full 
        lg:mr-72 rtl:lg:mr-72 rtl:lg:ml-0 ltr:lg:ml-72 ltr:lg:mr-0 
        ${isClient ? 'pb-16 lg:pb-0' : ''}`}
      >
        <TopNav toggleSidebar={toggleSidebar} />
        
        {/* Scrollable page content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 md:p-6">
          <Outlet />
        </main>

        {/* Bottom Nav for clients on mobile */}
        {isClient && <BottomNav />}
      </div>
    </div>
  );
};

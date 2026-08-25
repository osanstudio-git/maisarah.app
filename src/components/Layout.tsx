import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-brand-light">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopNav toggleSidebar={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

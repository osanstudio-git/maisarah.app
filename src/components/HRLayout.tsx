import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Clock,
  Calendar,
  FileText,
  MessageSquare,
  Briefcase,
  Menu,
  X,
  LogOut,
  Settings
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const HRLayout = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const navItems = [
    { path: '/hr/dashboard', icon: Briefcase, label: isAr ? 'لوحة القيادة' : 'HR Dashboard' },
    { path: '/hr/directory', icon: Users, label: isAr ? 'دليل الموظفين' : 'Employee Directory' },
    { path: '/hr/attendance', icon: Clock, label: isAr ? 'سجل الحضور' : 'Live Attendance' },
    { path: '/hr/leave', icon: Calendar, label: isAr ? 'إدارة الإجازات' : 'Leave Management' },
    { path: '/hr/recruitment', icon: Users, label: isAr ? 'مسار التوظيف' : 'Recruitment Pipeline' },
    { path: '/hr/messages', icon: MessageSquare, label: isAr ? 'المراسلات' : 'Corporate Messages' },
    { path: '/hr/settings', icon: Settings, label: isAr ? 'الإعدادات' : 'Settings' }
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* Mobile Menu Toggle */}
      <button 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 start-4 z-50 p-2 bg-white rounded-xl shadow-md text-[#A11212]"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 start-0 z-40
        w-72 bg-white border-e border-gray-100 shadow-sm
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Branding */}
        <div className="p-8 border-b border-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-[#A11212] text-white rounded-2xl mx-auto flex items-center justify-center font-black text-2xl shadow-md mb-3">
              HR
            </div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Maisarah<span className="text-[#A11212]">OS</span></h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Human Resources</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
          {navItems.map((item) => {
            const isActive = location.pathname.includes(item.path);
            return (
              <Link 
                key={item.path} 
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all ${
                  isActive 
                  ? 'bg-[#A11212] text-white shadow-md font-black' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-[#A11212] font-bold'
                }`}
              >
                <item.icon size={20} className={isActive ? 'text-white' : 'text-gray-400'} />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-4 px-4 py-3 w-full rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 font-bold transition-all text-start"
          >
            <LogOut size={20} />
            <span className="text-sm">{isAr ? 'تسجيل الخروج' : 'Log Out'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-8 pt-20 lg:pt-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default HRLayout;

import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutGrid,
  Users,
  Send,
  CheckSquare,
  Building2,
  Layers,
  FileBarChart,
  Menu,
  X,
  LogOut,
  Settings,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

const HODLayout = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const location = useLocation();
  const { signOut, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [deptContext, setDeptContext] = useState<string>('audit');
  const [deptName, setDeptName] = useState<string>('Audit');

  useEffect(() => {
    // Dynamic Department Context fetch from Supabase Profiles Table
    const fetchDepartmentContext = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('department_id, department, name')
          .eq('id', user.id)
          .maybeSingle();

        const deptValue = data?.department_id || data?.department;
        if (deptValue) {
          // Normalize to config keys: audit, tax_vat, bookkeeping, business_advisory, client_success
          let dept = deptValue.trim().toLowerCase();
          if (dept === 'tax & vat' || dept === 'tax_and_vat' || dept === 'tax') dept = 'tax_vat';
          if (dept === 'business advisory' || dept === 'advisory') dept = 'business_advisory';
          if (dept === 'client success' || dept === 'operations') dept = 'client_success';
          
          setDeptContext(dept);

          // Pretty format names
          const names: Record<string, string> = {
            audit: isAr ? 'تدقيق الحسابات' : 'Audit',
            tax_vat: isAr ? 'الضرائب وضريبة القيمة المضافة' : 'Tax & VAT',
            bookkeeping: isAr ? 'مسك الدفاتر' : 'Bookkeeping',
            business_advisory: isAr ? 'الاستشارات وتطوير الأعمال' : 'Business Advisory',
            client_success: isAr ? 'نجاح العملاء والعمليات' : 'Client Success'
          };
          setDeptName(names[dept] || deptValue);
        }
      } catch (err) {
        console.error("Error fetching department context:", err);
      }
    };

    fetchDepartmentContext();
  }, [user, isAr]);

  const navItems = [
    { path: '/hod/dashboard', icon: LayoutGrid, label: isAr ? 'لوحة قيادة القسم' : 'Dashboard' },
    { path: '/hod/team-leadership', icon: Users, label: isAr ? 'قيادة الفريق' : 'Team Leadership' },
    { path: '/hod/work-routing', icon: Send, label: isAr ? 'توجيه المهام' : 'Work Routing' },
    { path: '/hod/quality-control', icon: CheckSquare, label: isAr ? 'رقابة الجودة والاعتمادات' : 'Quality Control' },
    { path: '/hod/client-directory', icon: Building2, label: isAr ? 'دليل عملاء القسم' : 'Client Directory' },
    { path: '/hod/coordination', icon: Layers, label: isAr ? 'تنسيق المشروعات المشتركة' : 'Coordination Hub' },
    { path: '/hod/performance', icon: FileBarChart, label: isAr ? 'تقارير الأداء والأرشيف' : 'Performance Reports' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Mobile Menu Toggle Button */}
      <button 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 start-4 z-50 p-2 bg-white rounded-xl shadow-md text-[#A11212] focus:outline-none hover:bg-gray-50 transition-colors"
      >
        {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed lg:static inset-y-0 start-0 z-40
        w-72 bg-white border-e border-gray-100 shadow-sm
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : (isAr ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0')}
        flex flex-col
      `}>
        {/* Brand Header */}
        <div className="p-8 border-b border-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-[#A11212] text-white rounded-2xl mx-auto flex items-center justify-center font-black text-2xl shadow-md mb-3">
              HOD
            </div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">
              Maisarah<span className="text-[#A11212]">OS</span>
            </h2>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-[#A11212] text-[10px] font-black uppercase tracking-wider rounded-full">
              <Briefcase size={10} />
              <span>{deptName} Head</span>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation Menu Items */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-4 px-4.5 py-3.5 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-[#A11212] text-white shadow-md font-black scale-[1.01]' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-[#A11212] font-bold'
                }`}
              >
                <item.icon size={18} className={isActive ? 'text-white' : 'text-gray-400'} />
                <span className="text-xs uppercase tracking-wider">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer Action */}
        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={signOut}
            className="flex items-center gap-4 px-4 py-3 w-full rounded-xl text-gray-500 hover:bg-red-50 hover:text-[#A11212] font-bold transition-all text-start"
          >
            <LogOut size={18} />
            <span className="text-xs uppercase tracking-wider">{isAr ? 'تسجيل الخروج' : 'Log Out'}</span>
          </button>
        </div>
      </aside>

      {/* Main Page Render Area */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-8 pt-20 lg:pt-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <Outlet context={{ deptContext }} />
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default HODLayout;

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { 
  Briefcase, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Search, 
  Plus, 
  CreditCard,
  AlertCircle,
  X,
  ArrowRight,
  ShieldCheck,
  FileText
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Mock Available Services for the "Start New Service" Menu
// ---------------------------------------------------------------------------
const AVAILABLE_SERVICES = [
  { id: 'vat', title_en: 'VAT Filing & Compliance', title_ar: 'إقرار ضريبة القيمة المضافة', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'audit', title_en: 'Annual Financial Audit', title_ar: 'التدقيق المالي السنوي', icon: ShieldCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'zakat', title_en: 'Zakat & Tax Advisory', title_ar: 'الزكاة والاستشارات الضريبية', icon: Briefcase, color: 'text-green-600', bg: 'bg-green-50' },
  { id: 'bookkeeping', title_en: 'Monthly Bookkeeping', title_ar: 'مسك الدفاتر المحاسبية', icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-50' },
];

const ServiceTracker = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { user } = useAuth();
  
  const [services, setServices] = useState<any[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Client's Services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('client_id', user?.id)
        .order('created_at', { ascending: false });

      if (servicesError) throw servicesError;

      // 2. Fetch Client's Unpaid Invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', user?.id)
        .in('status', ['unpaid', 'overdue']);

      if (invoicesError) throw invoicesError;

      setServices(servicesData || []);
      setUnpaidInvoices(invoicesData || []);
    } catch (err) {
      console.error("Error fetching service tracker data:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter(s => 
    s.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if a service has a corresponding unpaid invoice (simplified matching for demo)
  // In a real app, you might have a direct FK, but here we can check if there are ANY unpaid invoices for this client
  const hasUnpaidInvoice = unpaidInvoices.length > 0;

  return (
    <div className="space-y-6 pb-24 lg:pb-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">{isAr ? 'تتبع الخدمات' : 'Service Tracker'}</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">{isAr ? 'إدارة ومتابعة طلباتك' : 'Manage & track your requests'}</p>
        </div>
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="bg-brand-dark text-white px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-brand-dark/20 hover:scale-105 active:scale-95 transition-all w-full sm:w-auto justify-center"
        >
          <Plus size={20} /> {isAr ? 'بدء خدمة جديدة' : 'Start New Service'}
        </button>
      </div>

      {/* Global Payment Alert if unpaid invoices exist */}
      {hasUnpaidInvoice && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-sm font-black text-amber-900 uppercase tracking-tight">{isAr ? 'دفعات مستحقة' : 'Outstanding Payments'}</p>
              <p className="text-xs text-amber-700">{isAr ? `لديك ${unpaidInvoices.length} فواتير غير مدفوعة` : `You have ${unpaidInvoices.length} unpaid invoices`}</p>
            </div>
          </div>
          <button className="bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-amber-700 transition-colors whitespace-nowrap">
            {isAr ? 'دفع الكل' : 'Pay All'}
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-dark transition-colors" size={20} />
        <input 
          type="text" 
          placeholder={isAr ? 'ابحث في خدماتك...' : 'Search your services...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full ps-12 pe-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none focus:ring-4 focus:ring-red-700/5 focus:border-brand-dark transition-all text-sm font-medium"
        />
      </div>

      {/* Service Card List */}
      {loading ? (
        <div className="flex justify-center p-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-dark"></div>
        </div>
      ) : filteredServices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredServices.map(service => {
            // Simplified logic: If the client has ANY unpaid invoice, show Pay Now on all ongoing services for demo
            // In reality, this would be per-service.
            const showPayNow = service.status !== 'completed' && hasUnpaidInvoice;
            
            return (
              <div key={service.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col h-full">
                {/* Visual Accent */}
                <div className={`absolute top-0 right-0 w-2 h-full ${
                  service.status === 'completed' ? 'bg-green-500' : 'bg-brand-dark'
                }`}></div>

                {/* Card Top: Icon & Status */}
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-6 ${
                    service.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-brand-dark'
                  }`}>
                    <Briefcase size={28} />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
                      service.status === 'completed' ? 'bg-green-100 text-green-700' : 
                      service.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {service.status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-lg font-black text-gray-900 mb-2 leading-tight">{service.title}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-6 font-medium leading-relaxed">{service.description}</p>
                  
                  {/* Progress Section */}
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isAr ? 'نسبة الإنجاز' : 'Progress'}</span>
                      <span className="text-xs font-black text-brand-dark">45%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden p-0.5">
                      <div className="bg-gradient-to-r from-brand-dark to-red-800 h-full rounded-full transition-all duration-1000 shadow-sm" style={{ width: '45%' }}></div>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-5 border-t border-gray-50 flex items-center justify-between gap-3 mt-auto">
                  {showPayNow ? (
                    <button className="flex-1 bg-brand-dark hover:bg-red-800 text-white text-[10px] font-black uppercase tracking-widest py-3 px-4 rounded-xl transition-all shadow-md shadow-brand-dark/20 flex items-center justify-center gap-2 group-active:scale-95">
                      <CreditCard size={14} /> {isAr ? 'ادفع الآن' : 'Pay Now'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-gray-400" />
                      <span className="text-[10px] text-gray-400 font-bold uppercase">{isAr ? 'آخر تحديث: منذ ساعتين' : 'Updated 2h ago'}</span>
                    </div>
                  )}
                  
                  <button className="flex items-center gap-1 text-gray-400 hover:text-brand-dark text-[10px] font-black uppercase tracking-widest transition-all group-hover:gap-2">
                    {isAr ? 'التفاصيل' : 'Details'} <ArrowRight size={14} className="rtl:rotate-180" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-24 bg-white rounded-[40px] border-2 border-dashed border-gray-100 shadow-inner flex flex-col items-center">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <Briefcase size={48} className="text-gray-200" />
          </div>
          <h3 className="text-xl font-black text-gray-800 mb-2">{isAr ? 'لا توجد خدمات نشطة' : 'No Active Services'}</h3>
          <p className="text-sm text-gray-400 max-w-xs mx-auto leading-relaxed">{isAr ? 'ابدأ الآن بطلب خدمتك الأولى وسنكون معك في كل خطوة' : 'Start now by requesting your first service and we will be with you every step of the way.'}</p>
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="mt-8 bg-brand-dark text-white px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-brand-dark/20 hover:scale-105 transition-all"
          >
            {isAr ? 'طلب خدمة' : 'Request Service'}
          </button>
        </div>
      )}

      {/* Start New Service Slide-up Menu (Mobile friendly) */}
      {isMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in duration-300" onClick={() => setIsMenuOpen(false)}></div>
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[40px] z-[101] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom duration-500 max-w-xl mx-auto">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{isAr ? 'طلب خدمة جديدة' : 'New Request'}</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{isAr ? 'اختر الخدمة المطلوبة' : 'Select a service'}</p>
              </div>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {AVAILABLE_SERVICES.map((s) => (
                <button 
                  key={s.id} 
                  className="flex items-center gap-4 p-5 rounded-2xl border border-gray-100 hover:border-brand-dark hover:bg-red-50/30 transition-all text-start group active:scale-[0.98]"
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${s.bg} ${s.color} transition-transform group-hover:scale-110`}>
                    <s.icon size={28} />
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-gray-900 text-sm">{isAr ? s.title_ar : s.title_en}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{isAr ? 'اضغط للبدء' : 'Tap to start'}</p>
                  </div>
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-brand-dark rtl:rotate-180" />
                </button>
              ))}
            </div>
            
            <p className="text-center text-[10px] text-gray-400 mt-8 font-medium">
              {isAr ? 'خدماتنا مصممة لتناسب احتياجات عملك' : 'Our services are tailored to fit your business needs'}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default ServiceTracker;

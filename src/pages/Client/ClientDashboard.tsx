import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { 
  ShieldCheck, 
  Activity, 
  AlertTriangle, 
  Clock, 
  CreditCard, 
  ChevronRight,
  FileText,
  MessageSquare,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

const ClientDashboard = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { user, role, loading: authLoading } = useAuth();
  
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [activeServices, setActiveServices] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && role === 'client') {
      fetchClientData();
    } else if (user && role !== 'client') {
      setLoadingData(false);
    }
  }, [user, role]);

  const fetchClientData = async () => {
    setLoadingData(true);
    setError('');

    try {
      const clientId = user?.id;

      // 1. Fetch Client Profile (for Compliance Status)
      const { data: profileData, error: profileError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
        
      if (profileError && profileError.code !== 'PGRST116') {
        console.error("Profile Error", profileError);
      }

      // 2. Fetch Active Services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('client_id', clientId)
        .in('status', ['ongoing', 'pending', 'under_review']);

      // 3. Fetch Recent Invoices
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(5);

      setClientProfile(profileData || { compliance_status: 'Compliant' });
      setActiveServices(servicesData || []);
      setRecentInvoices(invoicesData || []);

    } catch (err: any) {
      setError(t('client.errorFetchingData'));
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  if (authLoading || loadingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark"></div>
      </div>
    );
  }

  const unpaidInvoicesCount = recentInvoices.filter(i => i.status === 'unpaid' || i.status === 'overdue').length;
  const requiredActions = unpaidInvoicesCount + (clientProfile?.compliance_status === 'Non-Compliant' ? 1 : 0);

  return (
    <div className="space-y-8 pb-20 lg:pb-0 animate-in fade-in duration-700" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
        <div className={isAr ? 'text-right' : 'text-left'}>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase">{t('client.dashboardTitle')}</h2>
          <p className="text-gray-400 text-sm mt-1.5 font-medium">{isAr ? 'نظرة عامة على حسابك وخدماتك' : 'Overview of your account and services'}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 self-start md:self-auto transition-all hover:shadow-md">
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-500 animate-ping"></div>
          </div>
          <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">{isAr ? 'النظام متصل' : 'System Online'}</span>
        </div>
      </div>
      
      {error && (
        <div className={`bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-3xl flex items-center gap-3 mb-8 shadow-sm ${isAr ? 'text-right' : 'text-left'}`}>
          <AlertCircle size={24} /> 
          <span className="font-bold">{error}</span>
        </div>
      )}

      {/* Summary KPI Cards - High Visibility */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Compliance Status */}
        <div className="bg-white rounded-[2rem] p-7 border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
          <div className={`absolute top-0 ${isAr ? 'right-0' : 'left-0'} w-2 h-full ${
            clientProfile?.compliance_status === 'Compliant' ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <div className="flex items-center gap-5">
            <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center transition-all group-hover:scale-110 shadow-inner ${
              clientProfile?.compliance_status === 'Compliant' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
            }`}>
              <ShieldCheck size={36} />
            </div>
            <div className={isAr ? 'text-right' : 'text-left'}>
              <h4 className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{t('client.complianceStatus')}</h4>
              <div className={`text-xl font-black tracking-tight ${clientProfile?.compliance_status === 'Compliant' ? 'text-green-600' : 'text-red-600'}`}>
                {isAr 
                  ? (clientProfile?.compliance_status === 'Compliant' ? 'ممتثل ضريبياً' : 'غير ممتثل') 
                  : (clientProfile?.compliance_status || 'Compliant')}
              </div>
            </div>
          </div>
        </div>

        {/* Active Services */}
        <div className="bg-white rounded-[2rem] p-7 border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
          <div className={`absolute top-0 ${isAr ? 'right-0' : 'left-0'} w-2 h-full bg-brand-dark`}></div>
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[1.25rem] flex items-center justify-center bg-red-50 text-brand-dark transition-all group-hover:scale-110 shadow-inner">
              <Activity size={36} />
            </div>
            <div className={isAr ? 'text-right' : 'text-left'}>
              <h4 className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{t('client.activeServices')}</h4>
              <div className="text-3xl font-black text-gray-900 tracking-tighter">{activeServices.length}</div>
            </div>
          </div>
        </div>

        {/* Required Actions */}
        <div className="bg-white rounded-[2rem] p-7 border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
          <div className={`absolute top-0 ${isAr ? 'right-0' : 'left-0'} w-2 h-full ${
            requiredActions > 0 ? 'bg-amber-500' : 'bg-gray-200'
          }`}></div>
          <div className="flex items-center gap-5">
            <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center transition-all group-hover:scale-110 shadow-inner ${
              requiredActions > 0 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-400'
            }`}>
              <AlertTriangle size={36} />
            </div>
            <div className={isAr ? 'text-right' : 'text-left'}>
              <h4 className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{t('client.requiredActions')}</h4>
              <div className={`text-3xl font-black tracking-tighter ${requiredActions > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                {requiredActions}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        
        {/* Ongoing Services List */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 flex flex-col transition-all hover:shadow-lg">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-black text-xl text-gray-900 flex items-center gap-3 tracking-tight uppercase">
              <Activity className="text-brand-dark" size={24}/>
              {t('client.ongoingServices')}
            </h3>
            <button className="text-[10px] font-black text-brand-dark hover:underline flex items-center gap-2 uppercase tracking-widest group">
              {t('client.viewAll')} 
              <ArrowRight size={14} className={`transition-transform group-hover:translate-x-1 ${isAr ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
            </button>
          </div>
          
          <div className="space-y-5 flex-1">
            {activeServices.length > 0 ? activeServices.map(service => (
              <div key={service.id} className="group border border-gray-100 rounded-3xl p-6 bg-gray-50/50 hover:bg-white hover:shadow-xl transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <div className={isAr ? 'text-right' : 'text-left'}>
                    <h4 className="font-black text-gray-900 text-sm tracking-tight">{service.title}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{isAr ? 'جاري التنفيذ' : 'In Progress'}</p>
                  </div>
                  <span className="text-[9px] bg-red-50 text-brand-dark px-2.5 py-1.5 rounded-xl font-black uppercase tracking-widest shadow-sm">
                    {service.status?.replace('_', ' ')}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isAr ? 'التقدم' : 'Progress'}</span>
                    <span className="text-[10px] font-black text-brand-dark">45%</span>
                  </div>
                  <div className="w-full bg-gray-200/50 rounded-full h-2.5 overflow-hidden shadow-inner">
                    <div className="bg-brand-dark h-full rounded-full transition-all duration-1000 shadow-lg" style={{ width: '45%' }}></div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-100 rounded-[2rem] text-gray-400 bg-gray-50/30">
                <div className="p-6 bg-white rounded-full shadow-lg mb-6 opacity-20">
                  <Activity size={48} />
                </div>
                <p className="text-xs font-black uppercase tracking-widest">{t('client.noActiveServices')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Invoices & Payments */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 flex flex-col transition-all hover:shadow-lg">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-black text-xl text-gray-900 flex items-center gap-3 tracking-tight uppercase">
              <CreditCard className="text-brand-dark" size={24}/>
              {t('client.recentInvoices')}
            </h3>
            <button className="text-[10px] font-black text-brand-dark hover:underline flex items-center gap-2 uppercase tracking-widest group">
              {t('client.viewAll')} 
              <ArrowRight size={14} className={`transition-transform group-hover:translate-x-1 ${isAr ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
            </button>
          </div>
          
          <div className="space-y-5 flex-1">
            {recentInvoices.length > 0 ? recentInvoices.map(invoice => (
              <div key={invoice.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border border-gray-100 rounded-3xl bg-gray-50/50 hover:bg-white hover:shadow-xl transition-all gap-5">
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner ${
                    invoice.status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-brand-dark'
                  }`}>
                    <FileText size={28} />
                  </div>
                  <div className={isAr ? 'text-right' : 'text-left'}>
                    <h4 className="font-black text-sm text-gray-900 tracking-tight">{invoice.invoice_number}</h4>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                        <Clock size={12} /> {invoice.due_date}
                      </span>
                      <span className={`text-[9px] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest shadow-sm ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6 sm:gap-8 border-t sm:border-0 border-gray-100 pt-5 sm:pt-0">
                  <div className="text-xl font-black text-gray-900 tracking-tighter">
                    {invoice.amount} <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest ps-1">OMR</span>
                  </div>
                  {(invoice.status === 'unpaid' || invoice.status === 'overdue') && (
                    <button className="bg-brand-dark hover:bg-red-800 text-white text-[10px] font-black uppercase tracking-widest py-2.5 px-6 rounded-xl transition-all shadow-xl shadow-brand-dark/20 hover:shadow-2xl hover:scale-105 active:scale-95">
                      {t('client.payNow')}
                    </button>
                  )}
                </div>
              </div>
            )) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-100 rounded-[2rem] text-gray-400 bg-gray-50/30">
                <div className="p-6 bg-white rounded-full shadow-lg mb-6 opacity-20">
                  <CreditCard size={48} />
                </div>
                <p className="text-xs font-black uppercase tracking-widest">{t('client.noInvoices')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Footer - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
        <button className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5 hover:bg-red-50 hover:border-red-100 transition-all group hover:shadow-xl">
          <div className="w-16 h-16 rounded-[1.25rem] bg-red-50 text-brand-dark flex items-center justify-center group-hover:bg-brand-dark group-hover:text-white transition-all shadow-inner group-hover:shadow-lg group-hover:scale-110">
            <MessageSquare size={32} />
          </div>
          <div className={isAr ? 'text-right' : 'text-left'}>
            <span className="text-sm font-black text-gray-900 uppercase tracking-tight block">{isAr ? 'تواصل مع المحاسب' : 'Chat with Accountant'}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 block">Live Support Available</span>
          </div>
        </button>
        <button className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5 hover:bg-red-50 hover:border-red-100 transition-all group hover:shadow-xl">
          <div className="w-16 h-16 rounded-[1.25rem] bg-red-50 text-brand-dark flex items-center justify-center group-hover:bg-brand-dark group-hover:text-white transition-all shadow-inner group-hover:shadow-lg group-hover:scale-110">
            <FileText size={32} />
          </div>
          <div className={isAr ? 'text-right' : 'text-left'}>
            <span className="text-sm font-black text-gray-900 uppercase tracking-tight block">{isAr ? 'طلب خدمة جديدة' : 'Request Service'}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 block">Quick Submission</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default ClientDashboard;

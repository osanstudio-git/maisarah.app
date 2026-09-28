import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Search, 
  Building2, 
  UserCircle2, 
  Phone, 
  Mail, 
  ChevronRight,
  ShieldCheck,
  X,
  TrendingUp,
  CreditCard,
  Briefcase,
  AlertCircle,
  Activity,
  Archive,
  AlertTriangle,
  Banknote,
  Clock,
  RefreshCw
} from 'lucide-react';

interface Client {
  id: string;
  full_name: string;
  company_name: string;
  email: string;
  phone: string;
  status: string;
  assigned_employee_id: string;
  created_at: string;
  assigned_employee?: {
    full_name: string;
  };
}

interface ClientFinance {
  total_billed: number;
  paid: number;
  outstanding: number;
}

const ClientManagement = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [clients, setClients] = useState<Client[]>([]);
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Drawer States
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientServices, setClientServices] = useState<any[]>([]);
  const [clientInvoices, setClientInvoices] = useState<any[]>([]);
  const [clientFinance, setClientFinance] = useState<ClientFinance>({ total_billed: 0, paid: 0, outstanding: 0 });
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchClientsAndStats = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [
        { data: clientData, error: clientErr },
        { data: invoiceData },
        { data: serviceData }
      ] = await Promise.all([
        supabase
          .from('clients')
          .select('*, assigned_employee:profiles!assigned_employee_id(full_name)')
          .eq('is_archived', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('invoices')
          .select('id, client_id, amount, status, due_date, created_at'),
        supabase
          .from('services')
          .select('id, client_id, title, status, created_at')
      ]);

      if (clientErr) throw clientErr;
      setClients(clientData || []);
      setAllInvoices(invoiceData || []);
      setAllServices(serviceData || []);
    } catch (err) {
      console.error('Fetch clients error:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClientsAndStats();

    // ── Supabase Realtime Subscription ─────────────────────────────────────────
    const channel = supabase
      .channel('manager-clients-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clients' },
        () => fetchClientsAndStats(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        () => fetchClientsAndStats(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'services' },
        () => fetchClientsAndStats(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchClientsAndStats]);

  const fetchClientDetails = async (client: Client) => {
    setSelectedClient(client);
    setDetailsLoading(true);
    
    try {
      const [servicesRes, invoicesRes] = await Promise.all([
        supabase
          .from('services')
          .select('*')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('invoices')
          .select('*')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false })
      ]);

      setClientServices(servicesRes.data || []);
      setClientInvoices(invoicesRes.data || []);

      // Calculate Real Client Finances
      const invs = invoicesRes.data || [];
      const total = invs.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
      const paid = invs.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
      
      setClientFinance({
        total_billed: total,
        paid: paid,
        outstanding: total - paid
      });

    } catch (err) {
      console.error('Fetch details error:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleArchive = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(isAr ? 'هل أنت متأكد من أرشفة هذا العميل؟' : 'Are you sure you want to archive this client?')) return;
    
    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_archived: true })
        .eq('id', id);

      if (error) throw error;
      setClients(prev => prev.filter(c => c.id !== id));
      if (selectedClient?.id === id) setSelectedClient(null);
    } catch (err) {
      alert('Error archiving client');
    }
  };

  const filtered = clients.filter(c => 
    (c.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Real Pulse Data Derived from DB ────────────────────────────────────────
  const totalPortfolio = clients.length;
  
  // Real active engagements (services not yet completed)
  const activeEngagements = allServices.filter(s => s.status !== 'completed').length;
  
  // Real Lifetime Value (LTV) across all billed invoices
  const totalBilledAll = allInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const avgLtv = totalPortfolio > 0 ? Math.round(totalBilledAll / totalPortfolio) : 0;
  
  // Real Risk Alerts (Clients with overdue invoices or delayed operations)
  const now = new Date();
  const overdueClientIds = new Set(
    allInvoices
      .filter(i => i.status === 'overdue' || (i.due_date && new Date(i.due_date) < now && i.status !== 'paid'))
      .map(i => i.client_id)
  );
  const riskAlerts = overdueClientIds.size;

  return (
    <div className="space-y-6 pb-10" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <ShieldCheck className="text-brand-dark" size={32} />
            {isAr ? 'ذكاء العملاء' : 'Client Intelligence'}
          </h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            {isAr ? 'نظرة شاملة 360 درجة لمحفظة العملاء والوضع المالي لحظياً' : 'Real-time 360-degree executive overview of the client portfolio'}
          </p>
        </div>
        <button
          onClick={() => fetchClientsAndStats()}
          className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm"
        >
          <RefreshCw size={14} /> {isAr ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {/* ── Section 1: Pulse Bar (100% Real DB Data) ────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-brand-dark text-white rounded-[2rem] p-6 shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
          <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2 relative z-10">{isAr ? 'إجمالي المحفظة' : 'Total Portfolio'}</p>
          <div className="flex justify-between items-end relative z-10">
            <p className="text-4xl font-black leading-none">{totalPortfolio}</p>
            <Building2 size={24} className="text-white/20" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 relative z-10">{isAr ? 'العمليات النشطة' : 'Active Engagements'}</p>
          <div className="flex justify-between items-end relative z-10">
            <p className="text-4xl font-black text-gray-900 leading-none">{activeEngagements}</p>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
              <Activity size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 relative z-10">{isAr ? 'متوسط قيمة العميل (LTV)' : 'Avg Lifetime Value'}</p>
          <div className="flex justify-between items-end relative z-10">
            <p className="text-4xl font-black text-gray-900 leading-none">{avgLtv.toLocaleString()} <span className="text-xs text-gray-400">OMR</span></p>
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-500 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-100 rounded-[2rem] p-6 shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-2 relative z-10">{isAr ? 'تنبيهات المخاطر / المتأخرات' : 'Risk Alerts'}</p>
          <div className="flex justify-between items-end relative z-10">
            <p className="text-4xl font-black text-red-700 leading-none">{riskAlerts}</p>
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: The Roster ───────────────────────────────────────── */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-gray-50 flex items-center bg-gray-50/30">
          <div className="relative w-full max-w-md">
            <Search className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-gray-400`} size={16} />
            <input
              type="text"
              placeholder={isAr ? 'بحث عن شركة أو عميل...' : 'Search for company or client...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full ${isAr ? 'pr-10' : 'pl-10'} py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-dark text-sm font-bold transition-all`}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-20 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-20 text-center text-gray-400">
            <Users size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-bold">{isAr ? 'لا يوجد عملاء مطابقة للبحث' : 'No clients found'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start whitespace-nowrap">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الشركة' : 'Company'}</th>
                  <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'مسؤول الحساب' : 'Account Mgr'}</th>
                  <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'المكانة المالية' : 'Financial Status'}</th>
                  <th className="px-6 py-4 text-start text-[9px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'العمليات' : 'Operations'}</th>
                  <th className="px-6 py-4 text-end"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(client => {
                  // Calculate actual real financial health for each client row
                  const clientInvs = allInvoices.filter(i => i.client_id === client.id);
                  const totalClientBilled = clientInvs.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
                  const totalClientPaid = clientInvs.filter(i => i.status === 'paid').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
                  const healthPercent = totalClientBilled > 0 ? Math.round((totalClientPaid / totalClientBilled) * 100) : 100;

                  const clientActiveServices = allServices.filter(s => s.client_id === client.id && s.status !== 'completed');

                  return (
                    <tr 
                      key={client.id} 
                      onClick={() => fetchClientDetails(client)}
                      className="group hover:bg-gray-50/50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-brand-dark/5 text-brand-dark flex items-center justify-center group-hover:bg-brand-dark group-hover:text-white transition-all">
                            <Building2 size={18} />
                          </div>
                          <div>
                            <p className="font-black text-gray-900 text-sm">{client.company_name || 'Corporate Client'}</p>
                            <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1">
                              <UserCircle2 size={12} /> {client.full_name || 'Contact Person'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-black text-gray-600">
                            {client.assigned_employee?.full_name?.charAt(0) || '?'}
                          </div>
                          <span className="text-xs font-bold text-gray-700">{client.assigned_employee?.full_name || (isAr ? 'غير مخصص' : 'Unassigned')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3 min-w-[120px]">
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div className="h-2 rounded-full" style={{ width: `${healthPercent}%`, backgroundColor: healthPercent >= 80 ? '#10B981' : '#F59E0B' }} />
                          </div>
                          <span className="text-[10px] font-black text-gray-500 w-12">{healthPercent}% {isAr ? 'مسدد' : 'Paid'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase">
                          {clientActiveServices.length} {isAr ? 'نشطة' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-end space-x-2 space-x-reverse">
                        <button 
                          onClick={(e) => handleArchive(client.id, e)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title={isAr ? 'أرشفة العميل' : 'Archive Client'}
                        >
                          <Archive size={16} />
                        </button>
                        <button className="p-2 text-gray-400 group-hover:text-brand-dark transition-colors">
                          <ChevronRight size={18} className={isAr ? 'rotate-180' : ''} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Executive Dossier Slide-out Drawer ────────────────────────── */}
      {selectedClient && (
        <>
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40" onClick={() => setSelectedClient(null)} />
          <div className={`fixed top-0 ${isAr ? 'left-0' : 'right-0'} h-full w-full max-w-lg bg-white shadow-2xl z-50 transform transition-transform overflow-y-auto`} dir={isAr ? 'rtl' : 'ltr'}>
            
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Briefcase className="text-brand-dark" size={20} />
                {isAr ? 'الملف التنفيذي' : 'Executive Dossier'}
              </h2>
              <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {detailsLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
              </div>
            ) : (
              <div className="p-6 space-y-8">
                
                {/* Profile Section */}
                <div className="text-center">
                  <div className="w-20 h-20 bg-brand-dark/5 text-brand-dark rounded-3xl mx-auto flex items-center justify-center mb-4">
                    <Building2 size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900">{selectedClient.company_name}</h3>
                  <p className="text-sm font-bold text-gray-500 mt-1">{selectedClient.full_name}</p>
                  
                  <div className="flex justify-center gap-4 mt-6">
                    {selectedClient.email && (
                      <a href={`mailto:${selectedClient.email}`} className="bg-gray-50 hover:bg-gray-100 p-3 rounded-2xl text-brand-dark transition-colors">
                        <Mail size={18} />
                      </a>
                    )}
                    {selectedClient.phone && (
                      <a href={`tel:${selectedClient.phone}`} className="bg-gray-50 hover:bg-gray-100 p-3 rounded-2xl text-brand-dark transition-colors">
                        <Phone size={18} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Financial Standing */}
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Banknote size={14} /> {isAr ? 'المكانة المالية' : 'Financial Standing'}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                      <p className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-1">{isAr ? 'المسدد' : 'Paid'}</p>
                      <p className="text-lg font-black text-green-700">{clientFinance.paid.toLocaleString()} OMR</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                      <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1">{isAr ? 'المستحق' : 'Outstanding'}</p>
                      <p className="text-lg font-black text-red-700">{clientFinance.outstanding.toLocaleString()} OMR</p>
                    </div>
                  </div>
                </div>

                {/* Operational History */}
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Clock size={14} /> {isAr ? 'السجل التشغيلي' : 'Operational History'}
                  </h4>
                  <div className="space-y-3">
                    {clientServices.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">{isAr ? 'لا توجد عمليات مسجلة' : 'No services found'}</p>
                    ) : (
                      clientServices.map(svc => (
                        <div key={svc.id} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                              svc.status === 'completed' ? 'bg-green-100 text-green-700' : 
                              svc.status === 'delayed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {svc.status.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400">
                              {svc.created_at ? new Date(svc.created_at).toLocaleDateString() : ''}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-gray-900">{svc.title}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ClientManagement;

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { logActivity } from '../../lib/activityLogger';
import {
  Briefcase, Plus, X, CheckCircle2, Clock, AlertTriangle,
  PlayCircle, Search, ChevronDown, AlertCircle, Eye, Trash2, Edit,
} from 'lucide-react';
import { getAllDepartments } from '../../config/departments';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ServiceRecord {
  id: string;
  title: string;
  status: string;
  description: string | null;
  due_date: string | null;
  created_at: string;
  client_id: string | null;
  clients?: { company_name: string } | null;
}

interface Client {
  id: string;
  company_name: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const STATUS_MAP: Record<string, { label_ar: string; label_en: string; icon: React.ReactNode; cls: string; bar: string }> = {
  ongoing:      { label_ar: 'قيد التنفيذ', label_en: 'Ongoing',      icon: <PlayCircle size={13} />,   cls: 'bg-blue-100 text-blue-700',   bar: 'bg-blue-400' },
  under_review: { label_ar: 'قيد المراجعة', label_en: 'Under Review', icon: <Clock size={13} />,        cls: 'bg-amber-100 text-amber-700', bar: 'bg-amber-400' },
  completed:    { label_ar: 'مكتمل',        label_en: 'Completed',    icon: <CheckCircle2 size={13} />, cls: 'bg-green-100 text-green-700', bar: 'bg-green-500' },
  delayed:      { label_ar: 'متأخر',        label_en: 'Delayed',      icon: <AlertTriangle size={13} />,cls: 'bg-red-100 text-red-700',     bar: 'bg-brand-dark' },
};

// ── Master Catalog Hook ───────────────────────────────────────────────────
const useServiceCatalog = (isAr: boolean) => {
  const [catalog, setCatalog] = useState<{ id: string; name: string; department_id: string }[]>([]);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const { data } = await supabase
          .from('service_catalog')
          .select('id, name_ar, name_en, department_id')
          .order('name_en');
        
        if (data && data.length > 0) {
          setCatalog(data.map(d => ({
            id: d.id,
            name: isAr ? d.name_ar : d.name_en,
            department_id: d.department_id || ''
          })));
        } else {
          setCatalog([]);
        }
      } catch {
        setCatalog([]);
      }
    };
    fetchCatalog();
  }, [isAr]);

  return catalog;
};

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------
const StatusBadge = ({ status, isAr }: { status: string; isAr: boolean }) => {
  const s = STATUS_MAP[status] || STATUS_MAP.ongoing;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-full ${s.cls}`}>
      {s.icon}
      {isAr ? s.label_ar : s.label_en}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const ServicesManager = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isAr = i18n.language === 'ar';
  const catalog = useServiceCatalog(isAr);

  const [services, setServices]         = useState<ServiceRecord[]>([]);
  const [clients, setClients]           = useState<Client[]>([]);
  const [loading, setLoading]           = useState(true);
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMsg, setFormMsg]           = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    custom_name: '',
    client_id: '',
    due_date: '',
    description: '',
    status: 'ongoing',
  });
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [useCustomName, setUseCustomName] = useState(false);
  const [viewingService, setViewingService] = useState<ServiceRecord | null>(null);
  const [deletingService, setDeletingService] = useState<ServiceRecord | null>(null);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [svcRes, clientRes] = await Promise.all([
        supabase
          .from('services')
          .select('id, title, status, description, due_date, created_at, client_id, clients(company_name)')
          .order('created_at', { ascending: false }),
        supabase.from('clients').select('id, company_name').order('company_name'),
      ]);
      setServices((svcRes.data as ServiceRecord[]) || []);
      setClients((clientRes.data as Client[]) || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormMsg(null);

    const name = useCustomName ? formData.custom_name : formData.title;
    if (!name.trim()) {
      setFormMsg({ type: 'err', text: isAr ? 'يرجى اختيار أو كتابة اسم الخدمة' : 'Please select or enter a service name' });
      setIsSubmitting(false);
      return;
    }

    try {
      const payload: any = {
        title:          name,
        status:         formData.status,
        description:    formData.description || null,
        due_date:       formData.due_date || null,
        client_id:      formData.client_id || null,
        employee_id:    user?.id, // Digital Signature: Tag the employee who created it
      };

      if (editingService) {
        const { error } = await supabase.from('services').update(payload).eq('id', editingService.id);
        if (error) throw error;
        setFormMsg({ type: 'ok', text: isAr ? 'تم تحديث الخدمة بنجاح' : 'Service updated successfully' });
        setServices(prev => prev.map(s => s.id === editingService.id ? { ...s, ...payload, clients: clients.find(c => c.id === payload.client_id) ? { company_name: clients.find(c => c.id === payload.client_id)!.company_name } : null } : s));
      } else {
        const { data, error } = await supabase
          .from('services')
          .insert([payload])
          .select('id, title, status, description, due_date, created_at, client_id, clients(company_name)')
          .single();
          
        if (error) throw error;

        // Log the activity
        await logActivity(
          user?.id || '',
          user?.user_metadata?.full_name || user?.email || 'Employee',
          'service_created',
          `Started a new service: ${name}`,
          `بدأ خدمة جديدة: ${name}`
        );

        setFormMsg({ type: 'ok', text: isAr ? 'تم تعيين الخدمة بنجاح' : 'Service assigned successfully' });
        if (data) setServices(prev => [data as ServiceRecord, ...prev]);
      }

      setFormData({ title: '', custom_name: '', client_id: '', due_date: '', description: '', status: 'ongoing' });
      setTimeout(() => { setIsModalOpen(false); setEditingService(null); setFormMsg(null); }, 1600);
    } catch (err: any) {
      setFormMsg({ type: 'err', text: err.message || 'Error saving service' });
    }
    setIsSubmitting(false);
  };

  // ── Edit Trigger ─────────────────────────────────────────────────────────
  const openEditModal = (svc: ServiceRecord) => {
    setEditingService(svc);
    const isMaster = (isAr ? MASTER_SERVICES : MASTER_SERVICES_EN).includes(svc.title);
    setFormData({
      title: isMaster ? svc.title : '',
      custom_name: isMaster ? '' : svc.title,
      client_id: svc.client_id || '',
      due_date: svc.due_date || '',
      description: svc.description || '',
      status: svc.status,
    });
    setUseCustomName(!isMaster);
    setIsModalOpen(true);
  };

  // ── Status update ─────────────────────────────────────────────────────────
  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('services').update({ status: newStatus }).eq('id', id);
    if (error) {
      alert(error.message);
      return;
    }
    setServices(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
  };

  // ── Delete service ────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deletingService) return;
    if (deleteConfirmInput !== deletingService.title) {
      alert(isAr ? 'الاسم غير متطابق' : 'Name does not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('services').delete().eq('id', deletingService.id);
      if (error) throw error;
      setServices(prev => prev.filter(s => s.id !== deletingService.id));
      setDeletingService(null);
      setDeleteConfirmInput('');
    } catch (err: any) {
      alert(err.message || 'Error deleting');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = services.filter(s => {
    const matchSearch = (s.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.clients?.company_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // ── Stat counts ───────────────────────────────────────────────────────────
  const counts = {
    ongoing:      services.filter(s => s.status === 'ongoing').length,
    under_review: services.filter(s => s.status === 'under_review').length,
    completed:    services.filter(s => s.status === 'completed').length,
    delayed:      services.filter(s => s.status === 'delayed').length,
  };

  return (
    <div className="space-y-6 pb-10" dir={isAr ? 'rtl' : 'ltr'}>

      {/* Header */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isAr ? 'text-right' : 'text-left'}`}>
        <div>
          <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
            <Briefcase size={28} className="text-brand-dark" />
            {isAr ? 'إدارة الخدمات' : 'Services Manager'}
          </h2>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            {isAr ? `${services.length} خدمة مسجّلة` : `${services.length} total services`}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-brand-dark text-white rounded-2xl
            hover:bg-red-800 transition-all text-sm font-black uppercase tracking-widest shadow-xl shadow-red-900/20 active:scale-95"
        >
          <Plus size={18} />
          {isAr ? 'تعيين خدمة جديدة' : 'Assign New Service'}
        </button>
      </div>

      {/* Status Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
        {Object.entries(STATUS_MAP).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
            className={`flex items-center justify-between p-5 rounded-3xl border-2 transition-all duration-300 shadow-sm ${
              filterStatus === key
                ? 'border-brand-dark bg-red-50/50 shadow-md translate-y-[-2px]'
                : 'border-gray-100 bg-white hover:border-gray-200'
            }`}
          >
            <div className={isAr ? 'text-right' : 'text-left'}>
              <div className="text-3xl font-black text-gray-900 tracking-tight">{counts[key as keyof typeof counts]}</div>
              <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1 opacity-70">{isAr ? cfg.label_ar : cfg.label_en}</div>
            </div>
            <div className={`p-3 rounded-2xl shadow-inner ${cfg.cls}`}>{cfg.icon}</div>
          </button>
        ))}
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Toolbar */}
        <div className={`p-6 border-b border-gray-50 flex flex-col sm:flex-row gap-4 bg-gray-50/30 ${isAr ? 'sm:flex-row' : 'sm:flex-row'}`}>
          <div className="relative flex-1 max-w-sm">
            <Search className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-gray-400`} size={16} />
            <input
              type="text"
              placeholder={isAr ? 'بحث في الخدمات...' : 'Search services...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`w-full ${isAr ? 'pr-11 pl-4' : 'pl-11 pr-4'} py-3 border border-gray-200 rounded-2xl text-sm outline-none
                focus:border-red-700 focus:ring-2 focus:ring-red-700/10 bg-white shadow-inner transition-all`}
            />
          </div>
          <div className="relative">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className={`appearance-none ${isAr ? 'pr-5 pl-10' : 'pl-5 pr-10'} py-3 border border-gray-200 rounded-2xl text-sm
                outline-none focus:border-red-700 bg-white font-black uppercase tracking-widest text-gray-600 cursor-pointer shadow-inner`}
            >
              <option value="all">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <option key={k} value={k}>{isAr ? v.label_ar : v.label_en}</option>
              ))}
            </select>
            <ChevronDown size={14} className={`absolute ${isAr ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none`} />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-14">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-14 text-gray-400">
            <Briefcase size={36} className="mx-auto mb-3 opacity-30" />
            <p>{isAr ? 'لا توجد خدمات' : 'No services found'}</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3 text-start">{isAr ? 'اسم الخدمة' : 'Service Name'}</th>
                    <th className="px-5 py-3 text-start">{isAr ? 'العميل' : 'Client'}</th>
                    <th className="px-5 py-3 text-start">{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
                    <th className="px-5 py-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="px-5 py-3 text-start">{isAr ? 'تعديل الحالة' : 'Update'}</th>
                    <th className="px-5 py-3 text-end">{isAr ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(svc => {
                    const isOverdue = svc.due_date && new Date(svc.due_date) < new Date() && svc.status !== 'completed';
                    return (
                      <tr key={svc.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-800">{svc.title}</p>
                          {svc.description && <p className="text-xs text-gray-400 truncate max-w-[200px]">{svc.description}</p>}
                        </td>
                        <td className="px-5 py-4 text-gray-600 font-medium">
                          {svc.clients?.company_name || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-4">
                          {svc.due_date ? (
                            <span className={`text-sm font-medium ${isOverdue ? 'text-red-500' : 'text-gray-600'}`}>
                              {new Date(svc.due_date).toLocaleDateString()}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={svc.status} isAr={isAr} />
                        </td>
                        <td className="px-5 py-4">
                          <select
                            value={svc.status}
                            onChange={e => updateStatus(svc.id, e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none
                              focus:border-red-700 bg-white text-gray-600 cursor-pointer"
                          >
                            {Object.entries(STATUS_MAP).map(([k, v]) => (
                              <option key={k} value={k}>{isAr ? v.label_ar : v.label_en}</option>
                            ))}
                          </select>
                        </td>
                         <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setViewingService(svc)}
                              className="p-2 text-gray-400 hover:text-brand-dark hover:bg-red-50 rounded-xl transition-all"
                              title={isAr ? 'عرض التفاصيل' : 'View Details'}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => openEditModal(svc)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              title={isAr ? 'تعديل' : 'Edit'}
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => setDeletingService(svc)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              title={isAr ? 'حذف الخدمة' : 'Delete Service'}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-50">
              {filtered.map(svc => (
                <div key={svc.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-semibold text-sm text-gray-800">{svc.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{svc.clients?.company_name || '—'}</p>
                    </div>
                    <StatusBadge status={svc.status} isAr={isAr} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {svc.due_date ? new Date(svc.due_date).toLocaleDateString() : '—'}
                    </span>
                    <select
                      value={svc.status}
                      onChange={e => updateStatus(svc.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none
                        focus:border-red-700 bg-white text-gray-600"
                    >
                      {Object.entries(STATUS_MAP).map(([k, v]) => (
                        <option key={k} value={k}>{isAr ? v.label_ar : v.label_en}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Assign Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <Briefcase size={20} className="text-brand-dark" />
                {editingService 
                  ? (isAr ? 'تعديل الخدمة' : 'Edit Service')
                  : (isAr ? 'تعيين خدمة جديدة' : 'Assign New Service')}
              </h3>
              <button
                onClick={() => { setIsModalOpen(false); setEditingService(null); setFormMsg(null); }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {formMsg && (
                <div className={`p-3 text-sm rounded-xl flex items-center gap-2 border ${formMsg.type === 'ok' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {formMsg.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {formMsg.text}
                </div>
              )}

              <form onSubmit={handleAssign} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Department */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {isAr ? 'القسم' : 'Department'}
                    </label>
                    <div className="relative">
                      <select
                        value={selectedDeptId}
                        onChange={e => setSelectedDeptId(e.target.value)}
                        className="w-full appearance-none p-2.5 pe-8 border border-gray-200 rounded-xl text-sm
                          outline-none focus:border-red-700 focus:ring-2 focus:ring-red-700/10 bg-white"
                      >
                        <option value="">{isAr ? '-- جميع الأقسام --' : '-- All Departments --'}</option>
                        {getAllDepartments().map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Service Name Toggle */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-semibold text-gray-700">
                        {isAr ? 'اسم الخدمة' : 'Service Name'} <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setUseCustomName(!useCustomName)}
                        className="text-xs text-brand-dark font-bold hover:underline"
                      >
                        {useCustomName
                          ? (isAr ? 'اختر من القائمة' : 'Choose from list')
                          : (isAr ? 'أدخل اسماً مخصصاً' : 'Custom name')}
                      </button>
                    </div>

                    {useCustomName ? (
                      <input
                        type="text"
                        value={formData.custom_name}
                        onChange={e => setFormData({ ...formData, custom_name: e.target.value })}
                        placeholder={isAr ? 'اكتب اسم الخدمة...' : 'Enter service name...'}
                        className="w-full p-2.5 border border-gray-200 rounded-xl text-sm outline-none
                          focus:border-red-700 focus:ring-2 focus:ring-red-700/10 transition"
                      />
                    ) : (
                      <div className="relative">
                        <select
                          value={formData.title}
                          onChange={e => setFormData({ ...formData, title: e.target.value })}
                          className="w-full appearance-none p-2.5 pe-8 border border-gray-200 rounded-xl text-sm
                            outline-none focus:border-red-700 focus:ring-2 focus:ring-red-700/10 bg-white"
                        >
                          <option value="">{isAr ? '-- اختر خدمة --' : '-- Select a service --'}</option>
                          {catalog.filter(svc => !selectedDeptId || svc.department_id === selectedDeptId).map(svc => (
                            <option key={svc.id} value={svc.name}>{svc.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Client */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {isAr ? 'العميل' : 'Client'}
                  </label>
                  <div className="relative">
                    <select
                      value={formData.client_id}
                      onChange={e => setFormData({ ...formData, client_id: e.target.value })}
                      className="w-full appearance-none p-2.5 pe-8 border border-gray-200 rounded-xl text-sm
                        outline-none focus:border-red-700 focus:ring-2 focus:ring-red-700/10 bg-white"
                    >
                      <option value="">{isAr ? '-- بدون عميل --' : '-- No client --'}</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.company_name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Status & Due Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {isAr ? 'الحالة الابتدائية' : 'Initial Status'}
                    </label>
                    <div className="relative">
                      <select
                        value={formData.status}
                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                        className="w-full appearance-none p-2.5 pe-8 border border-gray-200 rounded-xl text-sm
                          outline-none focus:border-red-700 bg-white"
                      >
                        {Object.entries(STATUS_MAP).map(([k, v]) => (
                          <option key={k} value={k}>{isAr ? v.label_ar : v.label_en}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {isAr ? 'تاريخ الاستحقاق' : 'Due Date'}
                    </label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-sm outline-none
                        focus:border-red-700 focus:ring-2 focus:ring-red-700/10 transition"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {isAr ? 'ملاحظات (اختياري)' : 'Notes (optional)'}
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder={isAr ? 'تفاصيل إضافية...' : 'Additional details...'}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-sm outline-none
                      focus:border-red-700 focus:ring-2 focus:ring-red-700/10 transition resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-brand-dark hover:bg-red-800 disabled:opacity-60 text-white
                    font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {isSubmitting
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                    : <>
                        {editingService ? <Edit size={16} /> : <Plus size={16} />}
                        {editingService 
                          ? (isAr ? 'حفظ التغييرات' : 'Save Changes') 
                          : (isAr ? 'تعيين الخدمة' : 'Assign Service')}
                      </>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* View Detail Modal */}
      {viewingService && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-black text-xl text-gray-900 tracking-tight flex items-center gap-2">
                <Eye size={22} className="text-brand-dark" />
                {isAr ? 'تفاصيل الخدمة' : 'Service Details'}
              </h3>
              <button onClick={() => setViewingService(null)} className="p-2 hover:bg-white rounded-xl transition-all text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isAr ? 'اسم الخدمة' : 'Service Name'}</p>
                <p className="text-lg font-black text-gray-800 tracking-tight">{viewingService.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isAr ? 'العميل' : 'Client'}</p>
                  <p className="font-bold text-gray-700">{viewingService.clients?.company_name || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</p>
                  <p className="font-bold text-gray-700">{viewingService.due_date ? new Date(viewingService.due_date).toLocaleDateString() : '—'}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isAr ? 'الحالة الحالية' : 'Current Status'}</p>
                <div className="pt-1"><StatusBadge status={viewingService.status} isAr={isAr} /></div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isAr ? 'الوصف / ملاحظات' : 'Description / Notes'}</p>
                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100 italic">
                  {viewingService.description || (isAr ? 'لا توجد ملاحظات إضافية' : 'No additional notes provided.')}
                </p>
              </div>
              <div className="pt-4">
                <button onClick={() => setViewingService(null)} className="w-full py-3.5 bg-gray-900 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all">
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingService && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex justify-center items-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-red-100">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-red-50 text-brand-dark rounded-full flex items-center justify-center mx-auto shadow-inner border border-red-100 animate-pulse">
                <Trash2 size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="font-black text-2xl text-gray-900 tracking-tight uppercase">
                  {isAr ? 'هل أنت متأكد؟' : 'Are you sure?'}
                </h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                  {isAr 
                    ? `سيتم حذف الخدمة "${deletingService.title}" نهائياً. لا يمكن التراجع عن هذا الإجراء.` 
                    : `This will permanently delete the service "${deletingService.title}". This action cannot be undone.`}
                </p>
              </div>
              
              <div className="bg-red-50/50 p-6 rounded-3xl border border-red-100 space-y-4">
                <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">
                  {isAr ? 'لتأكيد الحذف، يرجى كتابة اسم الخدمة:' : 'To confirm, please type the service name:'}
                </p>
                <input
                  type="text"
                  placeholder={deletingService.title}
                  value={deleteConfirmInput}
                  onChange={e => setDeleteConfirmInput(e.target.value)}
                  className="w-full p-4 border-2 border-red-100 rounded-2xl text-sm font-bold text-center outline-none focus:border-brand-dark bg-white shadow-sm transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setDeletingService(null); setDeleteConfirmInput(''); }}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 font-black uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-all text-xs"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isSubmitting || deleteConfirmInput !== deletingService.title}
                  className="flex-1 py-4 bg-brand-dark text-white font-black uppercase tracking-widest rounded-2xl hover:bg-red-800 disabled:opacity-20 disabled:grayscale transition-all text-xs shadow-xl shadow-red-900/20"
                >
                  {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : (isAr ? 'حذف نهائي' : 'Confirm Delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesManager;

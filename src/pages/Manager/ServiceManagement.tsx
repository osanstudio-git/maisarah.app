import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { 
  Briefcase, 
  Plus, 
  X, 
  CheckCircle2, 
  Search, 
  Settings, 
  Edit, 
  Trash2, 
  Layers,
  AlertTriangle
} from 'lucide-react';
import { getAllDepartments, getDepartmentById } from '../../config/departments';

interface ServiceType {
  id: string;
  name_ar: string;
  name_en: string;
  department_id: string;
  base_price?: number;
  created_at: string;
}

const ServiceManagement = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [services, setServices] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    department_id: 'tax_vat',
    base_price: ''
  });

  // ── Fetch Services ────────────────────────────────────────────────────────
  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      /**
       * We'll try to fetch from a table called 'service_catalog'.
       * If it doesn't exist, we fallback to our master list logic.
       */
      const { data, error } = await supabase
        .from('service_catalog')
        .select('*')
        .order('name_en', { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (err) {
      console.error('Fetch catalog error:', err);
      // If table doesn't exist, we show empty or pre-defined list
      setServices([]); 
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();

    const channel = supabase
      .channel('service-catalog-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_catalog' }, () => fetchServices())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchServices]);

  // ── Handle Form ───────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        name_ar: formData.name_ar,
        name_en: formData.name_en,
        department_id: formData.department_id,
        base_price: formData.base_price ? parseFloat(formData.base_price) : null
      };

      if (editingId) {
        const { error } = await supabase
          .from('service_catalog')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('service_catalog')
          .insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ name_ar: '', name_en: '', department_id: 'tax_vat', base_price: '' });
      fetchServices();
    } catch (err: any) {
      alert(isAr ? 'حدث خطأ أثناء حفظ الخدمة' : 'Error saving service');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (svc: ServiceType) => {
    setEditingId(svc.id);
    setFormData({
      name_ar: svc.name_ar,
      name_en: svc.name_en,
      department_id: svc.department_id || 'tax_vat',
      base_price: svc.base_price?.toString() || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من حذف هذه الخدمة؟' : 'Are you sure you want to delete this service?')) return;
    try {
      const { error } = await supabase.from('service_catalog').delete().eq('id', id);
      if (error) throw error;
      fetchServices();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = services.filter(s => 
    s.name_ar.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.name_en.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-10" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Layers className="text-brand-dark" size={26} />
            {isAr ? 'دليل الخدمات المعتمدة' : 'Official Service Catalog'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isAr ? 'حدد الخدمات التي يمكن لموظفيك تقديمها للعملاء' : 'Define the services your employees can offer to clients'}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name_ar: '', name_en: '', department_id: 'tax_vat', base_price: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-dark text-white rounded-xl hover:bg-red-800 transition-colors text-sm font-bold shadow-sm shadow-brand-dark/20"
        >
          <Plus size={18} />
          {isAr ? 'إضافة خدمة جديدة' : 'Add New Service'}
        </button>
      </div>

      {/* Search & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="relative">
            <Search className={`absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-gray-400`} size={18} />
            <input
              type="text"
              placeholder={isAr ? 'البحث عن خدمة...' : 'Search services...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full ${isAr ? 'pr-10' : 'pl-10'} py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-brand-dark transition-all text-sm`}
            />
          </div>
        </div>
        <div className="bg-brand-dark text-white rounded-2xl shadow-sm p-4 flex flex-col justify-center text-center">
          <p className="text-[10px] uppercase font-black tracking-widest opacity-70">{isAr ? 'إجمالي الخدمات' : 'Total Services'}</p>
          <p className="text-2xl font-black">{services.length}</p>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
              <Briefcase size={32} />
            </div>
            <p className="text-gray-400 font-medium">{isAr ? 'لا توجد خدمات معرّفة حالياً' : 'No services defined yet'}</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="mt-4 text-brand-dark font-bold text-sm hover:underline"
            >
              {isAr ? 'أضف أول خدمة الآن' : 'Add your first service now'}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-black tracking-widest">
                <tr>
                  <th className="px-6 py-4 text-start">{isAr ? 'اسم الخدمة' : 'Service Name'}</th>
                  <th className="px-6 py-4 text-start">{isAr ? 'القسم' : 'Department'}</th>
                  <th className="px-6 py-4 text-start">{isAr ? 'السعر الأساسي' : 'Base Price'}</th>
                  <th className="px-6 py-4 text-end">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(svc => (
                  <tr key={svc.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-800">{svc.name_en}</p>
                      <p className="text-xs text-gray-400 font-medium">{svc.name_ar}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                        {getDepartmentById(svc.department_id)?.name || svc.department_id}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-gray-700">
                      {svc.base_price ? `${svc.base_price.toLocaleString()} OMR` : '---'}
                    </td>
                    <td className="px-6 py-4 text-end">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(svc)}
                          className="p-2 text-gray-400 hover:text-brand-dark hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(svc.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Settings size={20} className="text-brand-dark" />
                {editingId ? (isAr ? 'تعديل الخدمة' : 'Edit Service') : (isAr ? 'إضافة خدمة جديدة' : 'Define New Service')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الاسم بالإنجليزية' : 'Name (English)'}</label>
                  <input 
                    required
                    value={formData.name_en}
                    onChange={e => setFormData({...formData, name_en: e.target.value})}
                    placeholder="e.g. Annual Audit"
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-brand-dark text-sm font-bold"
                  />
                </div>
                <div className="space-y-1.5 text-right">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'الاسم بالعربية' : 'Name (Arabic)'}</label>
                  <input 
                    required
                    value={formData.name_ar}
                    onChange={e => setFormData({...formData, name_ar: e.target.value})}
                    placeholder="مثال: تدقيق الحسابات السنوي"
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-brand-dark text-sm font-bold text-right"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'القسم' : 'Department'}</label>
                <select 
                  value={formData.department_id}
                  onChange={e => setFormData({...formData, department_id: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-brand-dark text-sm font-bold appearance-none"
                >
                  {getAllDepartments().map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{isAr ? 'السعر التقديري (ر.ع)' : 'Estimated Price (OMR)'}</label>
                <input 
                  type="number"
                  value={formData.base_price}
                  onChange={e => setFormData({...formData, base_price: e.target.value})}
                  placeholder="0.000"
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-brand-dark text-sm font-bold"
                />
              </div>

              <button 
                disabled={isSubmitting}
                className="w-full py-4 bg-brand-dark text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-800 transition-all flex items-center justify-center gap-3 shadow-lg shadow-brand-dark/20"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    {editingId ? (isAr ? 'تحديث البيانات' : 'Update Catalog') : (isAr ? 'إدراج في الدليل' : 'Save to Catalog')}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceManagement;

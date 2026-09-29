import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  ShieldCheck, 
  Layers, 
  ArrowRight, 
  Calendar,
  Filter,
  FileSpreadsheet
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';

interface ClientServiceItem {
  id: string;
  title: string;
  client_id?: string;
  status: string; // 'pending' | 'ongoing' | 'under_review' | 'completed' | 'cancelled'
  target_department?: string;
  assigned_to?: string;
  estimated_completion_date?: string;
  created_at: string;
  description?: string;
  progress_percentage?: number;
}

interface ClientServicesListProps {
  clientId?: string;
  userId?: string;
}

export const ClientServicesList: React.FC<ClientServicesListProps> = ({ clientId, userId }) => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [services, setServices] = useState<ClientServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'completed' | 'pending'>('all');

  useEffect(() => {
    fetchServices();
  }, [clientId, userId]);

  const fetchServices = async () => {
    setLoading(true);
    try {
      let query = supabase.from('services').select('*').order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      } else if (userId) {
        query = query.eq('client_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setServices(data || []);
    } catch (err: any) {
      console.error('Error fetching client services:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: CheckCircle2,
          labelEn: 'Completed',
          labelAr: 'مكتمل'
        };
      case 'ongoing':
      case 'in_progress':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: Clock,
          labelEn: 'Ongoing',
          labelAr: 'قيد التنفيذ'
        };
      case 'under_review':
        return {
          bg: 'bg-purple-50 text-purple-800 border-purple-200',
          icon: ShieldCheck,
          labelEn: 'Under Review',
          labelAr: 'قيد المراجعة'
        };
      case 'pending':
      default:
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: AlertCircle,
          labelEn: 'Pending Allocation',
          labelAr: 'قيد التخصيص'
        };
    }
  };

  const getDepartmentLabel = (dept?: string) => {
    switch (dept?.toLowerCase()) {
      case 'tax':
      case 'tax_advisory':
        return isAr ? 'الضرائب والزكاة' : 'Tax & Zakat';
      case 'accounting':
      case 'bookkeeping':
        return isAr ? 'المحاسبة والتقارير' : 'Accounting & Bookkeeping';
      case 'auditing':
        return isAr ? 'التدقيق المالي' : 'Audit & Assurance';
      case 'corporate':
      case 'legal':
        return isAr ? 'الخدمات المؤسسية' : 'Corporate Services';
      default:
        return dept || (isAr ? 'خدمات الأعمال' : 'Business Advisory');
    }
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = (service.title || '').toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'ongoing') return service.status === 'ongoing' || service.status === 'in_progress' || service.status === 'under_review';
    if (statusFilter === 'completed') return service.status === 'completed';
    if (statusFilter === 'pending') return service.status === 'pending';
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Search & Filter Header */}
      <div className="space-y-3">
        <div className="relative">
          <Search className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? 'ابحث عن خدمة أو معاملة...' : 'Search your services or tasks...'}
            className={`w-full bg-white border border-gray-200 rounded-2xl py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-dark/20 focus:border-brand-dark ${
              isAr ? 'pr-11 pl-4' : 'pl-11 pr-4'
            }`}
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${
              statusFilter === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {isAr ? 'جميع الخدمات' : 'All'} ({services.length})
          </button>
          <button
            onClick={() => setStatusFilter('ongoing')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${
              statusFilter === 'ongoing'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {isAr ? 'قيد التنفيذ' : 'Ongoing'}
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {isAr ? 'المكتملة' : 'Completed'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-6 bg-gray-200 rounded w-2/3"></div>
              <div className="h-2 bg-gray-100 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-gray-200/80 shadow-sm text-gray-400 space-y-2">
          <Briefcase className="w-10 h-10 mx-auto text-gray-300" />
          <h4 className="font-bold text-gray-700 text-sm">{isAr ? 'لا توجد خدمات مطابقة' : 'No active services found'}</h4>
          <p className="text-xs text-gray-400">
            {isAr ? 'لم يتم العثور على أي ملفات جارية تحت هذا الحساب' : 'All assigned operational tasks will appear here in real-time'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredServices.map(service => {
            const badge = getStatusBadge(service.status);
            const BadgeIcon = badge.icon;
            const progress = service.progress_percentage ?? (
              service.status === 'completed' ? 100 : service.status === 'under_review' ? 75 : service.status === 'ongoing' ? 50 : 15
            );

            return (
              <div
                key={service.id}
                className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition-all space-y-3.5"
              >
                {/* Top Row: Department & Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
                    <Layers className="w-3.5 h-3.5 text-brand-dark" />
                    <span>{getDepartmentLabel(service.target_department)}</span>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border ${badge.bg}`}>
                    <BadgeIcon className="w-3 h-3" />
                    <span>{isAr ? badge.labelAr : badge.labelEn}</span>
                  </span>
                </div>

                {/* Service Title */}
                <div>
                  <h4 className="font-extrabold text-base text-gray-900 leading-snug">
                    {service.title}
                  </h4>
                  {service.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {service.description}
                    </p>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-gray-500">{isAr ? 'معدل الإنجاز' : 'Completion Status'}</span>
                    <span className="text-gray-900">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        progress === 100 
                          ? 'bg-emerald-500' 
                          : progress >= 50 
                          ? 'bg-brand-dark' 
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Footer Meta */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <span>
                      {isAr ? 'تاريخ البدء:' : 'Started:'}{' '}
                      {new Date(service.created_at).toLocaleDateString(isAr ? 'ar-OM' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  {service.estimated_completion_date && (
                    <span className="font-medium text-amber-700">
                      {isAr ? 'الموعد المتوقع:' : 'Due:'}{' '}
                      {new Date(service.estimated_completion_date).toLocaleDateString(isAr ? 'ar-OM' : 'en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClientServicesList;

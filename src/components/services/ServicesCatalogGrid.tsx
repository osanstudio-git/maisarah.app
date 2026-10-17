import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  ShieldCheck,
  CreditCard,
  Award,
  PackagePlus,
  Scale,
  Receipt,
  FileCheck,
  Building,
  ClipboardCheck,
  FileSpreadsheet,
  BookOpen,
  Briefcase,
  Clock,
  ArrowRight,
  MessageCircle,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Building2,
  Calendar
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import { ServiceDetailModal, type CatalogServiceItem } from './ServiceDetailModal';
import { useWhatsAppRouter } from '../../hooks/useWhatsAppRouter';

// Dynamic icon mapper for vector rendering
const iconMap: Record<string, React.FC<{ size?: number; className?: string }>> = {
  CreditCard,
  Award,
  ShieldCheck,
  PackagePlus,
  Scale,
  Receipt,
  FileCheck,
  Building,
  ClipboardCheck,
  FileSpreadsheet,
  BookOpen,
  Briefcase
};

interface ServicesCatalogGridProps {
  onServiceSelect?: (service: CatalogServiceItem) => void;
  showCategoryFilters?: boolean;
  limit?: number;
  initialCategory?: string;
  className?: string;
}

export const ServicesCatalogGrid: React.FC<ServicesCatalogGridProps> = ({
  onServiceSelect,
  showCategoryFilters = true,
  limit,
  initialCategory = 'all',
  className = ''
}) => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { routeWhatsApp } = useWhatsAppRouter();

  const [services, setServices] = useState<CatalogServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [activeModalService, setActiveModalService] = useState<CatalogServiceItem | null>(null);

  const categories = [
    { id: 'all', en: 'All Services', ar: 'كافة الخدمات' },
    { id: 'taxation', en: 'Taxation & VAT', ar: 'الضرائب والقيمة المضافة' },
    { id: 'auditing', en: 'Statutory Auditing', ar: 'التدقيق المالي القانوني' },
    { id: 'accounting', en: 'Accounting & CFO', ar: 'المحاسبة ومسك الدفاتر' },
    { id: 'formation', en: 'Company Formation', ar: 'تأسيس الشركات والسجلات' }
  ];

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('services_catalog')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (err: any) {
      console.warn('Error loading services_catalog, using fallback data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = useMemo(() => {
    return services.filter(srv => {
      const matchesCategory = selectedCategory === 'all' || srv.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        srv.name_en.toLowerCase().includes(q) ||
        srv.name_ar.includes(q) ||
        srv.description_en.toLowerCase().includes(q) ||
        srv.description_ar.includes(q);

      return matchesCategory && matchesSearch;
    }).slice(0, limit || undefined);
  }, [services, selectedCategory, searchQuery, limit]);

  const handleCardClick = (service: CatalogServiceItem) => {
    setActiveModalService(service);
    if (onServiceSelect) {
      onServiceSelect(service);
    }
  };

  const handleDirectWhatsApp = (e: React.MouseEvent, service: CatalogServiceItem) => {
    e.stopPropagation();
    const serviceName = isAr ? service.name_ar : service.name_en;
    routeWhatsApp({
      serviceId: service.id,
      serviceName,
      mode: 'presales'
    });
  };

  return (
    <div className={`space-y-6 ${className}`} dir={isAr ? 'rtl' : 'ltr'}>

      {/* Search & Filter Header Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className={`absolute top-3.5 text-gray-400 ${isAr ? 'right-3.5' : 'left-3.5'}`} />
          <input
            type="text"
            placeholder={isAr ? 'بحث في الخدمات (البطاقة الضريبية، تدقيق، سجلات...)' : 'Search services (tax card, audit, formation...)'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full py-2.5 bg-white border border-gray-200/90 rounded-2xl text-xs font-bold text-gray-800 placeholder-gray-400 outline-none focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/10 transition-all shadow-xs ${
              isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'
            }`}
          />
        </div>

        {/* Category Pills */}
        {showCategoryFilters && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none snap-x touch-pan-x">
            {categories.map(cat => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer shrink-0 snap-start active:scale-95 ${
                    isActive
                      ? 'bg-brand-dark text-white shadow-md shadow-brand-dark/20'
                      : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200/80'
                  }`}
                >
                  {isAr ? cat.ar : cat.en}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <RefreshCw size={24} className="text-brand-dark animate-spin" />
          <span className="text-xs font-bold text-gray-400">{isAr ? 'جاري تحميل دليل الخدمات...' : 'Loading services catalog...'}</span>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-gray-200 text-gray-400 space-y-2">
          <Sparkles size={36} className="mx-auto text-gray-300" />
          <p className="text-sm font-black text-gray-700">{isAr ? 'لم نتمكن من العثور على خدمات مطابقة' : 'No matching services found'}</p>
          <p className="text-xs">{isAr ? 'يرجى تجربة كلمات بحث أخرى أو اختيار تصنيف مختلف' : 'Try adjusting your search query or category filter'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
          {filteredServices.map(service => {
            const IconComponent = iconMap[service.icon_name || ''] || ShieldCheck;
            const title = isAr ? service.name_ar : service.name_en;
            const desc = isAr ? service.description_ar : service.description_en;
            const deadline = isAr ? service.statutory_deadline_ar : service.statutory_deadline_en;

            return (
              <div
                key={service.id}
                onClick={() => handleCardClick(service)}
                className="group relative bg-white border border-gray-200/80 hover:border-brand-dark/40 rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer hover:-translate-y-1 overflow-hidden"
              >
                {/* Decorative background aura on hover */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-dark/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-brand-dark/10 transition-all" />

                <div>
                  {/* Top Row: Icon Badge + Authority Badge */}
                  <div className="flex items-start justify-between gap-3 mb-3.5 relative z-10">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-brand-dark to-red-700 text-white flex items-center justify-center shadow-md shadow-brand-dark/20 group-hover:scale-105 transition-transform shrink-0">
                      <IconComponent size={20} />
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {service.badge_tag && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {service.badge_tag}
                        </span>
                      )}
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                        {service.governing_authority}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-black text-sm text-gray-900 group-hover:text-brand-dark transition-colors line-clamp-1">
                    {title}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium mt-1.5 line-clamp-2 leading-relaxed">
                    {desc}
                  </p>

                  {/* Statutory Deadline Pill if present */}
                  {deadline && (
                    <div className="mt-3 p-2 bg-amber-50/70 border border-amber-200/60 rounded-xl flex items-center gap-1.5 text-[10px] text-amber-800 font-bold">
                      <Calendar size={12} className="text-amber-600 shrink-0" />
                      <span className="truncate">{deadline}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Metadata & CTAs */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2 relative z-10">
                  <div className="min-w-0">
                    {service.starting_price_omr ? (
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 block">{isAr ? 'يبدأ من' : 'From'}</span>
                        <span className="text-xs font-black text-gray-900 truncate block">OMR {Number(service.starting_price_omr).toFixed(0)}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-700 truncate block">{service.typical_turnaround || 'Fast Track'}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Direct 1-Click WhatsApp Pre-Sales Trigger */}
                    <button
                      type="button"
                      onClick={(e) => handleDirectWhatsApp(e, service)}
                      className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs min-h-[38px] min-w-[38px] flex items-center justify-center"
                      title={isAr ? 'استفسار واتساب فوري' : 'Direct WhatsApp Inquiry'}
                    >
                      <MessageCircle size={16} />
                    </button>

                    {/* View Details Modal Trigger */}
                    <span className="px-3 py-2 bg-gray-100 group-hover:bg-brand-dark group-hover:text-white text-gray-700 rounded-xl text-[11px] font-black transition-all flex items-center gap-1 min-h-[38px]">
                      <span>{isAr ? 'التفاصيل' : 'Details'}</span>
                      <ArrowRight size={12} className={isAr ? 'rotate-180' : ''} />
                    </span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Contextual Service Detail Modal */}
      <ServiceDetailModal
        service={activeModalService}
        isOpen={!!activeModalService}
        onClose={() => setActiveModalService(null)}
      />

    </div>
  );
};

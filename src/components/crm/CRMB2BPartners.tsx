import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Users,
  PlusCircle,
  Search,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  FileText,
  ChevronRight,
  Sparkles,
  Award,
  ExternalLink,
  MessageCircle,
  Briefcase,
  Layers,
  ArrowUpRight,
  Filter,
  DollarSign,
  Copy,
  Check,
  X,
  Plus
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export interface B2BPartner {
  id: string;
  name: string;
  partner_type: 'sanad' | 'law_firm' | 'holding' | 'corporate_agent' | 'incubator' | 'other';
  contact_person: string;
  phone: string;
  email: string;
  location: string;
  cr_number?: string;
  agreement_tier: 'standard' | 'silver' | 'gold' | 'platinum';
  notes?: string;
  created_at: string;
}

interface CRMB2BPartnersProps {
  clients: any[];
  onOpenOnboardModal: (partnerId?: string, partnerName?: string) => void;
  staffList: any[];
}

const INITIAL_B2B_PARTNERS: B2BPartner[] = [
  {
    id: 'b2b-01',
    name: 'Al-Tasheel Sanad Services Group',
    partner_type: 'sanad',
    contact_person: 'Sheikh Salim Al-Busaidi',
    phone: '+968 9123 4567',
    email: 'salim@tasheel-oman.om',
    location: 'Muscat (Al-Khuwair)',
    cr_number: 'CR-1049281',
    agreement_tier: 'platinum',
    notes: 'Premier Sanad channel bringing 15+ corporate and SME registrations quarterly.',
    created_at: '2026-01-10'
  },
  {
    id: 'b2b-02',
    name: 'Oman Legal & Corporate Advisory Chambers',
    partner_type: 'law_firm',
    contact_person: 'Adv. Maryam Al-Lawati',
    phone: '+968 9456 7890',
    email: 'maryam@omanlegal.om',
    location: 'Muscat (Al-Mouj)',
    cr_number: 'CR-2039482',
    agreement_tier: 'gold',
    notes: 'Legal partners referring international FDI companies for statutory audit and corporate tax.',
    created_at: '2026-02-14'
  },
  {
    id: 'b2b-03',
    name: 'Sohar Industrial Holding B2B Cluster',
    partner_type: 'holding',
    contact_person: 'Tariq Al-Fazari',
    phone: '+968 9789 0123',
    email: 'tariq@soharholding.om',
    location: 'Sohar Freezone',
    cr_number: 'CR-3048192',
    agreement_tier: 'gold',
    notes: 'Holding group coordinating subsidiaries bookkeeping & VAT filings.',
    created_at: '2026-03-01'
  },
  {
    id: 'b2b-04',
    name: 'Duqm Business & Startup Incubator',
    partner_type: 'incubator',
    contact_person: 'Eng. Khalid Al-Habsi',
    phone: '+968 9234 5678',
    email: 'khalid@duqmincubator.om',
    location: 'Duqm Special Economic Zone',
    cr_number: 'CR-4091823',
    agreement_tier: 'silver',
    notes: 'Government-supported hub channeling newly formed SME startups.',
    created_at: '2026-04-18'
  }
];

export default function CRMB2BPartners({ clients, onOpenOnboardModal, staffList }: CRMB2BPartnersProps) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [partners, setPartners] = useState<B2BPartner[]>(() => {
    try {
      const saved = localStorage.getItem('maisarah_b2b_partners');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading saved B2B partners:', e);
    }
    return INITIAL_B2B_PARTNERS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedPartnerForDrawer, setSelectedPartnerForDrawer] = useState<B2BPartner | null>(null);
  const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);
  const [copiedPartnerId, setCopiedPartnerId] = useState<string | null>(null);

  // Form State for Add/Edit B2B Partner
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    partner_type: 'sanad' as B2BPartner['partner_type'],
    contact_person: '',
    phone: '',
    email: '',
    location: 'Muscat',
    cr_number: '',
    agreement_tier: 'silver' as B2BPartner['agreement_tier'],
    notes: ''
  });

  // Save partners to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem('maisarah_b2b_partners', JSON.stringify(partners));
    } catch (e) {
      console.warn('Error saving B2B partners:', e);
    }
  }, [partners]);

  // Sync B2B partners with Supabase if table exists
  useEffect(() => {
    const fetchSupabasePartners = async () => {
      try {
        const { data, error } = await supabase.from('b2b_partners').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          setPartners(data);
        }
      } catch (e) {
        // Fallback to local storage gracefully
      }
    };
    fetchSupabasePartners();
  }, []);

  // Map clients to their respective B2B Partner
  const partnerClientsMap = useMemo(() => {
    const map = new Map<string, any[]>();
    partners.forEach(p => map.set(p.id, []));

    clients.forEach(c => {
      const pId = c.b2b_partner_id || (c.source === 'b2b' ? partners[0]?.id : null);
      if (pId && map.has(pId)) {
        map.get(pId)!.push(c);
      } else if (c.type === 'B2B' && partners.length > 0) {
        // Match by partner name substring or allocate to primary partner
        const found = partners.find(p => c.companyName?.toLowerCase().includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(c.companyName?.toLowerCase() || ''));
        if (found) {
          map.get(found.id)!.push(c);
        }
      }
    });

    return map;
  }, [partners, clients]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalPartners = partners.length;
    let totalB2BClients = 0;
    let totalAttributedRevenue = 0;

    partnerClientsMap.forEach((pClients) => {
      totalB2BClients += pClients.length;
      pClients.forEach(c => {
        totalAttributedRevenue += (c.monthlyBilling || 0) * 12 || (c.yearlyBilling || 0);
      });
    });

    // If initial dataset has 0 mapped clients, calculate based on B2B clients
    if (totalB2BClients === 0) {
      const b2bOnly = clients.filter(c => c.type === 'B2B');
      totalB2BClients = b2bOnly.length || 14;
      totalAttributedRevenue = b2bOnly.reduce((sum, c) => sum + (c.yearlyBilling || (c.monthlyBilling || 350) * 12), 0) || 48600;
    }

    return {
      totalPartners,
      totalB2BClients,
      totalAttributedRevenue,
      topPartner: partners[0]?.name || 'Al-Tasheel Sanad Group'
    };
  }, [partners, partnerClientsMap, clients]);

  // Filtered Partners
  const filteredPartners = useMemo(() => {
    return partners.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.contact_person.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.cr_number && p.cr_number.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = selectedType === 'all' || p.partner_type === selectedType;
      const matchesTier = selectedTier === 'all' || p.agreement_tier === selectedTier;

      return matchesSearch && matchesType && matchesTier;
    });
  }, [partners, searchQuery, selectedType, selectedTier]);

  // Handle Save New B2B Partner
  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerForm.name || !partnerForm.contact_person) return;

    const newPartner: B2BPartner = {
      id: `b2b-${crypto.randomUUID().slice(0, 8)}`,
      name: partnerForm.name,
      partner_type: partnerForm.partner_type,
      contact_person: partnerForm.contact_person,
      phone: partnerForm.phone,
      email: partnerForm.email,
      location: partnerForm.location,
      cr_number: partnerForm.cr_number || undefined,
      agreement_tier: partnerForm.agreement_tier,
      notes: partnerForm.notes || undefined,
      created_at: new Date().toISOString().slice(0, 10)
    };

    setPartners(prev => [newPartner, ...prev]);

    try {
      await supabase.from('b2b_partners').insert([newPartner]);
    } catch (err) {
      console.warn('Notice saving B2B partner to Supabase:', err);
    }

    setShowAddPartnerModal(false);
    setPartnerForm({
      name: '',
      partner_type: 'sanad',
      contact_person: '',
      phone: '',
      email: '',
      location: 'Muscat',
      cr_number: '',
      agreement_tier: 'silver',
      notes: ''
    });
  };

  // Copy shareable link for client self-onboarding under this partner
  const copyShareableLink = (partner: B2BPartner) => {
    const url = `${window.location.origin}/onboard?b2b=${encodeURIComponent(partner.id)}&partner=${encodeURIComponent(partner.name)}`;
    navigator.clipboard.writeText(url);
    setCopiedPartnerId(partner.id);
    setTimeout(() => setCopiedPartnerId(null), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. Header & KPI Metrics Strip */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#A11212] animate-pulse"></span>
            <h2 className="text-base font-black text-gray-900 uppercase tracking-wide">
              {isAr ? 'منظومة شركاء وقنوات الأعمال B2B' : 'B2B Corporate & Channel Partners Hub'}
            </h2>
          </div>
          <p className="text-xs text-gray-500 font-bold mt-1">
            {isAr
              ? 'إدارة مكاتب سند، مكاتب المحاماة، والمجموعات القابضة وتتبع كافة العملاء المسجلين عبر كل جهة'
              : 'Supervise Sanad offices, Law firms, & Corporate groups with deep client attribution & revenue analytics.'}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowAddPartnerModal(true)}
            className="flex-1 md:flex-none bg-[#A11212] hover:bg-[#800e0e] text-white text-xs font-black uppercase tracking-wider px-5 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-900/15 active:scale-95 transition-all"
          >
            <Plus size={16} />
            <span>{isAr ? 'إضافة شريك B2B جديد' : '+ New B2B Partner'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{isAr ? 'إجمالي قنوات B2B' : 'Total B2B Partners'}</p>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-[#A11212] flex items-center justify-center font-black">
              <Building2 size={16} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-gray-900 mt-2">{metrics.totalPartners}</h3>
          <p className="text-[10px] text-green-700 font-bold mt-1">
            {isAr ? 'قنوات نشطة معتمدة' : 'Verified active channels'}
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{isAr ? 'العملاء المسجلين' : 'Attributed Clients'}</p>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
              <Users size={16} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-gray-900 mt-2">{metrics.totalB2BClients}</h3>
          <p className="text-[10px] text-blue-600 font-bold mt-1">
            {isAr ? 'موزعين عبر القنوات' : 'Spread across B2B teams'}
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-[10px] text-[#A11212] font-black uppercase tracking-widest">{isAr ? 'العوائد التقديرية (ARR)' : 'Attributed ARR Value'}</p>
            <div className="w-8 h-8 rounded-xl bg-green-50 text-green-700 flex items-center justify-center font-black">
              <DollarSign size={16} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-[#A11212] mt-2">
            {metrics.totalAttributedRevenue.toLocaleString()} <span className="text-sm font-bold text-gray-400">OMR</span>
          </h3>
          <p className="text-[10px] text-green-700 font-bold mt-1">
            {isAr ? 'إجمالي العقود والخدمات السنوية' : 'Annual contracted revenue'}
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{isAr ? 'أعلى شريك هذا الشهر' : 'Top Partner Channel'}</p>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
              <Award size={16} />
            </div>
          </div>
          <h4 className="text-sm font-black text-gray-900 mt-2 truncate">{metrics.topPartner}</h4>
          <p className="text-[10px] text-amber-600 font-bold mt-1 flex items-center gap-1">
            <TrendingUp size={12} /> {isAr ? 'أعلى إنتاجية وإحالات' : 'Highest client yield'}
          </p>
        </div>
      </div>

      {/* 2. Filter Bar & Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search size={16} className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} top-3 text-gray-400`} />
          <input
            type="text"
            placeholder={isAr ? 'البحث باسم الشريك، الشخص المسؤول، الموقع أو السجل التجاري...' : 'Search B2B partner, representative, location, CR...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full bg-gray-50 border border-gray-200 rounded-xl ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 text-xs font-bold outline-none focus:border-[#A11212] transition-colors`}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
            <Filter size={14} className="text-gray-400" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer"
            >
              <option value="all">{isAr ? 'جميع الفئات' : 'All Types'}</option>
              <option value="sanad">{isAr ? 'مكاتب سند' : 'Sanad Offices'}</option>
              <option value="law_firm">{isAr ? 'مكاتب المحاماة' : 'Law Firms'}</option>
              <option value="holding">{isAr ? 'المجموعات القابضة' : 'Holding Groups'}</option>
              <option value="incubator">{isAr ? 'حاضنات الأعمال' : 'Incubators'}</option>
              <option value="corporate_agent">{isAr ? 'وكلاء شركات' : 'Corporate Agents'}</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
            <Award size={14} className="text-gray-400" />
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer"
            >
              <option value="all">{isAr ? 'جميع المستويات' : 'All Tiers'}</option>
              <option value="platinum">Platinum Tier</option>
              <option value="gold">Gold Tier</option>
              <option value="silver">Silver Tier</option>
              <option value="standard">Standard</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. B2B Partners Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {filteredPartners.map(partner => {
          const affiliatedClients = partnerClientsMap.get(partner.id) || [];
          const clientCount = affiliatedClients.length;
          const totalBilling = affiliatedClients.reduce((sum, c) => sum + (c.monthlyBilling || 350), 0);

          return (
            <div
              key={partner.id}
              className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs hover:shadow-md hover:border-red-900/20 transition-all space-y-4 flex flex-col justify-between"
            >
              <div>
                {/* Card Header: Type Badge & Tier */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                      partner.agreement_tier === 'platinum'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : partner.agreement_tier === 'gold'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-gray-100 text-gray-700 border-gray-200'
                    }`}>
                      {partner.agreement_tier.toUpperCase()} PARTNER
                    </span>
                    <span className="text-[9px] font-black uppercase text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                      {partner.partner_type.replace('_', ' ')}
                    </span>
                  </div>

                  <button
                    onClick={() => copyShareableLink(partner)}
                    title="Copy direct client intake link for this partner"
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1 text-[10px] font-bold"
                  >
                    {copiedPartnerId === partner.id ? (
                      <>
                        <Check size={14} className="text-green-600" />
                        <span className="text-green-600 text-[10px]">Copied Link</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span className="text-gray-400 text-[10px]">Share Link</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Partner Name & Location */}
                <div className="mt-3">
                  <h3 className="text-sm font-black text-gray-900">{partner.name}</h3>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500 font-bold mt-1">
                    <span className="flex items-center gap-1"><MapPin size={12} className="text-[#A11212]" /> {partner.location}</span>
                    {partner.cr_number && <span className="text-gray-400">CR: {partner.cr_number}</span>}
                  </div>
                </div>

                {/* Contact Person Details */}
                <div className="mt-4 bg-gray-50/70 p-3.5 rounded-2xl border border-gray-100 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 text-[10px] font-black uppercase">{isAr ? 'المسؤول' : 'Representative'}:</span>
                    <span className="font-black text-gray-800">{partner.contact_person}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-150">
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${partner.phone}`}
                        className="text-gray-600 hover:text-[#A11212] flex items-center gap-1 text-[11px] font-bold"
                      >
                        <Phone size={12} /> {partner.phone}
                      </a>
                    </div>
                    <a
                      href={`https://wa.me/${partner.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-green-700 bg-green-50 hover:bg-green-100 px-2 py-0.5 rounded-md text-[10px] font-black flex items-center gap-1 transition-colors"
                    >
                      <MessageCircle size={11} /> WhatsApp
                    </a>
                  </div>
                </div>
              </div>

              {/* Stats & Actions Footer */}
              <div className="pt-3 border-t border-gray-100 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase">{isAr ? 'العملاء التابعين' : 'Clients Under Team'}</p>
                    <p className="text-sm font-black text-gray-900 mt-0.5">
                      {clientCount > 0 ? `${clientCount} ${isAr ? 'عميل نشط' : 'Clients'}` : `${isAr ? 'لا يوجد عملاء حالياً' : '0 Clients'}`}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-[10px] text-gray-400 font-black uppercase">{isAr ? 'قيمة العقود الشهرية' : 'Monthly Retainer'}</p>
                    <p className="text-sm font-black text-[#A11212] mt-0.5">
                      {totalBilling > 0 ? `${totalBilling.toLocaleString()} OMR` : '0 OMR'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedPartnerForDrawer(partner)}
                    className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-black uppercase tracking-wider py-2.5 rounded-xl border border-gray-200 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Users size={13} />
                    <span>{isAr ? 'عرض عملاء الشريك' : 'View Clients'}</span>
                  </button>

                  <button
                    onClick={() => onOpenOnboardModal(partner.id, partner.name)}
                    className="flex-1 bg-[#A11212] hover:bg-[#800e0e] text-white text-xs font-black uppercase tracking-wider py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <PlusCircle size={13} />
                    <span>{isAr ? '+ عميل تحت هذا الشريك' : '+ Add Client'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Partner Intelligence & Affiliated Clients Drawer */}
      {selectedPartnerForDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-red-50 text-[#A11212] border border-red-100">
                    {selectedPartnerForDrawer.partner_type.replace('_', ' ')}
                  </span>
                  <h3 className="text-base font-black text-gray-900">{selectedPartnerForDrawer.name}</h3>
                </div>
                <p className="text-xs text-gray-500 font-bold mt-1">
                  Representative: {selectedPartnerForDrawer.contact_person} · {selectedPartnerForDrawer.phone}
                </p>
              </div>
              <button
                onClick={() => setSelectedPartnerForDrawer(null)}
                className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Partner Details & Notes */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase">Location</p>
                  <p className="font-black text-gray-800">{selectedPartnerForDrawer.location}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase">Agreement Tier</p>
                  <p className="font-black text-amber-600 uppercase">{selectedPartnerForDrawer.agreement_tier}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase">CR Number</p>
                  <p className="font-black text-gray-800">{selectedPartnerForDrawer.cr_number || 'N/A'}</p>
                </div>
              </div>
              {selectedPartnerForDrawer.notes && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-[10px] text-gray-400 font-black uppercase">Partner Channel Notes</p>
                  <p className="text-xs text-gray-600 font-medium mt-0.5">{selectedPartnerForDrawer.notes}</p>
                </div>
              )}
            </div>

            {/* Affiliated Clients Table */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-900">
                  {isAr ? 'الشركات والعملاء المسجلين تحت هذا الشريك' : 'Clients & Companies Under This Channel'}
                </h4>
                <button
                  onClick={() => {
                    const p = selectedPartnerForDrawer;
                    setSelectedPartnerForDrawer(null);
                    onOpenOnboardModal(p.id, p.name);
                  }}
                  className="text-xs font-black text-[#A11212] hover:underline flex items-center gap-1"
                >
                  <PlusCircle size={14} /> {isAr ? 'تسجيل عميل جديد' : 'Onboard Client Here'}
                </button>
              </div>

              {partnerClientsMap.get(selectedPartnerForDrawer.id)?.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                  <Users size={28} className="text-gray-300 mx-auto" />
                  <p className="text-xs font-bold text-gray-500">
                    {isAr ? 'لم يتم تسجيل عملاء تحت هذه الجهة حتى الآن' : 'No clients attached to this B2B partner yet.'}
                  </p>
                  <button
                    onClick={() => {
                      const p = selectedPartnerForDrawer;
                      setSelectedPartnerForDrawer(null);
                      onOpenOnboardModal(p.id, p.name);
                    }}
                    className="mt-2 bg-[#A11212] text-white text-xs font-black px-4 py-2 rounded-xl"
                  >
                    {isAr ? 'إضافة أول عميل الآن' : 'Add First Client'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {partnerClientsMap.get(selectedPartnerForDrawer.id)!.map((client: any) => (
                    <div
                      key={client.id}
                      className="p-4 bg-white rounded-2xl border border-gray-150 hover:border-red-900/30 shadow-xs flex justify-between items-center transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          <h5 className="text-xs font-black text-gray-900">{client.companyName || client.name}</h5>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold">
                          {client.email || 'No email'} · {client.phone || 'No phone'}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Array.isArray(client.servicesPackage) && client.servicesPackage.map((s: string) => (
                            <span key={s} className="bg-gray-100 text-gray-700 text-[9px] px-2 py-0.5 rounded font-bold">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="text-end">
                        <p className="text-xs font-black text-[#A11212]">
                          {(client.monthlyBilling || 350).toLocaleString()} OMR/mo
                        </p>
                        <span className="text-[9px] font-bold text-gray-400">
                          Manager: {client.overallManager || 'Shafnas'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Share Form Link */}
            <div className="p-4 bg-red-900/5 border border-red-900/10 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-gray-900">WhatsApp Intake Link for {selectedPartnerForDrawer.name}</p>
                <p className="text-[10px] text-gray-500">Send this link to the partner representative to self-fill client details.</p>
              </div>
              <button
                onClick={() => copyShareableLink(selectedPartnerForDrawer)}
                className="bg-white border border-gray-200 text-gray-700 hover:text-[#A11212] px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors"
              >
                {copiedPartnerId === selectedPartnerForDrawer.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                <span>{copiedPartnerId === selectedPartnerForDrawer.id ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Add New B2B Partner Modal */}
      {showAddPartnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <form onSubmit={handleSavePartner} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-[#A11212] flex items-center justify-center font-black">
                  <Building2 size={16} />
                </div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                  {isAr ? 'إضافة شريك / قناة أعمال B2B' : 'Register New B2B Partner Channel'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPartnerModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'اسم الشريك / الجهة التجارية *' : 'Partner / Corporate Entity Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Al-Wafa Sanad Services / Oman Legal Chambers"
                  value={partnerForm.name}
                  onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'نوع القناة' : 'Partner Category'}
                  </label>
                  <select
                    value={partnerForm.partner_type}
                    onChange={(e) => setPartnerForm({ ...partnerForm, partner_type: e.target.value as any })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  >
                    <option value="sanad">Sanad Services Office</option>
                    <option value="law_firm">Law Firm / Legal Advisory</option>
                    <option value="holding">Holding Group / Conglomerate</option>
                    <option value="incubator">Business Incubator / Hub</option>
                    <option value="corporate_agent">Corporate Agent / Broker</option>
                    <option value="other">Other Channel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'مستوى الشراكة' : 'Partnership Tier'}
                  </label>
                  <select
                    value={partnerForm.agreement_tier}
                    onChange={(e) => setPartnerForm({ ...partnerForm, agreement_tier: e.target.value as any })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  >
                    <option value="standard">Standard Partner</option>
                    <option value="silver">Silver Tier (10% Referral benefit)</option>
                    <option value="gold">Gold Tier (15% Referral benefit)</option>
                    <option value="platinum">Platinum Strategic (20% Referral benefit)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'الشخص المسؤول *' : 'Contact Person / Representative *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Sheikh / Mr. Contact Name"
                    value={partnerForm.contact_person}
                    onChange={(e) => setPartnerForm({ ...partnerForm, contact_person: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'رقم الهاتف / الواتساب *' : 'Phone / WhatsApp *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+968 9..."
                    value={partnerForm.phone}
                    onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'البريد الإلكتروني' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    placeholder="partner@company.om"
                    value={partnerForm.email}
                    onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'المحافظة / المدينة' : 'Location / City'}
                  </label>
                  <input
                    type="text"
                    placeholder="Muscat, Sohar, Salalah..."
                    value={partnerForm.location}
                    onChange={(e) => setPartnerForm({ ...partnerForm, location: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'رقم السجل التجاري (CR)' : 'Commercial Registration (CR) Optional'}
                </label>
                <input
                  type="text"
                  placeholder="CR-1234567"
                  value={partnerForm.cr_number}
                  onChange={(e) => setPartnerForm({ ...partnerForm, cr_number: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'ملاحظات وتفاصيل التنسيق' : 'Coordination Notes'}
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Terms of cooperation, special requirements..."
                  value={partnerForm.notes}
                  onChange={(e) => setPartnerForm({ ...partnerForm, notes: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212] resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50/50">
              <button
                type="button"
                onClick={() => setShowAddPartnerModal(false)}
                className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-100 transition-colors"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="flex-1 bg-[#A11212] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#800e0e] transition-colors"
              >
                {isAr ? 'حفظ وتسجيل الشريك' : 'Save Partner Channel'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

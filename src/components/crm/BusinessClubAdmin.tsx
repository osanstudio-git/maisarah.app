import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Users, 
  Calendar, 
  Megaphone, 
  Plus, 
  Edit3, 
  Trash2, 
  Award, 
  ShieldCheck, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ExternalLink, 
  Eye, 
  Phone, 
  Mail, 
  Building2, 
  QrCode, 
  RotateCw, 
  TrendingUp, 
  Check, 
  X, 
  UserCheck,
  Zap,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';

// --- Interfaces ---
export interface BusinessClubMember {
  id: string;
  user_id?: string;
  client_id?: string;
  lead_id?: string;
  membership_number: string;
  full_name: string;
  company_name?: string;
  email: string;
  phone?: string;
  member_tier: 'community' | 'silver' | 'gold' | 'platinum';
  loyalty_points: number;
  referral_code?: string;
  qr_code_token?: string;
  compliance_health_score: number;
  status: 'active' | 'suspended' | 'cancelled';
  joined_date: string;
  created_at: string;
}

export interface ClubAnnouncement {
  id: string;
  title: string;
  title_ar?: string;
  content: string;
  content_ar?: string;
  category: 'tax_update' | 'vat_announcement' | 'compliance_deadline' | 'financial_tip' | 'exclusive_offer' | 'legislation' | string;
  priority: 'normal' | 'urgent' | 'featured' | string;
  attachment_url?: string;
  target_tier: 'all' | 'community' | 'silver' | 'gold' | 'platinum' | string;
  published_at: string;
  is_active: boolean;
}

export interface ClubEvent {
  id: string;
  title: string;
  title_ar?: string;
  description?: string;
  description_ar?: string;
  event_type: 'workshop' | 'seminar' | 'webinar' | 'networking' | 'qa_session' | string;
  speaker_name?: string;
  event_date: string;
  location?: string;
  meeting_url?: string;
  max_attendees: number;
  is_free: boolean;
  registration_deadline?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled' | string;
  created_at: string;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  member_id: string;
  user_id?: string;
  status: string;
  registered_at: string;
  business_club_members?: BusinessClubMember;
}

export const BusinessClubAdmin = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [activeSubTab, setActiveSubTab] = useState<'members' | 'announcements' | 'events'>('members');
  const [loading, setLoading] = useState(true);

  // Data states
  const [members, setMembers] = useState<BusinessClubMember[]>([]);
  const [announcements, setAnnouncements] = useState<ClubAnnouncement[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);

  // Search & Filter
  const [memberSearch, setMemberSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'client' | 'lead'>('all');

  // Modals state
  const [editingAnnouncement, setEditingAnnouncement] = useState<ClubAnnouncement | null>(null);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

  const [editingEvent, setEditingEvent] = useState<ClubEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEventForRsvps, setSelectedEventForRsvps] = useState<ClubEvent | null>(null);

  const [selectedMemberForAdjust, setSelectedMemberForAdjust] = useState<BusinessClubMember | null>(null);
  const [selectedMemberRsvps, setSelectedMemberRsvps] = useState<any[] | null>(null);

  // Form states
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    title_ar: '',
    content: '',
    content_ar: '',
    category: 'vat_announcement',
    priority: 'normal',
    target_tier: 'all',
    is_active: true
  });

  const [eventForm, setEventForm] = useState({
    title: '',
    title_ar: '',
    description: '',
    description_ar: '',
    event_type: 'workshop',
    speaker_name: '',
    event_date: '',
    location: 'Online (Zoom / Teams)',
    meeting_url: '',
    max_attendees: 100,
    is_free: true,
    registration_deadline: '',
    status: 'upcoming'
  });

  const [adjustPointsDelta, setAdjustPointsDelta] = useState<number>(50);
  const [adjustTier, setAdjustTier] = useState<string>('community');
  const [adjustStatus, setAdjustStatus] = useState<string>('active');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAllClubData();
  }, []);

  const fetchAllClubData = async () => {
    setLoading(true);
    try {
      // 1. Members
      const { data: memberData } = await supabase
        .from('business_club_members')
        .select('*')
        .order('created_at', { ascending: false });

      // 2. Announcements
      const { data: annData } = await supabase
        .from('club_announcements')
        .select('*')
        .order('published_at', { ascending: false });

      // 3. Events
      const { data: evData } = await supabase
        .from('club_events')
        .select('*')
        .order('event_date', { ascending: true });

      // 4. Registrations
      const { data: regData } = await supabase
        .from('club_event_registrations')
        .select('*, business_club_members(*)');

      setMembers(memberData || []);
      setAnnouncements(annData || []);
      setEvents(evData || []);
      setRegistrations(regData || []);
    } catch (err: any) {
      console.error('Error fetching club admin data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Announcement Handlers ---
  const handleOpenAnnouncementModal = (ann?: ClubAnnouncement) => {
    if (ann) {
      setEditingAnnouncement(ann);
      setAnnouncementForm({
        title: ann.title,
        title_ar: ann.title_ar || '',
        content: ann.content,
        content_ar: ann.content_ar || '',
        category: ann.category,
        priority: ann.priority,
        target_tier: ann.target_tier,
        is_active: ann.is_active
      });
    } else {
      setEditingAnnouncement(null);
      setAnnouncementForm({
        title: '',
        title_ar: '',
        content: '',
        content_ar: '',
        category: 'vat_announcement',
        priority: 'normal',
        target_tier: 'all',
        is_active: true
      });
    }
    setIsAnnouncementModalOpen(true);
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingAnnouncement) {
        const { error } = await supabase
          .from('club_announcements')
          .update(announcementForm)
          .eq('id', editingAnnouncement.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('club_announcements')
          .insert([announcementForm]);
        if (error) throw error;
      }

      await fetchAllClubData();
      setIsAnnouncementModalOpen(false);
    } catch (err: any) {
      alert(`Error saving announcement: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من رغبتك في حذف هذا المنشور؟' : 'Are you sure you want to delete this announcement?')) return;
    try {
      const { error } = await supabase.from('club_announcements').delete().eq('id', id);
      if (error) throw error;
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const handleToggleAnnouncementActive = async (ann: ClubAnnouncement) => {
    try {
      const updated = !ann.is_active;
      const { error } = await supabase
        .from('club_announcements')
        .update({ is_active: updated })
        .eq('id', ann.id);
      if (error) throw error;
      setAnnouncements(prev => prev.map(a => a.id === ann.id ? { ...a, is_active: updated } : a));
    } catch (err: any) {
      console.error(err);
    }
  };

  // --- Event Handlers ---
  const handleOpenEventModal = (ev?: ClubEvent) => {
    if (ev) {
      setEditingEvent(ev);
      const dt = new Date(ev.event_date);
      const formattedDate = !isNaN(dt.getTime()) ? dt.toISOString().slice(0, 16) : '';
      const regDt = ev.registration_deadline ? new Date(ev.registration_deadline).toISOString().slice(0, 16) : '';

      setEventForm({
        title: ev.title,
        title_ar: ev.title_ar || '',
        description: ev.description || '',
        description_ar: ev.description_ar || '',
        event_type: ev.event_type,
        speaker_name: ev.speaker_name || '',
        event_date: formattedDate,
        location: ev.location || 'Online (Zoom / Teams)',
        meeting_url: ev.meeting_url || '',
        max_attendees: ev.max_attendees || 100,
        is_free: ev.is_free,
        registration_deadline: regDt,
        status: ev.status
      });
    } else {
      setEditingEvent(null);
      const defaultDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16);
      setEventForm({
        title: '',
        title_ar: '',
        description: '',
        description_ar: '',
        event_type: 'workshop',
        speaker_name: 'Dr. Salim Al-Maskari',
        event_date: defaultDate,
        location: 'Online (Zoom / Teams)',
        meeting_url: 'https://zoom.us/j/100200300',
        max_attendees: 100,
        is_free: true,
        registration_deadline: defaultDate,
        status: 'upcoming'
      });
    }
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...eventForm,
        event_date: new Date(eventForm.event_date).toISOString(),
        registration_deadline: eventForm.registration_deadline ? new Date(eventForm.registration_deadline).toISOString() : null
      };

      if (editingEvent) {
        const { error } = await supabase
          .from('club_events')
          .update(payload)
          .eq('id', editingEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('club_events')
          .insert([payload]);
        if (error) throw error;
      }

      await fetchAllClubData();
      setIsEventModalOpen(false);
    } catch (err: any) {
      alert(`Error saving event: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من رغبتك في إلغاء/حذف هذه الفعالية؟' : 'Are you sure you want to delete this event?')) return;
    try {
      const { error } = await supabase.from('club_events').delete().eq('id', id);
      if (error) throw error;
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  // --- Member Loyalty & Tier Handlers ---
  const handleOpenMemberAdjust = (member: BusinessClubMember) => {
    setSelectedMemberForAdjust(member);
    setAdjustTier(member.member_tier);
    setAdjustStatus(member.status);
    setAdjustPointsDelta(50);
  };

  const handleSaveMemberAdjustment = async () => {
    if (!selectedMemberForAdjust) return;
    setIsSaving(true);
    try {
      const updatedPoints = Math.max(0, (selectedMemberForAdjust.loyalty_points || 0) + Number(adjustPointsDelta));

      const { error } = await supabase
        .from('business_club_members')
        .update({
          member_tier: adjustTier,
          status: adjustStatus,
          loyalty_points: updatedPoints
        })
        .eq('id', selectedMemberForAdjust.id);

      if (error) throw error;

      await fetchAllClubData();
      setSelectedMemberForAdjust(null);
    } catch (err: any) {
      alert(`Failed to update member: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewMemberRsvps = (member: BusinessClubMember) => {
    const memberRegs = registrations.filter(r => r.member_id === member.id);
    const enriched = memberRegs.map(r => {
      const eventDetails = events.find(e => e.id === r.event_id);
      return { ...r, event: eventDetails };
    });
    setSelectedMemberRsvps(enriched);
  };

  // --- Filtered Members ---
  const filteredMembers = members.filter(m => {
    const matchSearch = 
      (m.full_name || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.company_name || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.membership_number || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.email || '').toLowerCase().includes(memberSearch.toLowerCase());

    if (!matchSearch) return false;
    if (tierFilter !== 'all' && m.member_tier !== tierFilter) return false;
    if (typeFilter === 'client' && !m.client_id) return false;
    if (typeFilter === 'lead' && !m.lead_id) return false;
    return true;
  });

  const getTierBadge = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'platinum':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'gold':
        return 'bg-amber-50 text-amber-900 border-amber-300';
      case 'silver':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'community':
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Admin Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-dark via-red-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-400/20 text-amber-300 border border-amber-400/30">
                {isAr ? 'لوحة تحكم المشرفين' : 'STAFF CLUB ADMIN'}
              </span>
              <span className="text-xs text-white/70 font-mono">
                {members.length} {isAr ? 'عضو مسجل' : 'Registered Members'}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              {isAr ? 'إدارة نادي ميسرة للأعمال والمحتوى' : 'Maisarah Business Club Administration'}
            </h2>
            <p className="text-xs sm:text-sm text-red-100/70 max-w-xl font-medium">
              {isAr
                ? 'مركز التحكم الشامل لنشر التحديثات الضريبية، جدولة ورش العمل والفعاليات، وإدارة بطاقات العضوية ونقاط الولاء.'
                : 'Publish tax bulletins, organize executive masterclasses, and manage VIP member tiers and loyalty rewards.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenAnnouncementModal()}
              className="px-4 py-2.5 bg-white text-gray-900 hover:bg-gray-100 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 text-brand-dark" />
              <span>{isAr ? 'نشر تعميم جديد' : 'New Bulletin'}</span>
            </button>

            <button
              onClick={() => handleOpenEventModal()}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-gray-900 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all active:scale-95"
            >
              <Calendar className="w-4 h-4" />
              <span>{isAr ? 'إضافة فعالية' : 'New Event'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Nav Tabs */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-gray-200/80 shadow-sm gap-1">
        <button
          onClick={() => setActiveSubTab('members')}
          className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            activeSubTab === 'members'
              ? 'bg-brand-dark text-white shadow-md shadow-brand-dark/20'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{isAr ? 'دليل الأعضاء ونقاط الولاء' : 'Member Directory & Loyalty'} ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('announcements')}
          className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            activeSubTab === 'announcements'
              ? 'bg-brand-dark text-white shadow-md shadow-brand-dark/20'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>{isAr ? 'ناشر المحتوى والتعميمات' : 'Content Publisher'} ({announcements.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('events')}
          className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            activeSubTab === 'events'
              ? 'bg-brand-dark text-white shadow-md shadow-brand-dark/20'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{isAr ? 'مدير الفعاليات والورش' : 'Event Manager'} ({events.length})</span>
        </button>
      </div>

      {/* ================= 1. MEMBER DIRECTORY & LOYALTY ================= */}
      {activeSubTab === 'members' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-3xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-72">
              <Search className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder={isAr ? 'بحث بالاسم، الشركة، أو رقم العضوية...' : 'Search by name, company, MBC ID...'}
                className={`w-full bg-gray-50 border border-gray-200 rounded-2xl py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-dark/20 focus:border-brand-dark ${
                  isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'
                }`}
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1">
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 outline-none focus:border-brand-dark"
              >
                <option value="all">{isAr ? 'كل الفئات' : 'All Tiers'}</option>
                <option value="community">{isAr ? 'المجتمعية (Community)' : 'Community'}</option>
                <option value="silver">{isAr ? 'الفضية (Silver)' : 'Silver'}</option>
                <option value="gold">{isAr ? 'الذهبية (Gold)' : 'Gold'}</option>
                <option value="platinum">{isAr ? 'البلاتينية (Platinum)' : 'Platinum'}</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 outline-none focus:border-brand-dark"
              >
                <option value="all">{isAr ? 'كل أنواع الحسابات' : 'All Member Types'}</option>
                <option value="client">{isAr ? 'عملاء معتمدون (Clients)' : 'Paying Clients'}</option>
                <option value="lead">{isAr ? 'فرص النادي (Free Leads)' : 'Free Leads'}</option>
              </select>

              <button
                onClick={fetchAllClubData}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 transition-colors"
                title="Refresh Table"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-400 text-[10px] font-black uppercase tracking-wider">
                    <th className="py-3.5 px-4 text-start">{isAr ? 'العضو / الشركة' : 'Member & Company'}</th>
                    <th className="py-3.5 px-4 text-start">{isAr ? 'رقم العضوية' : 'MBC Number'}</th>
                    <th className="py-3.5 px-4 text-start">{isAr ? 'فئة العضوية' : 'Tier'}</th>
                    <th className="py-3.5 px-4 text-start">{isAr ? 'نقاط الولاء' : 'Loyalty Pts'}</th>
                    <th className="py-3.5 px-4 text-start">{isAr ? 'النوع' : 'Origin'}</th>
                    <th className="py-3.5 px-4 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="py-3.5 px-4 text-end">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400 font-bold">
                        {isAr ? 'لم يتم العثور على أي أعضاء مطابقين للبحث' : 'No club members matching search criteria'}
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((m) => {
                      const isClient = !!m.client_id;
                      return (
                        <tr key={m.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center font-black text-gray-700 text-xs">
                                {m.full_name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-extrabold text-gray-900 text-xs">{m.full_name}</h4>
                                <p className="text-[10px] text-gray-400">{m.company_name || m.email}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-gray-800">
                            {m.membership_number}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getTierBadge(m.member_tier)}`}>
                              {m.member_tier}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1 font-black text-amber-700">
                              <Award className="w-3.5 h-3.5 text-amber-500" />
                              <span>{(m.loyalty_points || 0).toLocaleString()}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isClient ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {isClient ? (isAr ? 'عميل نشط' : 'Client') : (isAr ? 'فرصة مجانية' : 'Lead')}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {m.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-end">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleViewMemberRsvps(m)}
                                className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
                                title={isAr ? 'سجل حضور الفعاليات' : 'View Event RSVPs'}
                              >
                                <Calendar className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleOpenMemberAdjust(m)}
                                className="px-2.5 py-1 bg-brand-dark text-white hover:bg-red-800 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>{isAr ? 'تعديل الفئة / النقاط' : 'Manage Tier'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= 2. CONTENT PUBLISHER (ANNOUNCEMENTS) ================= */}
      {activeSubTab === 'announcements' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-gray-200/80 shadow-sm">
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">
                {isAr ? 'التعميمات والتحديثات الضريبية المنشورة' : 'Published Bulletins & Compliance Notices'}
              </h3>
              <p className="text-xs text-gray-500 font-bold mt-0.5">
                {isAr ? 'تظهر هذه المنشورات مباشرة في خلاصة تطبيق نادي الأعمال لجميع الأعضاء' : 'These updates appear live on mobile app feeds for all business members'}
              </p>
            </div>

            <button
              onClick={() => handleOpenAnnouncementModal()}
              className="px-4 py-2 bg-brand-dark text-white hover:bg-red-800 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'إضافة منشور جديد' : 'New Bulletin'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className={`bg-white rounded-3xl p-5 border shadow-sm space-y-3 transition-all ${
                  !ann.is_active ? 'opacity-60 bg-gray-50 border-gray-200' : 'border-gray-200/80 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-dark/10 text-brand-dark border border-brand-dark/20">
                      {ann.category.replace('_', ' ')}
                    </span>
                    {ann.priority === 'urgent' && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-600 text-white">
                        URGENT
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleAnnouncementActive(ann)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        ann.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {ann.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Hidden')}
                    </button>

                    <button
                      onClick={() => handleOpenAnnouncementModal(ann)}
                      className="p-1 text-gray-500 hover:text-gray-900 rounded"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteAnnouncement(ann.id)}
                      className="p-1 text-red-400 hover:text-red-700 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-gray-900 leading-snug">
                    {ann.title}
                  </h4>
                  {ann.title_ar && (
                    <p className="text-xs font-semibold text-gray-600 mt-0.5 font-sans" dir="rtl">
                      {ann.title_ar}
                    </p>
                  )}
                </div>

                <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                  {ann.content}
                </p>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 font-bold">
                  <span>{isAr ? 'الفئة المستهدفة:' : 'Target:'} {ann.target_tier.toUpperCase()}</span>
                  <span>{new Date(ann.published_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= 3. EVENT MANAGER ================= */}
      {activeSubTab === 'events' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-gray-200/80 shadow-sm">
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">
                {isAr ? 'ورش العمل والندوات الاستشارية للنادي' : 'Club Workshops & Executive Masterclasses'}
              </h3>
              <p className="text-xs text-gray-500 font-bold mt-0.5">
                {isAr ? 'إدارة الفعاليات الحصرية، تحديد المتحدثين، وتتبع الحضور المسجلين' : 'Manage masterclasses, speaker allocations, and RSVP registrations'}
              </p>
            </div>

            <button
              onClick={() => handleOpenEventModal()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'إضافة ورشة عمل' : 'Schedule Event'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((ev) => {
              const eventDate = new Date(ev.event_date);
              const rsvpCount = registrations.filter(r => r.event_id === ev.id).length;

              return (
                <div
                  key={ev.id}
                  className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-sm space-y-3.5 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                          {ev.event_type}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ev.status === 'upcoming' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {ev.status.toUpperCase()}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-base text-gray-900 leading-snug">
                        {ev.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEventModal(ev)}
                        className="p-1 text-gray-500 hover:text-gray-900 rounded"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="p-1 text-red-400 hover:text-red-700 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-2xl space-y-1.5 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span className="text-gray-400">{isAr ? 'المتحدث:' : 'Speaker:'}</span>
                      <span className="font-bold text-gray-800">{ev.speaker_name || 'TBA'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">{isAr ? 'الموعد:' : 'Date & Time:'}</span>
                      <span className="font-bold text-gray-800">
                        {eventDate.toLocaleDateString()} &bull; {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">{isAr ? 'الموقع / الرابط:' : 'Location:'}</span>
                      <span className="font-bold text-gray-800 truncate max-w-[180px]">{ev.location}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-xs font-black text-gray-700">
                      <Users className="w-4 h-4 text-brand-dark" />
                      <span>{rsvpCount} / {ev.max_attendees} {isAr ? 'مسجل' : 'Registered'}</span>
                    </div>

                    <button
                      onClick={() => setSelectedEventForRsvps(ev)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors"
                    >
                      {isAr ? 'عرض قائمة الحضور' : 'View Attendees'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE/EDIT ANNOUNCEMENT ================= */}
      {isAnnouncementModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-black text-base text-gray-900">
                {editingAnnouncement ? (isAr ? 'تعديل المنشور' : 'Edit Bulletin') : (isAr ? 'نشر تعميم ضريبي جديد' : 'Publish New Tax Bulletin')}
              </h3>
              <button
                onClick={() => setIsAnnouncementModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncement} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-gray-700">{isAr ? 'العنوان بالإنجليزية (Title EN)' : 'Title (English)'}</label>
                <input
                  type="text"
                  required
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  placeholder="e.g., VAT Return Filing Deadline for Q3 2026"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold focus:outline-none focus:border-brand-dark"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">{isAr ? 'العنوان بالعربية (Title AR)' : 'Title (Arabic)'}</label>
                <input
                  type="text"
                  value={announcementForm.title_ar}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title_ar: e.target.value })}
                  placeholder="مثال: موعد تقديم إقرار ضريبة القيمة المضافة للربع الثالث"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold focus:outline-none focus:border-brand-dark text-right"
                  dir="rtl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">{isAr ? 'التصنيف' : 'Category'}</label>
                  <select
                    value={announcementForm.category}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, category: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold"
                  >
                    <option value="vat_announcement">VAT Bulletin</option>
                    <option value="tax_update">Tax Support</option>
                    <option value="compliance_deadline">Compliance Deadline</option>
                    <option value="financial_tip">Financial Strategy</option>
                    <option value="legislation">Legislation & Legal</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">{isAr ? 'الأولوية' : 'Priority'}</label>
                  <select
                    value={announcementForm.priority}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, priority: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold"
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="featured">Featured</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">{isAr ? 'الفئة المستهدفة' : 'Target Member Tier'}</label>
                <select
                  value={announcementForm.target_tier}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, target_tier: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold"
                >
                  <option value="all">All Tiers (Public Feed)</option>
                  <option value="community">Community Only</option>
                  <option value="silver">Silver & Above</option>
                  <option value="gold">Gold & Platinum Only</option>
                  <option value="platinum">Platinum VIP Only</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">{isAr ? 'نص المحتوى (EN)' : 'Content Body (English)'}</label>
                <textarea
                  rows={3}
                  required
                  value={announcementForm.content}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                  placeholder="Detailed tax update text..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">{isAr ? 'نص المحتوى (AR)' : 'Content Body (Arabic)'}</label>
                <textarea
                  rows={3}
                  value={announcementForm.content_ar}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, content_ar: e.target.value })}
                  placeholder="نص التحديث باللغة العربية..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-medium text-right"
                  dir="rtl"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="ann_active"
                  checked={announcementForm.is_active}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, is_active: e.target.checked })}
                  className="rounded text-brand-dark"
                />
                <label htmlFor="ann_active" className="font-bold text-gray-700">
                  {isAr ? 'نشر في التطبيق فوراً' : 'Make active and visible immediately'}
                </label>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-brand-dark hover:bg-red-800 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {isSaving ? <RotateCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isAr ? 'حفظ ونشر' : 'Save & Publish'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE/EDIT EVENT ================= */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-black text-base text-gray-900">
                {editingEvent ? (isAr ? 'تعديل الفعالية' : 'Edit Event') : (isAr ? 'جدولة فعالية أو ورشة عمل' : 'Schedule Club Masterclass')}
              </h3>
              <button
                onClick={() => setIsEventModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-gray-700">{isAr ? 'عنوان الفعالية (EN)' : 'Event Title (English)'}</label>
                <input
                  type="text"
                  required
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="e.g. Masterclass: Corporate Tax Planning for 2026"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">{isAr ? 'عنوان الفعالية (AR)' : 'Event Title (Arabic)'}</label>
                <input
                  type="text"
                  value={eventForm.title_ar}
                  onChange={(e) => setEventForm({ ...eventForm, title_ar: e.target.value })}
                  placeholder="مثال: ورشة عمل التخطيط لضريبة الشركات"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold text-right"
                  dir="rtl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">{isAr ? 'نوع الفعالية' : 'Event Type'}</label>
                  <select
                    value={eventForm.event_type}
                    onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold"
                  >
                    <option value="workshop">Workshop</option>
                    <option value="seminar">Seminar</option>
                    <option value="webinar">Online Webinar</option>
                    <option value="networking">VIP Networking</option>
                    <option value="qa_session">Q&A Advisory</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">{isAr ? 'المتحدث' : 'Speaker Name'}</label>
                  <input
                    type="text"
                    value={eventForm.speaker_name}
                    onChange={(e) => setEventForm({ ...eventForm, speaker_name: e.target.value })}
                    placeholder="Dr. Salim Al-Maskari"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700">{isAr ? 'تاريخ ووقت الفعالية' : 'Event Date & Time'}</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.event_date}
                    onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-700">{isAr ? 'الحد الأقصى للحضور' : 'Max Attendees'}</label>
                  <input
                    type="number"
                    value={eventForm.max_attendees}
                    onChange={(e) => setEventForm({ ...eventForm, max_attendees: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">{isAr ? 'رابط الاجتماع (Zoom / Teams)' : 'Meeting URL'}</label>
                <input
                  type="url"
                  value={eventForm.meeting_url}
                  onChange={(e) => setEventForm({ ...eventForm, meeting_url: e.target.value })}
                  placeholder="https://zoom.us/j/..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">{isAr ? 'الوصف' : 'Description'}</label>
                <textarea
                  rows={2}
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Topics covered, deliverables..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-medium"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-gray-900 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {isSaving ? <RotateCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isAr ? 'حفظ الفعالية' : 'Save Event'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: MEMBER TIER & LOYALTY ADJUSTMENT ================= */}
      {selectedMemberForAdjust && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-base text-gray-900">{isAr ? 'تعديل بيانات العضوية' : 'Manage Member Loyalty'}</h3>
                <p className="text-xs font-mono text-gray-500">{selectedMemberForAdjust.membership_number}</p>
              </div>
              <button
                onClick={() => setSelectedMemberForAdjust(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-gray-50 p-3 rounded-2xl space-y-1">
                <p className="font-extrabold text-gray-900">{selectedMemberForAdjust.full_name}</p>
                <p className="text-gray-500">{selectedMemberForAdjust.company_name || selectedMemberForAdjust.email}</p>
                <p className="text-amber-700 font-bold">
                  {isAr ? 'الرصيد الحالي:' : 'Current Points:'} {selectedMemberForAdjust.loyalty_points} PTS
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">{isAr ? 'ترقية / تعديل فئة العضوية' : 'Membership Tier'}</label>
                <select
                  value={adjustTier}
                  onChange={(e) => setAdjustTier(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-bold"
                >
                  <option value="community">Community (Free Lead)</option>
                  <option value="silver">Silver VIP</option>
                  <option value="gold">Gold Executive</option>
                  <option value="platinum">Platinum Prestige</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">{isAr ? 'إضافة / خصم نقاط ولاء' : 'Add / Deduct Points'}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={adjustPointsDelta}
                    onChange={(e) => setAdjustPointsDelta(Number(e.target.value))}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-mono font-bold"
                  />
                  <span className="text-gray-400 font-bold">PTS</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">{isAr ? 'حالة العضوية' : 'Account Status'}</label>
                <select
                  value={adjustStatus}
                  onChange={(e) => setAdjustStatus(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-bold"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={handleSaveMemberAdjustment}
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-brand-dark hover:bg-red-800 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {isSaving ? <RotateCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isAr ? 'حفظ التعديلات' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EVENT ATTENDEES LIST ================= */}
      {selectedEventForRsvps && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-base text-gray-900">{isAr ? 'قائمة الحضور المسجلين' : 'Event RSVPs'}</h3>
                <p className="text-xs text-gray-500 font-medium truncate max-w-[240px]">{selectedEventForRsvps.title}</p>
              </div>
              <button
                onClick={() => setSelectedEventForRsvps(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {registrations.filter(r => r.event_id === selectedEventForRsvps.id).length === 0 ? (
                <div className="py-8 text-center text-gray-400 font-bold text-xs">
                  {isAr ? 'لا يوجد أعضاء مسجلين في هذه الفعالية حتى الآن' : 'No RSVPs registered for this event yet'}
                </div>
              ) : (
                registrations
                  .filter(r => r.event_id === selectedEventForRsvps.id)
                  .map((reg) => (
                    <div key={reg.id} className="bg-gray-50 p-3 rounded-2xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-extrabold text-gray-900">{reg.business_club_members?.full_name || 'Member'}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{reg.business_club_members?.membership_number || reg.business_club_members?.email}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                        {reg.status}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: MEMBER RSVPS HISTORY ================= */}
      {selectedMemberRsvps && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-black text-base text-gray-900">{isAr ? 'سجل حضور العضو للفعاليات' : 'Member Event RSVPs'}</h3>
              <button
                onClick={() => setSelectedMemberRsvps(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {selectedMemberRsvps.length === 0 ? (
                <p className="py-8 text-center text-gray-400 font-bold text-xs">
                  {isAr ? 'لم يقم هذا العضو بالتسجيل في أي فعاليات حتى الآن' : 'No RSVPs found for this member'}
                </p>
              ) : (
                selectedMemberRsvps.map((r, idx) => (
                  <div key={idx} className="bg-gray-50 p-3 rounded-2xl space-y-1 text-xs">
                    <p className="font-extrabold text-gray-900">{r.event?.title || 'Club Event'}</p>
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>{r.event?.event_date ? new Date(r.event.event_date).toLocaleDateString() : 'N/A'}</span>
                      <span className="font-bold text-emerald-700">{r.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessClubAdmin;

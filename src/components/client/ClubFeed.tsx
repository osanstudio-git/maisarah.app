import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Share2, 
  Bookmark, 
  Sparkles, 
  FileText, 
  ShieldAlert, 
  ArrowUpRight,
  TrendingUp,
  MessageCircle,
  Filter
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';

interface ClubAnnouncement {
  id: string;
  title: string;
  title_ar?: string;
  content: string;
  content_ar?: string;
  category: string;
  priority: string;
  attachment_url?: string;
  target_tier: string;
  published_at: string;
}

interface ClubEvent {
  id: string;
  title: string;
  title_ar?: string;
  description?: string;
  description_ar?: string;
  event_type: string;
  speaker_name?: string;
  event_date: string;
  location?: string;
  meeting_url?: string;
  max_attendees: number;
  is_free: boolean;
  registration_deadline?: string;
  status: string;
}

interface ClubFeedProps {
  memberId?: string;
  userId?: string;
  memberTier?: string;
  onSelectEvent?: (event: ClubEvent) => void;
}

export const ClubFeed: React.FC<ClubFeedProps> = ({
  memberId,
  userId,
  memberTier = 'community',
  onSelectEvent
}) => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [announcements, setAnnouncements] = useState<ClubAnnouncement[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [registeredEventIds, setRegisteredEventIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'tax_vat' | 'compliance' | 'events'>('all');
  const [registeringEventId, setRegisteringEventId] = useState<string | null>(null);

  useEffect(() => {
    fetchFeedData();
  }, [memberId, userId]);

  const fetchFeedData = async () => {
    setLoading(true);
    try {
      // 1. Fetch active announcements
      const { data: annData, error: annError } = await supabase
        .from('club_announcements')
        .select('*')
        .eq('is_active', true)
        .order('published_at', { ascending: false });

      if (annError) {
        console.warn('Announcements fetch warning:', annError.message);
      }

      // 2. Fetch upcoming & ongoing club events
      const { data: evData, error: evError } = await supabase
        .from('club_events')
        .select('*')
        .in('status', ['upcoming', 'ongoing'])
        .order('event_date', { ascending: true });

      if (evError) {
        console.warn('Events fetch warning:', evError.message);
      }

      // 3. Fetch member's registered event IDs
      if (memberId || userId) {
        let query = supabase.from('club_event_registrations').select('event_id');
        if (memberId) {
          query = query.eq('member_id', memberId);
        } else if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data: regData } = await query;
        if (regData) {
          setRegisteredEventIds(new Set(regData.map(r => r.event_id)));
        }
      }

      setAnnouncements(annData || []);
      setEvents(evData || []);
    } catch (err) {
      console.error('Error fetching club feed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterEvent = async (event: ClubEvent) => {
    if (!memberId && !userId) return;
    setRegisteringEventId(event.id);

    try {
      const isAlreadyRegistered = registeredEventIds.has(event.id);

      if (isAlreadyRegistered) {
        // Cancel registration
        let deleteQuery = supabase
          .from('club_event_registrations')
          .delete()
          .eq('event_id', event.id);

        if (memberId) {
          deleteQuery = deleteQuery.eq('member_id', memberId);
        }

        await deleteQuery;
        setRegisteredEventIds(prev => {
          const next = new Set(prev);
          next.delete(event.id);
          return next;
        });
      } else {
        // Register member
        const { error } = await supabase
          .from('club_event_registrations')
          .insert({
            event_id: event.id,
            member_id: memberId || null,
            user_id: userId || null,
            status: 'registered'
          });

        if (error) throw error;

        setRegisteredEventIds(prev => new Set(prev).add(event.id));
      }
    } catch (err: any) {
      console.error('Failed to update event registration:', err.message);
    } finally {
      setRegisteringEventId(null);
    }
  };

  // Helper for category badge
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'vat_announcement':
        return {
          bg: 'bg-red-50 text-brand-dark border-red-200',
          labelEn: 'VAT Bulletin',
          labelAr: 'تحديث ضريبة القيمة المضافة',
          icon: FileText
        };
      case 'compliance_deadline':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          labelEn: 'Compliance Deadline',
          labelAr: 'موعد امتثال قانوني',
          icon: AlertTriangle
        };
      case 'tax_update':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          labelEn: 'Tax Support',
          labelAr: 'الدعم والتحديثات الضريبية',
          icon: ShieldAlert
        };
      case 'financial_tip':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          labelEn: 'Financial Strategy',
          labelAr: 'استراتيجية مالية',
          icon: TrendingUp
        };
      default:
        return {
          bg: 'bg-gray-100 text-gray-800 border-gray-200',
          labelEn: 'Announcement',
          labelAr: 'إعلان عام',
          icon: Bell
        };
    }
  };

  const filteredAnnouncements = announcements.filter(ann => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'tax_vat') return ann.category === 'vat_announcement' || ann.category === 'tax_update';
    if (selectedFilter === 'compliance') return ann.category === 'compliance_deadline';
    return false;
  });

  const showEventsSection = selectedFilter === 'all' || selectedFilter === 'events';
  const showAnnouncementsSection = selectedFilter !== 'events';

  return (
    <div className="space-y-6">
      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedFilter('all')}
          className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
            selectedFilter === 'all'
              ? 'bg-brand-dark text-white shadow-md shadow-brand-dark/20'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          {isAr ? 'الكل' : 'All Updates'}
        </button>

        <button
          onClick={() => setSelectedFilter('tax_vat')}
          className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
            selectedFilter === 'tax_vat'
              ? 'bg-brand-dark text-white shadow-md shadow-brand-dark/20'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          {isAr ? 'الضرائب وضريبة القيمة المضافة' : 'Tax & VAT'}
        </button>

        <button
          onClick={() => setSelectedFilter('compliance')}
          className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
            selectedFilter === 'compliance'
              ? 'bg-brand-dark text-white shadow-md shadow-brand-dark/20'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          {isAr ? 'مواعيد الامتثال والمهل' : 'Compliance Deadlines'}
        </button>

        <button
          onClick={() => setSelectedFilter('events')}
          className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
            selectedFilter === 'events'
              ? 'bg-brand-dark text-white shadow-md shadow-brand-dark/20'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          {isAr ? 'الورش والفعاليات' : 'Events & Workshops'}
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-16 bg-gray-100 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* ================= EVENTS CAROUSEL / FEED ================= */}
          {showEventsSection && events.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand-dark animate-ping" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-gray-900">
                    {isAr ? 'فعاليات وورش عمل النادي' : 'Upcoming Club Masterclasses'}
                  </h3>
                </div>
                <span className="text-xs font-bold text-gray-400">
                  {events.length} {isAr ? 'فعالية' : 'Events'}
                </span>
              </div>

              <div className="space-y-3">
                {events.map((event) => {
                  const isRegistered = registeredEventIds.has(event.id);
                  const isProcessing = registeringEventId === event.id;
                  const eventDate = new Date(event.event_date);

                  return (
                    <div 
                      key={event.id}
                      className="bg-gradient-to-br from-white to-gray-50/80 rounded-3xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition-all space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                              {event.event_type.replace('_', ' ')}
                            </span>
                            {event.is_free && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                                {isAr ? 'مجاني للأعضاء' : 'Free for Members'}
                              </span>
                            )}
                          </div>
                          <h4 className="font-extrabold text-base text-gray-900 leading-tight">
                            {isAr ? (event.title_ar || event.title) : event.title}
                          </h4>
                        </div>

                        {/* Calendar Badge */}
                        <div className="flex-shrink-0 bg-brand-dark text-white rounded-2xl p-2.5 text-center min-w-[55px] shadow-sm">
                          <span className="block text-[9px] uppercase font-bold text-white/80">
                            {eventDate.toLocaleString(isAr ? 'ar' : 'en', { month: 'short' })}
                          </span>
                          <span className="block text-lg font-black leading-none">
                            {eventDate.getDate()}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                        {isAr ? (event.description_ar || event.description) : event.description}
                      </p>

                      {/* Details row */}
                      <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[11px] text-gray-500 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>
                            {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span className="truncate max-w-[140px]">{event.location || 'Online'}</span>
                        </div>

                        {event.speaker_name && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-gray-400" />
                            <span>{event.speaker_name}</span>
                          </div>
                        )}
                      </div>

                      {/* RSVP Action */}
                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => handleRegisterEvent(event)}
                          disabled={isProcessing}
                          className={`w-full py-2.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                            isRegistered
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-brand-dark text-white hover:bg-red-800 shadow-md shadow-brand-dark/20'
                          }`}
                        >
                          {isProcessing ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : isRegistered ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{isAr ? 'أنت مسجل بالفعالية (اضغط للإلغاء)' : 'Registered (Click to Cancel)'}</span>
                            </>
                          ) : (
                            <>
                              <Calendar className="w-4 h-4" />
                              <span>{isAr ? 'تسجيل الحضور مجاناً (RSVP)' : 'Reserve Seat (Free RSVP)'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= ANNOUNCEMENTS / BULLETINS ================= */}
          {showAnnouncementsSection && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-900">
                  {isAr ? 'آخر المستجدات الضريبية والامتثال' : 'Tax Bulletins & Compliance News'}
                </h3>
                <span className="text-xs font-bold text-gray-400">
                  {filteredAnnouncements.length} {isAr ? 'منشور' : 'Posts'}
                </span>
              </div>

              {filteredAnnouncements.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 text-gray-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-xs font-bold">{isAr ? 'لا توجد تحديثات في هذا التصنيف حالياً' : 'No updates found in this category'}</p>
                </div>
              ) : (
                filteredAnnouncements.map((ann) => {
                  const badge = getCategoryBadge(ann.category);
                  const Icon = badge.icon;
                  const isUrgent = ann.priority === 'urgent';
                  const dateStr = new Date(ann.published_at).toLocaleDateString(isAr ? 'ar-OM' : 'en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });

                  return (
                    <article
                      key={ann.id}
                      className={`bg-white rounded-3xl p-5 border transition-all hover:shadow-md space-y-3.5 ${
                        isUrgent ? 'border-red-300 bg-red-50/20' : 'border-gray-200/80 shadow-sm'
                      }`}
                    >
                      {/* Announcement Top Meta */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border ${badge.bg}`}>
                            <Icon className="w-3 h-3" />
                            <span>{isAr ? badge.labelAr : badge.labelEn}</span>
                          </span>

                          {isUrgent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-600 text-white animate-pulse">
                              {isAr ? 'عاجل' : 'URGENT'}
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-gray-400 font-medium">
                          {dateStr}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="font-extrabold text-base text-gray-900 leading-snug">
                        {isAr ? (ann.title_ar || ann.title) : ann.title}
                      </h4>

                      {/* Content Body */}
                      <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                        {isAr ? (ann.content_ar || ann.content) : ann.content}
                      </p>

                      {/* Quick Advisory CTA */}
                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                        <a
                          href="https://wa.me/96890000000"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-dark hover:underline"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{isAr ? 'استشر خبير ميسرة حول هذا التحديث' : 'Ask our tax advisor about this'}</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClubFeed;

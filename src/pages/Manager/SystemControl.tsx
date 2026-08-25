import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { Settings, Megaphone, Send, ShieldCheck, Clock, CheckCircle } from 'lucide-react';
import { logActivity } from '../../lib/activityLogger';
import { useAuth } from '../../hooks/useAuth';

const SystemControl = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isAr = i18n.language === 'ar';
  
  // Announcements State
  const [announcementContent, setAnnouncementContent] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');

  // Approvals State
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [loadingApprovals, setLoadingApprovals] = useState(true);

  // Activity Log State
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  useEffect(() => {
    fetchPendingApprovals();
    fetchActivities();

    // Subscribe to real-time activity updates
    const channel = supabase
      .channel('activity_log_changes')
      .on(
        'postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'activity_log' },
        (payload) => {
          setActivities(prev => [payload.new, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActivities = async () => {
    setLoadingActivities(true);
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setActivities(data || []);
    } catch (err) {
      console.error('Activity Log Error:', err);
      setActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  };

  const fetchPendingApprovals = async () => {
    setLoadingApprovals(true);
    const { data, error } = await supabase
      .from('services')
      .select('*, clients(company_name)')
      .in('status', ['pending', 'under_review'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPendingApprovals(data);
    }
    setLoadingApprovals(false);
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBroadcasting(true);
    setBroadcastMessage('');

    try {
      const { error } = await supabase
        .from('announcements')
        .insert([
          {
            title: announcementTitle,
            content: announcementContent,
            target_role: 'employee',
          }
        ]);

      if (error) throw error;

      await logActivity(
        user?.id || '',
        user?.user_metadata?.full_name || user?.email || 'Manager',
        'broadcast_sent',
        `Sent a new announcement: ${announcementTitle}`,
        `تم إرسال إعلان جديد: ${announcementTitle}`
      );

      setBroadcastMessage(t('manager.broadcastSuccess'));
      setAnnouncementTitle('');
      setAnnouncementContent('');
      
      setTimeout(() => setBroadcastMessage(''), 3000);

    } catch (err: any) {
      setBroadcastMessage(err.message || 'Error broadcasting announcement');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleApprove = async (serviceId: string) => {
    const { error } = await supabase
      .from('services')
      .update({ status: 'ongoing' })
      .eq('id', serviceId);
    
    if (!error) {
      fetchPendingApprovals();
    } else {
      alert("Error approving service");
    }
  };

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2 tracking-tight uppercase">
        <Settings className="text-brand-dark" size={28}/>
        {t('manager.systemControl')}
      </h2>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
        
        {/* Pending Approvals */}
        <div className="lg:col-span-4 h-full">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
            <h3 className="font-bold text-lg text-gray-800 mb-6 flex items-center gap-2">
              <ShieldCheck className="text-brand-dark" size={20}/>
              {t('manager.pendingApprovals')}
            </h3>

            {loadingApprovals ? (
              <div className="flex justify-center p-10 flex-1 items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark"></div></div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] custom-scrollbar pe-1">
                {pendingApprovals.length > 0 ? pendingApprovals.map((item) => (
                  <div key={item.id} className="border border-gray-100 rounded-xl p-4 flex flex-col gap-3 hover:shadow-sm transition bg-gray-50/30">
                    <div className="text-start">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded-full font-black flex items-center gap-1 uppercase">
                          <Clock size={10} />
                          {t(`employee.status${item.status === 'pending' ? 'Ongoing' : 'UnderReview'}`)}
                        </span>
                        <h4 className="font-bold text-xs text-gray-800">{item.title}</h4>
                      </div>
                      <p className="text-[10px] font-bold text-brand-dark opacity-60 uppercase tracking-wider">{item.clients?.company_name}</p>
                    </div>
                    
                    <button 
                      onClick={() => handleApprove(item.id)}
                      className="whitespace-nowrap flex items-center gap-2 bg-brand-dark text-white hover:bg-red-800 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition w-full justify-center shadow-sm"
                    >
                      <CheckCircle size={14} />
                      {t('manager.approveAction')}
                    </button>
                  </div>
                )) : (
                  <div className="text-center p-10 border-2 border-dashed border-gray-100 rounded-xl text-gray-400 text-xs font-medium">
                    {t('manager.noPendingApprovals')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Broadcast Announcements */}
        <div className="lg:col-span-4 h-full">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
            <h3 className="font-bold text-lg text-gray-800 mb-6 flex items-center gap-2">
              <Megaphone className="text-brand-dark" size={20}/>
              {t('manager.broadcastAnnouncement')}
            </h3>

            {broadcastMessage && (
              <div className={`p-3 text-xs font-bold rounded-xl mb-4 ${broadcastMessage.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {broadcastMessage}
              </div>
            )}

            <form onSubmit={handleBroadcast} className="space-y-4 flex-1">
              <div className="text-start">
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1.5">{t('manager.announcementTitle')}</label>
                <input 
                  required 
                  type="text" 
                  value={announcementTitle} 
                  onChange={(e) => setAnnouncementTitle(e.target.value)} 
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-brand-dark transition-all text-sm font-bold" 
                />
              </div>
              
              <div className="text-start">
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1.5">{t('manager.announcementContent')}</label>
                <textarea 
                  required 
                  rows={5}
                  value={announcementContent} 
                  onChange={(e) => setAnnouncementContent(e.target.value)} 
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-brand-dark resize-none transition-all text-sm font-medium" 
                />
              </div>
              
              <button 
                type="submit" 
                disabled={isBroadcasting}
                className="w-full bg-brand-dark hover:bg-red-800 text-white font-black text-xs uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg shadow-brand-dark/20 flex items-center justify-center gap-2 mt-4"
              >
                {isBroadcasting ? (
                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={16} />
                    {t('manager.sendBroadcast')}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Activity Log */}
        <div className="lg:col-span-4 h-full">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
            <h3 className="font-bold text-lg text-gray-800 mb-6 flex items-center gap-2">
              <Clock className="text-brand-dark" size={20}/>
              {isAr ? 'سجل النشاطات الأخير' : 'Recent Activity Log'}
            </h3>

            {loadingActivities ? (
              <div className="flex justify-center p-10 flex-1 items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark"></div></div>
            ) : (
              <div className="space-y-4 flex-1 overflow-y-auto max-h-[500px] custom-scrollbar pe-1">
                {activities.length > 0 ? activities.map((act) => {
                  const d = new Date(act.created_at);
                  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={act.id} className="relative ps-6 pb-2 border-l-2 border-gray-100 last:border-0 last:pb-0">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-brand-dark" />
                      <div className="text-start">
                        <p className="text-xs font-bold text-gray-800">{act.user_name}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{isAr ? act.description_ar : act.description_en}</p>
                        <span className="text-[10px] text-gray-400 font-medium mt-1 inline-block">{time}</span>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center p-10 border-2 border-dashed border-gray-100 rounded-xl text-gray-400 text-xs font-medium">
                    {isAr ? 'لا توجد نشاطات مسجلة' : 'No recorded activity'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SystemControl;

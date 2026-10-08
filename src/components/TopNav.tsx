import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bell, HelpCircle, Settings, Menu, ChevronDown, CheckCircle2,
  AlertTriangle, Clock, Receipt, FileText, Check, X, ShieldCheck, Layers, Sparkles
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import LanguageSwitcher from './LanguageSwitcher';

import { getHierarchyMode, subscribeHierarchyMode, type HierarchyMode } from '../utils/workflowConfig';

export interface AppNotification {
  id: string;
  sender_id?: string | null;
  recipient_id?: string | null;
  recipient_role?: string | null;
  service_id?: string | null;
  invoice_id?: string | null;
  receipt_id?: string | null;
  title: string;
  message: string;
  type: 'due_date_alert' | 'task_started' | 'payment_logged' | 'receipt_verified' | 'invoice_created' | 'general';
  is_read: boolean;
  created_at: string;
}

const TopNav = ({ toggleSidebar }: { toggleSidebar: () => void }) => {
  const { t, i18n } = useTranslation();
  const { signOut, user, role, secondaryRoles, switchPortal } = useAuth();
  const isAr = i18n.language === 'ar';
  const isClient = role === 'client';

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPortalDropdownOpen, setIsPortalDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [hierarchyMode, setHierarchyModeState] = useState<HierarchyMode>(getHierarchyMode());

  useEffect(() => {
    return subscribeHierarchyMode((mode) => setHierarchyModeState(mode));
  }, []);

  const displayName = user?.user_metadata?.full_name || 
                      user?.email?.split('@')[0] || 
                      (isAr ? 'المستخدم' : 'User');

  const portalNames: Record<string, { en: string; ar: string; icon: string }> = {
    accountant: { en: 'Accountant Portal', ar: 'بوابة المحاسب والفواتير', icon: '💼' },
    employee: { en: 'Staff Workspace', ar: 'مساحة عمل الموظف', icon: '👤' },
    department_head: { en: 'HOD Leadership', ar: 'بوابة رئيس القسم (HOD)', icon: '👑' },
    hr: { en: 'HR Control Center', ar: 'إدارة الموارد البشرية', icon: '📋' },
    crm: { en: 'CRM & Client Portal', ar: 'بوابة علاقات العملاء', icon: '🤝' },
    sales: { en: 'Field Sales Portal', ar: 'بوابة المبيعات الميدانية', icon: '🚀' },
    manager: { en: 'Executive Manager Panel', ar: 'لوحة المدير التنفيذي', icon: '⭐' }
  };

  const availablePortals = useMemo(() => {
    // In Manager mode, Manager operates directly from their unified Command Center without needing switching
    if (role === 'manager') {
      return ['manager'];
    }
    const list = new Set<string>();
    if (role) list.add(role);
    (secondaryRoles || []).forEach(r => list.add(r));

    // Filter out HOD portal if in Flat / Direct Employee Mode
    if (hierarchyMode === 'direct_employee') {
      list.delete('department_head');
    }

    return Array.from(list);
  }, [role, secondaryRoles, hierarchyMode]);

  // ── Fetch Notifications ───────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoadingNotifs(true);
      const orCondition = role 
        ? `recipient_id.eq.${user.id},recipient_role.eq.${role}`
        : `recipient_id.eq.${user.id}`;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(orCondition)
        .order('created_at', { ascending: false })
        .limit(25);

      if (!error && data) {
        setNotifications(data as AppNotification[]);
      }
    } catch (err: any) {
      console.warn('Notifications fetch notice:', err.message);
    } finally {
      setLoadingNotifs(false);
    }
  }, [user?.id, role]);

  useEffect(() => {
    fetchNotifications();

    if (!user?.id) return;

    // Supabase Realtime Subscription for Live Alerts
    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotif = payload.new as AppNotification;
            if (newNotif.recipient_id === user.id || newNotif.recipient_role === role) {
              setNotifications(prev => [newNotif, ...prev.filter(n => n.id !== newNotif.id)]);
            }
          } else {
            fetchNotifications();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, user?.id, role]);

  // Mark single notification as read
  const handleMarkAsRead = async (notifId: string) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
    } catch { }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      if (user?.id) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .or(role ? `recipient_id.eq.${user.id},recipient_role.eq.${role}` : `recipient_id.eq.${user.id}`);
      }
    } catch { }
  };

  const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'due_date_alert':
        return <AlertTriangle size={15} className="text-red-500 shrink-0" />;
      case 'receipt_verified':
        return <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />;
      case 'payment_logged':
        return <Receipt size={15} className="text-blue-500 shrink-0" />;
      case 'task_started':
        return <FileText size={15} className="text-amber-500 shrink-0" />;
      default:
        return <Bell size={15} className="text-gray-500 shrink-0" />;
    }
  };

  return (
    <header 
      dir={isAr ? 'rtl' : 'ltr'}
      className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-xs"
    >
      <div className="flex items-center gap-4">
        {!isClient && (
          <button 
            onClick={toggleSidebar}
            className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg cursor-pointer"
          >
            <Menu size={24} />
          </button>
        )}
        <div className={isAr ? 'text-right' : 'text-left'}>
          <h2 className="text-2xl font-bold text-gray-800">
            {isAr ? `مرحباً، ${displayName}` : `Welcome, ${displayName}`}
          </h2>
          <p className="text-sm text-gray-500 hidden sm:block">{t('topNav.subtitle')}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Switch Workspace Dropdown */}
        {!isClient && availablePortals.length > 1 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsPortalDropdownOpen(!isPortalDropdownOpen);
                setIsProfileOpen(false);
                setIsNotificationsOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-50 to-amber-50 hover:from-red-100 hover:to-amber-100 border border-red-200/80 rounded-2xl text-xs font-black text-brand-dark transition-all shadow-xs cursor-pointer active:scale-95"
              title={isAr ? 'تبديل مساحة العمل' : 'Switch Workspace'}
            >
              <Layers size={15} className="text-brand-dark animate-pulse" />
              <span className="hidden md:inline font-black">{isAr ? 'تبديل مساحة العمل' : 'Switch Workspace'}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-brand-dark text-white font-bold">{availablePortals.length}</span>
              <ChevronDown size={14} className="text-brand-dark" />
            </button>

            {isPortalDropdownOpen && (
              <div className={`absolute mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 py-3 z-50 animate-scale-up ${isAr ? 'left-0' : 'right-0'}`}>
                <div className="px-4 pb-2 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Layers size={14} className="text-brand-dark" />
                    <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                      {isAr ? 'مساحات العمل المعتمدة' : 'Authorized Workspaces'}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-gray-400">
                    {availablePortals.length} {isAr ? 'أدوار' : 'Roles'}
                  </span>
                </div>
                <div className="py-1 px-1">
                  {availablePortals.map(pKey => {
                    const info = portalNames[pKey] || { en: pKey, ar: pKey, icon: '🌐' };
                    const isActive = role === pKey;
                    return (
                      <button
                        key={pKey}
                        onClick={() => {
                          setIsPortalDropdownOpen(false);
                          switchPortal(pKey);
                        }}
                        className={`w-full px-3.5 py-2.5 my-0.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                          isActive 
                            ? 'bg-brand-dark text-white shadow-md shadow-brand-dark/20 font-black' 
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="text-base">{info.icon}</span>
                          <span className="text-start">{isAr ? info.ar : info.en}</span>
                        </span>
                        {isActive ? (
                          <span className="text-[9px] font-black bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/30">
                            {isAr ? 'الحالي' : 'Active'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-normal">→</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <LanguageSwitcher />

        {/* Realtime Notification Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsProfileOpen(false);
              setIsPortalDropdownOpen(false);
            }}
            className="relative p-2 hover:bg-red-50 rounded-full transition-colors cursor-pointer text-brand-dark"
            title={isAr ? 'الإشعارات المباشرة' : 'Live Notifications'}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className={`absolute top-1 w-4 h-4 bg-red-600 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white ${isAr ? 'left-2' : 'right-2'} animate-bounce`}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Realtime Notifications Dropdown Drawer */}
          {isNotificationsOpen && (
            <div className={`absolute mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 py-3 z-50 animate-scale-up ${isAr ? 'left-0' : 'right-0'}`}>
              <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-xs text-gray-900 uppercase tracking-wider">
                    {isAr ? 'مركز الإشعارات والتنبيهات' : 'Notifications Hub'}
                  </h4>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700">
                      {unreadCount} {isAr ? 'جديد' : 'new'}
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-[11px] font-bold text-[#A11212] hover:underline"
                  >
                    {isAr ? 'تحديد الكل كمقروء' : 'Mark all read'}
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <Bell size={24} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-bold">{isAr ? 'لا توجد إشعارات حالياً' : 'No notifications yet'}</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkAsRead(n.id)}
                      className={`p-3.5 hover:bg-gray-50 transition-colors cursor-pointer flex items-start gap-3 ${
                        !n.is_read ? 'bg-red-50/30' : ''
                      }`}
                    >
                      <div className="mt-0.5 p-1.5 rounded-xl bg-gray-100">
                        {getNotificationIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h5 className={`text-xs truncate ${!n.is_read ? 'font-black text-gray-900' : 'font-bold text-gray-700'}`}>
                            {n.title}
                          </h5>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-[#A11212] shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        <span className="text-[9px] text-gray-400 font-semibold mt-1 block">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-gray-200 hidden md:block"></div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <div 
            className="hidden md:flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg"
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              setIsPortalDropdownOpen(false);
              setIsNotificationsOpen(false);
            }}
          >
            <div className="w-9 h-9 rounded-full bg-brand-dark flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className={isAr ? 'text-right' : 'text-left'}>
              <p className="font-semibold text-xs text-gray-800 flex items-center gap-1">
                {user?.email?.split('@')[0] || 'User'} <ChevronDown size={14} className="text-gray-500" />
              </p>
              <p className="text-[11px] text-gray-500 capitalize">{role ? (portalNames[role]?.[isAr ? 'ar' : 'en'] || role) : t('topNav.role')}</p>
            </div>
          </div>

          {isProfileOpen && (
            <div className={`absolute mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-scale-up ${isAr ? 'left-0' : 'right-0'}`}>
              <div className="px-4 py-2 border-b border-gray-100 md:hidden">
                <p className="font-bold text-sm text-gray-800 truncate">{user?.email}</p>
                <p className="text-xs text-gray-500 capitalize">{role}</p>
              </div>
              <button 
                onClick={signOut}
                className={`w-full px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 font-bold transition flex items-center gap-2 cursor-pointer ${isAr ? 'text-right' : 'text-left'}`}
              >
                {t('sidebar.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNav;

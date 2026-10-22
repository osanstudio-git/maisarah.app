import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bell, HelpCircle, Settings, Menu, ChevronDown, CheckCircle2,
  AlertTriangle, Clock, Receipt, FileText, Check, X, ShieldCheck, Layers, Sparkles,
  KeyRound, Lock, Eye, EyeOff
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

  // Change Password State
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (passwordForm.password.length < 6) {
      setPasswordError(isAr ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }

    if (passwordForm.password !== passwordForm.confirm) {
      setPasswordError(isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        password: passwordForm.password
      });

      if (updateErr) throw updateErr;

      setPasswordSuccess(true);
      setTimeout(() => {
        setIsChangePasswordOpen(false);
        setPasswordSuccess(false);
        setPasswordForm({ password: '', confirm: '' });
      }, 2000);
    } catch (err: any) {
      console.error('Password update notice:', err);
      setPasswordError(err?.message || (isAr ? 'تعذر تحديث كلمة المرور' : 'Failed to update password'));
    } finally {
      setPasswordLoading(false);
    }
  };

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
      className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-xs"
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
              <div className={`absolute mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 py-3 z-[100] animate-scale-up ${isAr ? 'left-0' : 'right-0'}`}>
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
                onClick={() => {
                  setIsProfileOpen(false);
                  setIsChangePasswordOpen(true);
                  setPasswordForm({ password: '', confirm: '' });
                  setPasswordError(null);
                  setPasswordSuccess(false);
                }}
                className={`w-full px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 font-bold transition flex items-center gap-2 cursor-pointer border-b border-gray-100 ${isAr ? 'text-right' : 'text-left'}`}
              >
                <KeyRound size={14} className="text-[#A11212]" />
                <span>{isAr ? 'تغيير كلمة المرور' : 'Change Password'}</span>
              </button>
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

      {/* Change Password Modal */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative animate-scale-up" dir={isAr ? 'rtl' : 'ltr'}>
            <button
              type="button"
              onClick={() => setIsChangePasswordOpen(false)}
              className={`absolute top-5 ${isAr ? 'left-5' : 'right-5'} p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors`}
            >
              <X size={18} />
            </button>

            <div className="text-center mb-6">
              <div className="inline-flex p-3 bg-red-50 text-[#A11212] rounded-2xl mb-3">
                <KeyRound size={26} />
              </div>
              <h3 className="text-xl font-black text-gray-900">
                {isAr ? 'تغيير كلمة المرور' : 'Change Password'}
              </h3>
              <p className="text-xs text-gray-500 font-medium mt-1">
                {isAr 
                  ? 'أدخل كلمة المرور الجديدة لحسابك المؤسسي' 
                  : 'Enter your new password to secure your account'}
              </p>
            </div>

            {passwordSuccess ? (
              <div className="space-y-3 py-4 text-center">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 size={32} />
                </div>
                <p className="text-sm font-black text-gray-900">
                  {isAr ? 'تم تحديث كلمة المرور بنجاح!' : 'Password Updated Successfully!'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-widest px-1">
                    {isAr ? 'كلمة المرور الجديدة' : 'New Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={passwordForm.password}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="••••••••"
                      className={`w-full ${isAr ? 'pr-11 pl-11' : 'pl-11 pr-11'} py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#A11212] focus:bg-white text-sm font-medium`}
                    />
                    <Lock className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-3.5' : 'left-3.5'} text-gray-400`} size={18} />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'left-3' : 'right-3'} text-gray-400 hover:text-gray-700 p-1 rounded-lg`}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-widest px-1">
                    {isAr ? 'تأكيد كلمة المرور' : 'Confirm New Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                      placeholder="••••••••"
                      className={`w-full ${isAr ? 'pr-11 pl-11' : 'pl-11 pr-11'} py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#A11212] focus:bg-white text-sm font-medium`}
                    />
                    <Lock className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-3.5' : 'left-3.5'} text-gray-400`} size={18} />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'left-3' : 'right-3'} text-gray-400 hover:text-gray-700 p-1 rounded-lg`}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-gray-400 px-1">
                  {isAr ? '• يجب ألا تقل عن 6 خانات' : '• Must be at least 6 characters'}
                </p>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsChangePasswordOpen(false)}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="flex-1 bg-[#A11212] hover:bg-red-800 text-white font-bold text-xs py-3 rounded-xl transition shadow-md shadow-red-900/10 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {passwordLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>{isAr ? 'تحديث كلمة المرور' : 'Update Password'}</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default TopNav;

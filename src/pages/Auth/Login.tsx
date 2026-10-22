import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { Lock, Mail, AlertTriangle, Eye, EyeOff, KeyRound, CheckCircle2, X } from 'lucide-react';

const Login = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { session, role, loading, sessionReady } = useAuth();
  const isAr = i18n.language === 'ar';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = forgotEmail.trim().toLowerCase();
    if (!clean) return;

    setForgotLoading(true);
    setForgotError(null);
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(clean, {
        redirectTo: redirectUrl
      });
      if (resetErr) {
        throw resetErr;
      }
      setForgotSuccess(true);
    } catch (err: any) {
      console.error('Password reset request error:', err);
      setForgotError(err?.message || (isAr ? 'تعذر إرسال رابط الاستعادة. يرجى التحقق من صحة البريد.' : 'Failed to send recovery link. Please verify your email.'));
    } finally {
      setForgotLoading(false);
    }
  };

  // Redirect if already logged in
  useEffect(() => {
    if (session && role) {
      if (role === 'manager') navigate('/manager');
      else if (role === 'hr') navigate('/hr/dashboard');
      else if (role === 'crm') navigate('/crm/dashboard');
      else if (role === 'accountant') navigate('/accountant');
      else if (role === 'employee') navigate('/employee');
      else if (role === 'client') navigate('/client');
      else if (role === 'department_head') navigate('/hod/dashboard');
      else if (role === 'sales') navigate('/sales');
      else navigate('/dashboard');
    } else if (!loading && sessionReady && session && !role) {
      setError('No role assigned to this account. Please contact admin.');
    }
  }, [session, role, loading, sessionReady, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(t('auth.invalidCredentials'));
      setIsSubmitting(false);
    }
    // If successful, onAuthStateChange will fetch the role and redirect
  };

  // Wait for session to be fully resolved before showing login form
  // This prevents the login page from flashing during refresh
  if (!sessionReady || loading || (session && !role && !error)) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-dark"></div>
        <p className="text-gray-500 text-sm font-medium animate-pulse">Authenticating...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 relative overflow-hidden" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Background Decor */}
      <div className="absolute -top-24 -start-24 w-64 h-64 bg-red-900/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -end-24 w-96 h-96 bg-red-900/10 rounded-full blur-3xl" />

      <div className={`absolute top-6 ${isAr ? 'left-6' : 'right-6'} bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 z-50`}>
        <LanguageSwitcher />
      </div>

      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden relative z-10">
        
        {/* Header */}
        <div className="bg-brand-dark px-10 py-10 text-center relative overflow-hidden flex flex-col items-center gap-3">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
          <div className="bg-white p-3.5 rounded-2xl shadow-md max-w-[240px] flex items-center justify-center relative z-10 border border-white/10">
            <img src="/logo.png" alt="Maisarah Logo" className="h-10 object-contain" />
          </div>
          <p className="text-red-100/70 text-xs font-semibold tracking-wider relative z-10 uppercase">{t('auth.loginSubtitle')}</p>
        </div>

        <div className="p-10">
          <h2 className={`text-3xl font-black text-gray-900 mb-8 ${isAr ? 'text-right' : 'text-left'} tracking-tight uppercase`}>
            {t('auth.signIn')}
          </h2>

          {error && (
            <div className={`bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl mb-8 flex items-center gap-3 text-sm font-bold shadow-sm ${isAr ? 'text-right' : 'text-left'}`}>
              <AlertTriangle size={20} /> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className={isAr ? 'text-right' : 'text-left'}>
              <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest px-1">{t('auth.email')}</label>
              <div className="relative group">
                <input 
                  type="email" 
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full ${isAr ? 'pr-12 pl-5' : 'pl-12 pr-5'} py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-brand-dark focus:bg-white focus:ring-4 focus:ring-red-900/5 transition-all shadow-inner font-medium`}
                  placeholder="ali@maisarah.com"
                />
                <Mail className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-4' : 'left-4'} text-gray-300 group-focus-within:text-brand-dark transition-colors`} size={20} />
              </div>
            </div>

            <div className={isAr ? 'text-right' : 'text-left'}>
              <div className="flex items-center justify-between mb-2 px-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('auth.password')}</label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email || '');
                    setForgotSuccess(false);
                    setForgotError(null);
                    setShowForgotModal(true);
                  }}
                  className="text-[11px] font-bold text-[#A11212] hover:text-red-900 transition-colors cursor-pointer hover:underline"
                >
                  {isAr ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                </button>
              </div>
              <div className="relative group">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full ${isAr ? 'pr-12 pl-12' : 'pl-12 pr-12'} py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-brand-dark focus:bg-white focus:ring-4 focus:ring-red-900/5 transition-all shadow-inner font-medium`}
                  placeholder="••••••••"
                />
                <Lock className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-4' : 'left-4'} text-gray-300 group-focus-within:text-brand-dark transition-colors`} size={20} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'left-4' : 'right-4'} text-gray-400 hover:text-brand-dark transition-colors p-1 rounded-lg hover:bg-white`}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-brand-dark hover:bg-red-800 text-white font-black uppercase tracking-[0.1em] py-5 rounded-2xl transition-all shadow-xl shadow-red-900/20 flex justify-center items-center mt-8 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <span className="flex items-center gap-2">
                  {t('auth.signInButton')}
                </span>
              )}
            </button>
          </form>

          {/* Forgot Password Modal */}
          {showForgotModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative animate-scale-up" dir={isAr ? 'rtl' : 'ltr'}>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className={`absolute top-5 ${isAr ? 'left-5' : 'right-5'} p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors`}
                >
                  <X size={18} />
                </button>

                <div className="text-center mb-6">
                  <div className="inline-flex p-3 bg-red-50 text-[#A11212] rounded-2xl mb-3">
                    <KeyRound size={26} />
                  </div>
                  <h3 className="text-xl font-black text-gray-900">
                    {isAr ? 'استعادة كلمة المرور' : 'Reset Your Password'}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium mt-1">
                    {isAr 
                      ? 'أدخل بريدك الإلكتروني المؤسسي وسنرسل لك رابط استعادة آمن فوراً' 
                      : 'Enter your corporate email and we will send you an instant recovery link'}
                  </p>
                </div>

                {forgotSuccess ? (
                  <div className="space-y-4 py-2 text-center">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 size={32} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-black text-gray-900">
                        {isAr ? 'تم إرسال رابط الاستعادة!' : 'Recovery Link Sent!'}
                      </p>
                      <p className="text-xs text-gray-500 font-medium">
                        {isAr
                          ? `يرجى مراجعة بريدك الإلكتروني (${forgotEmail}) والنقر على الرابط لاختيار كلمة مرور جديدة.`
                          : `Please check your inbox at (${forgotEmail}) and click the link to choose a new password.`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="w-full bg-brand-dark text-white font-bold text-xs py-3.5 rounded-xl uppercase tracking-wider hover:bg-red-800 transition shadow-sm mt-3"
                    >
                      {isAr ? 'حسناً، فهمت' : 'Got It'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    {forgotError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                        <AlertTriangle size={16} className="shrink-0" />
                        <span>{forgotError}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-widest px-1">
                        {isAr ? 'البريد الإلكتروني' : 'Corporate Email'}
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="employee@maisarah.om"
                          className={`w-full ${isAr ? 'pr-11 pl-4' : 'pl-11 pr-4'} py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-brand-dark focus:bg-white text-sm font-medium`}
                        />
                        <Mail className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-3.5' : 'left-3.5'} text-gray-400`} size={18} />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full bg-brand-dark hover:bg-red-800 text-white font-black uppercase tracking-wider py-4 rounded-2xl transition shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 text-xs active:scale-95 disabled:opacity-50 cursor-pointer mt-2"
                    >
                      {forgotLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <span>{isAr ? 'إرسال رابط الاستعادة' : 'Send Recovery Link'}</span>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Footer Decoration */}
          <div className="mt-10 flex items-center justify-center gap-2">
            <div className="h-px w-8 bg-gray-100" />
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Premium Accounting Suite</span>
            <div className="h-px w-8 bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

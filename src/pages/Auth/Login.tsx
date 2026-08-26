import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { Lock, Mail, AlertTriangle, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { session, role, loading } = useAuth();
  const isAr = i18n.language === 'ar';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && session) {
      if (role === 'manager') navigate('/manager');
      else if (role === 'hr') navigate('/hr/dashboard');
      else if (role === 'crm') navigate('/crm/dashboard');
      else if (role === 'accountant') navigate('/accountant');
      else if (role === 'employee') navigate('/employee');
      else if (role === 'client') navigate('/client');
      else if (role === 'department_head') navigate('/hod/dashboard');
      else if (role) navigate('/dashboard');
      else setError('No role assigned to this account. Please contact admin.');
    }
  }, [session, role, loading, navigate]);

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
    // If successful, the onAuthStateChange in AuthProvider will catch it and update the session, triggering the useEffect to redirect
  };

  if (loading) {
    return <div className="min-h-screen flex justify-center items-center bg-gray-50"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-dark"></div></div>;
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full ${isAr ? 'pr-12 pl-5' : 'pl-12 pr-5'} py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-brand-dark focus:bg-white focus:ring-4 focus:ring-red-900/5 transition-all shadow-inner font-medium`}
                  placeholder="ali@maisarah.com"
                />
                <Mail className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-4' : 'left-4'} text-gray-300 group-focus-within:text-brand-dark transition-colors`} size={20} />
              </div>
            </div>

            <div className={isAr ? 'text-right' : 'text-left'}>
              <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest px-1">{t('auth.password')}</label>
              <div className="relative group">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required
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

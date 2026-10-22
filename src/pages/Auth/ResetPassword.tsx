import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Lock, Eye, EyeOff, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';

const ResetPassword = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const navigate = useNavigate();
  const location = useLocation();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);

  useEffect(() => {
    // 1. Listen for Supabase recovery auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasRecoverySession(true);
      }
    });

    // 2. Also check if active session or recovery hash exists
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasRecoverySession(true);
      } else if (location.hash && location.hash.includes('access_token')) {
        setHasRecoverySession(true);
      } else {
        // Allow a small grace period for Supabase client to parse the URL hash
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: laterSession } }) => {
            setHasRecoverySession(!!laterSession);
          });
        }, 1200);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [location.hash]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(isAr ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError(isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error: updateErr } = await supabase.auth.updateUser({
        password: password
      });

      if (updateErr) {
        throw updateErr;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2500);
    } catch (err: any) {
      console.error('Password update error:', err);
      setError(err?.message || (isAr ? 'فشل تحديث كلمة المرور. يرجى طلب رابط جديد.' : 'Failed to update password. Please request a new link.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Background Glows */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-[#A11212]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-red-950/30 rounded-full blur-3xl pointer-events-none" />

      {/* Top Controls */}
      <div className="absolute top-6 right-6 z-20">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-gray-100">
          
          {/* Brand Header */}
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-red-50 rounded-2xl mb-4 text-[#A11212]">
              <KeyRound size={28} />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              {isAr ? 'تعيين كلمة مرور جديدة' : 'Set New Password'}
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-1">
              {isAr 
                ? 'يرجى إدخال كلمة مرور جديدة وقوية لحسابك في منصة ميسرة' 
                : 'Enter a strong, secure password for your Maisarah account'}
            </p>
          </div>

          {/* Success State */}
          {success ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-lg font-black text-gray-900">
                {isAr ? 'تم تحديث كلمة المرور بنجاح!' : 'Password Updated Successfully!'}
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                {isAr 
                  ? 'تم حفظ كلمة المرور الجديدة. جارٍ نقلك إلى لوحة التحكم الخاصة بك...' 
                  : 'Your new password is saved. Redirecting to your portal...'}
              </p>
              <div className="pt-2">
                <div className="w-6 h-6 border-2 border-[#A11212]/30 border-t-[#A11212] rounded-full animate-spin mx-auto" />
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className={`bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6 flex items-center gap-2.5 text-xs font-bold ${isAr ? 'text-right' : 'text-left'}`}>
                  <AlertTriangle size={18} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {hasRecoverySession === false && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl mb-6 text-xs font-medium space-y-2">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle size={16} />
                    {isAr ? 'رابط الاستعادة منتهي أو غير صالح' : 'Recovery link expired or invalid'}
                  </p>
                  <p>
                    {isAr 
                      ? 'يبدو أن هذا الرابط قد انتهت صلاحيته. يرجى طلب رابط جديد من صفحة تسجيل الدخول.' 
                      : 'This password reset link may have expired. Please request a fresh reset link from the login page.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="text-xs font-black text-[#A11212] hover:underline block pt-1 cursor-pointer"
                  >
                    {isAr ? 'العودة لصفحة الدخول ←' : '← Return to Sign In'}
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New Password */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-widest px-1">
                    {isAr ? 'كلمة المرور الجديدة' : 'New Password'}
                  </label>
                  <div className="relative group">
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full ${isAr ? 'pr-11 pl-11' : 'pl-11 pr-11'} py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#A11212] focus:bg-white focus:ring-4 focus:ring-red-900/5 transition-all text-sm font-medium`}
                      placeholder="••••••••"
                    />
                    <Lock className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-3.5' : 'left-3.5'} text-gray-400`} size={18} />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'left-3' : 'right-3'} text-gray-400 hover:text-gray-700 p-1 rounded-lg`}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-1.5 uppercase tracking-widest px-1">
                    {isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                  </label>
                  <div className="relative group">
                    <input 
                      type={showConfirm ? 'text' : 'password'} 
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full ${isAr ? 'pr-11 pl-11' : 'pl-11 pr-11'} py-3.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#A11212] focus:bg-white focus:ring-4 focus:ring-red-900/5 transition-all text-sm font-medium`}
                      placeholder="••••••••"
                    />
                    <Lock className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'right-3.5' : 'left-3.5'} text-gray-400`} size={18} />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className={`absolute top-1/2 -translate-y-1/2 ${isAr ? 'left-3' : 'right-3'} text-gray-400 hover:text-gray-700 p-1 rounded-lg`}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Password hint */}
                <p className="text-[11px] text-gray-400 px-1">
                  {isAr ? '• يجب ألا تقل عن 6 خانات' : '• Must be at least 6 characters long'}
                </p>

                {/* Submit Button */}
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-[#A11212] hover:bg-red-800 text-white font-black uppercase tracking-wider py-4 rounded-2xl transition-all shadow-lg shadow-red-900/20 flex justify-center items-center mt-6 active:scale-95 disabled:opacity-50 cursor-pointer text-xs"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="flex items-center gap-2">
                      {isAr ? 'حفظ كلمة المرور والمتابعة' : 'Save Password & Continue'}
                      {isAr ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                    </span>
                  )}
                </button>
              </form>

              {/* Back to Login */}
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  {isAr ? '← العودة لتسجيل الدخول' : '← Back to Sign In'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

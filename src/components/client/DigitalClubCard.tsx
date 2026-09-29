import React, { useState } from 'react';
import { 
  Sparkles, 
  QrCode, 
  Award, 
  Share2, 
  RotateCw, 
  ShieldCheck, 
  Check, 
  Copy, 
  Phone, 
  Gift, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface ClubMemberData {
  id?: string;
  full_name: string;
  membership_number: string;
  member_tier: 'community' | 'silver' | 'gold' | 'platinum' | string;
  loyalty_points: number;
  qr_code_token?: string;
  referral_code?: string;
  company_name?: string;
  joined_date?: string;
  compliance_health_score?: number;
}

interface DigitalClubCardProps {
  member: ClubMemberData;
  onUpgradeRequest?: () => void;
}

export const DigitalClubCard: React.FC<DigitalClubCardProps> = ({ 
  member,
  onUpgradeRequest 
}) => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [isFlipped, setIsFlipped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const tier = (member.member_tier || 'community').toLowerCase();

  // Tier Theme Config
  const tierConfig: Record<string, {
    bgGradient: string;
    badgeBg: string;
    badgeText: string;
    glowColor: string;
    border: string;
    accentText: string;
    nameEn: string;
    nameAr: string;
  }> = {
    community: {
      bgGradient: 'from-slate-900 via-indigo-950 to-slate-900',
      badgeBg: 'bg-indigo-500/20 border-indigo-400/30 text-indigo-200',
      badgeText: 'Community Member',
      glowColor: 'shadow-indigo-900/30',
      border: 'border-indigo-500/30',
      accentText: 'text-indigo-400',
      nameEn: 'Community Tier',
      nameAr: 'العضوية المجتمعية',
    },
    silver: {
      bgGradient: 'from-slate-800 via-slate-700 to-zinc-900',
      badgeBg: 'bg-slate-300/20 border-slate-200/40 text-slate-100',
      badgeText: 'Silver VIP',
      glowColor: 'shadow-slate-700/30',
      border: 'border-slate-400/40',
      accentText: 'text-slate-300',
      nameEn: 'Silver VIP',
      nameAr: 'الفئة الفضية',
    },
    gold: {
      bgGradient: 'from-amber-950 via-yellow-900 to-stone-900',
      badgeBg: 'bg-amber-400/20 border-amber-300/40 text-amber-200',
      badgeText: 'Gold Executive',
      glowColor: 'shadow-amber-900/40',
      border: 'border-amber-400/40',
      accentText: 'text-amber-400',
      nameEn: 'Gold Executive',
      nameAr: 'الفئة الذهبية التنفيذية',
    },
    platinum: {
      bgGradient: 'from-neutral-950 via-red-950 to-neutral-900',
      badgeBg: 'bg-red-500/20 border-red-400/40 text-red-200',
      badgeText: 'Platinum Prestige',
      glowColor: 'shadow-red-900/40',
      border: 'border-red-500/40',
      accentText: 'text-red-400',
      nameEn: 'Platinum Prestige',
      nameAr: 'الفئة البلاتينية النخبوية',
    }
  };

  const currentTheme = tierConfig[tier] || tierConfig.community;
  const qrCodeToken = member.qr_code_token || member.membership_number || 'MBC-2026-TOKEN';

  const copyMembershipNumber = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(member.membership_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // SVG QR matrix pattern based on token hash
  const generateQrMatrix = (seed: string) => {
    const size = 17;
    const matrix: boolean[][] = [];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }

    for (let r = 0; r < size; r++) {
      matrix[r] = [];
      for (let c = 0; c < size; c++) {
        // Corner positional markers
        const isTopLeft = (r < 5 && c < 5);
        const isTopRight = (r < 5 && c >= size - 5);
        const isBottomLeft = (r >= size - 5 && c < 5);

        if (isTopLeft || isTopRight || isBottomLeft) {
          const cornerR = isBottomLeft ? r - (size - 5) : r;
          const cornerC = isTopRight ? c - (size - 5) : c;
          if (cornerR === 0 || cornerR === 4 || cornerC === 0 || cornerC === 4 || (cornerR >= 1 && cornerR <= 3 && cornerC >= 1 && cornerC <= 3 && (cornerR === 2 && cornerC === 2))) {
            matrix[r][c] = true;
          } else if (cornerR >= 1 && cornerR <= 3 && cornerC >= 1 && cornerC <= 3) {
            matrix[r][c] = true;
          } else {
            matrix[r][c] = false;
          }
        } else {
          const bit = Math.abs(Math.sin((r * size + c) * 31 + hash) * 10000) % 1 > 0.45;
          matrix[r][c] = bit;
        }
      }
    }
    return matrix;
  };

  const qrMatrix = generateQrMatrix(qrCodeToken);

  return (
    <div className="w-full max-w-md mx-auto select-none">
      {/* 3D Card Container */}
      <div 
        onClick={() => setIsFlipped(!isFlipped)}
        className="relative cursor-pointer transition-all duration-500 hover:scale-[1.01] active:scale-[0.99]"
        style={{ perspective: '1000px' }}
      >
        <div 
          className={`relative w-full aspect-[1.586/1] rounded-3xl p-6 sm:p-7 shadow-2xl transition-all duration-700 [transform-style:preserve-3d] ${
            isFlipped ? '[transform:rotateY(180deg)]' : ''
          } bg-gradient-to-br ${currentTheme.bgGradient} border ${currentTheme.border} ${currentTheme.glowColor}`}
        >
          {/* Holographic Sheen Overlay */}
          <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)] pointer-events-none" />
          <div className="absolute inset-0 rounded-3xl bg-[linear-gradient(135deg,transparent_40%,rgba(255,255,255,0.05)_50%,transparent_60%)] pointer-events-none" />

          {/* ================= CARD FRONT ================= */}
          <div className={`h-full flex flex-col justify-between text-white [backface-visibility:hidden] ${isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {/* Card Header */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
                  <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black tracking-wider text-xs uppercase text-white/90">
                    MAISARAH
                  </h3>
                  <p className="text-[10px] font-bold tracking-widest text-amber-300 uppercase">
                    BUSINESS CLUB
                  </p>
                </div>
              </div>

              {/* Tier Badge */}
              <div className={`px-3 py-1 rounded-full border text-[11px] font-black uppercase tracking-wider backdrop-blur-md ${currentTheme.badgeBg}`}>
                {isAr ? currentTheme.nameAr : currentTheme.nameEn}
              </div>
            </div>

            {/* Smart Chip & NFC Icon graphic */}
            <div className="flex items-center gap-3 my-auto">
              <div className="w-11 h-8 rounded-lg bg-gradient-to-tr from-amber-200 via-yellow-100 to-amber-300 border border-yellow-400/50 shadow-inner flex flex-col justify-between p-1.5 opacity-90">
                <div className="w-full h-0.5 bg-yellow-600/30 rounded"></div>
                <div className="flex justify-between">
                  <div className="w-2.5 h-2.5 rounded-full border border-yellow-700/40"></div>
                  <div className="w-2.5 h-2.5 rounded-full border border-yellow-700/40"></div>
                </div>
                <div className="w-full h-0.5 bg-yellow-600/30 rounded"></div>
              </div>
              
              <div className="text-white/40 text-xs">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8.5 16.5a5 5 0 0 1 0-9M12 20a10 10 0 0 0 0-16M5 13a1.5 1.5 0 0 1 0-2" strokeLinecap="round" />
                </svg>
              </div>

              {/* Mini QR trigger */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowQrModal(true);
                }}
                className="ml-auto flex items-center gap-1.5 bg-white/10 hover:bg-white/20 transition-colors px-2.5 py-1 rounded-xl border border-white/15 text-[10px] text-white/90 backdrop-blur-sm"
              >
                <QrCode className="w-3.5 h-3.5 text-amber-300" />
                <span>{isAr ? 'رمز QR' : 'Scan QR'}</span>
              </button>
            </div>

            {/* Card Footer: Name, Number & Points */}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-white/50 font-bold">
                    {isAr ? 'اسم العضو' : 'MEMBER NAME'}
                  </p>
                  <p className="font-extrabold text-sm sm:text-base tracking-wide text-white truncate max-w-[200px]">
                    {member.full_name}
                  </p>
                  {member.company_name && (
                    <p className="text-[10px] text-white/70 truncate max-w-[200px]">
                      {member.company_name}
                    </p>
                  )}
                </div>

                {/* Loyalty Points Pill */}
                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-widest text-white/50 font-bold">
                    {isAr ? 'نقاط الولاء' : 'LOYALTY POINTS'}
                  </p>
                  <div className="flex items-center justify-end gap-1 text-amber-300 font-black text-sm sm:text-base">
                    <Award className="w-4 h-4" />
                    <span>{member.loyalty_points.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Membership Number */}
              <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs sm:text-sm tracking-widest text-white/90 font-bold">
                    {member.membership_number}
                  </span>
                  <button 
                    onClick={copyMembershipNumber}
                    className="p-1 hover:bg-white/10 rounded transition-colors text-white/60 hover:text-white"
                    title={isAr ? 'نسخ رقم العضوية' : 'Copy Membership Number'}
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center gap-1 text-[9px] text-white/40">
                  <RotateCw className="w-3 h-3 animate-spin-slow" />
                  <span>{isAr ? 'المس للقلب' : 'Tap to flip'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ================= CARD BACK ================= */}
          <div className={`absolute inset-0 p-6 sm:p-7 rounded-3xl flex flex-col justify-between text-white [transform:rotateY(180deg)] [backface-visibility:hidden] ${
            !isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}>
            <div className="flex justify-between items-start border-b border-white/10 pb-3">
              <div>
                <p className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
                  {isAr ? 'مزايا العضوية المعتمدة' : 'MEMBER PRIVILEGES'}
                </p>
                <p className="text-xs font-semibold text-white/80">
                  {isAr ? 'ميسرة للاستشارات المالية والضريبية' : 'Maisarah Financial & Tax Advisory'}
                </p>
              </div>
              <div className="text-[10px] font-mono text-white/40">
                {member.joined_date ? `SINCE ${new Date(member.joined_date).getFullYear()}` : 'EST. 2026'}
              </div>
            </div>

            {/* Quick Benefits List */}
            <div className="space-y-1.5 text-[11px] text-white/80">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                <span>{isAr ? 'تنبيهات المواعيد الضريبية والقانونية مجاناً' : 'Free Tax & VAT Deadline Alerts'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Gift className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                <span>{isAr ? 'أولوية الحضور في ورش العمل والندوات' : 'Priority RSVP for Masterclasses & Webinars'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-3.5 h-3.5 text-indigo-300 flex-shrink-0" />
                <span>{isAr ? 'استبدال نقاط الولاء بخصومات على الخدمات' : 'Redeem Points for Service Discounts'}</span>
              </div>
            </div>

            {/* Back Footer */}
            <div className="pt-3 border-t border-white/10 flex justify-between items-center text-[10px] text-white/60">
              <div className="flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-amber-300" />
                <span>+968 2400 0000</span>
              </div>
              <div className="font-mono text-white/40">
                maisarah.one
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar Beneath Card */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button 
          onClick={() => setShowQrModal(true)}
          className="flex flex-col items-center justify-center gap-1 bg-white hover:bg-gray-50 border border-gray-200 p-2.5 rounded-2xl shadow-sm text-gray-700 transition-all active:scale-95 text-center"
        >
          <QrCode className="w-4 h-4 text-brand-dark" />
          <span className="text-[11px] font-bold">{isAr ? 'إظهار الرمز' : 'Show QR'}</span>
        </button>

        <button 
          onClick={copyMembershipNumber}
          className="flex flex-col items-center justify-center gap-1 bg-white hover:bg-gray-50 border border-gray-200 p-2.5 rounded-2xl shadow-sm text-gray-700 transition-all active:scale-95 text-center"
        >
          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-brand-dark" />}
          <span className="text-[11px] font-bold">{copied ? (isAr ? 'تم النسخ' : 'Copied!') : (isAr ? 'نسخ الرقم' : 'Copy ID')}</span>
        </button>

        <button 
          onClick={onUpgradeRequest}
          className="flex flex-col items-center justify-center gap-1 bg-gradient-to-r from-brand-dark to-red-700 hover:from-brand-dark hover:to-red-800 text-white p-2.5 rounded-2xl shadow-sm transition-all active:scale-95 text-center"
        >
          <Sparkles className="w-4 h-4 text-yellow-300" />
          <span className="text-[11px] font-bold">{isAr ? 'ترقية العضوية' : 'Upgrade'}</span>
        </button>
      </div>

      {/* QR Code Enlarged Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 text-center space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-dark/10 flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-brand-dark" />
                </div>
                <div className="text-left rtl:text-right">
                  <h4 className="font-extrabold text-sm text-gray-900">{isAr ? 'رمز التحقق الرقمي' : 'Digital Member Pass'}</h4>
                  <p className="text-[10px] text-gray-500 font-mono">{member.membership_number}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowQrModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* SVG Rendered QR Pattern */}
            <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-gray-200 inline-block shadow-inner mx-auto">
              <svg className="w-48 h-48 mx-auto" viewBox="0 0 17 17" shapeRendering="crispEdges">
                {qrMatrix.map((row, r) => 
                  row.map((cell, c) => (
                    cell ? (
                      <rect 
                        key={`${r}-${c}`} 
                        x={c} 
                        y={r} 
                        width="1" 
                        height="1" 
                        fill="#1e1b4b" 
                      />
                    ) : null
                  ))
                )}
              </svg>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-800">{member.full_name}</p>
              <p className="text-[11px] text-gray-500">
                {isAr ? 'امسح الرمز لتسجيل الحضور في فعاليات النادي أو التحقق من الرصيد' : 'Scan to check in at club events & redeem bonus benefits'}
              </p>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-3 bg-gray-900 text-white rounded-2xl font-bold text-xs hover:bg-black transition-colors"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DigitalClubCard;

import { supabase } from '../lib/supabaseClient';

export interface ProvisionClientParams {
  email: string;
  fullName: string;
  companyName?: string | null;
  phone?: string | null;
  clientType: 'club_member' | 'client';
  memberTier?: 'community' | 'silver' | 'gold' | 'platinum';
  clientId?: string | null;
  leadId?: string | null;
}

export interface ProvisionResult {
  success: boolean;
  userId?: string;
  membershipNumber?: string;
  temporaryPassword?: string;
  emailSent: boolean;
  error?: string;
}

/**
 * Generates a clean random temporary password
 */
export const generateSecureTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let randStr = '';
  for (let i = 0; i < 6; i++) {
    randStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MBC@${randStr}`;
};

/**
 * Builds a mobile-responsive, bilingual HTML welcome email for Maisarah Business Club & Portal
 */
export const buildBusinessClubWelcomeEmailHtml = ({
  fullName,
  companyName,
  email,
  tempPassword,
  membershipNumber,
  memberTier,
  portalUrl,
  isClient
}: {
  fullName: string;
  companyName?: string | null;
  email: string;
  tempPassword: string;
  membershipNumber: string;
  memberTier: string;
  portalUrl: string;
  isClient: boolean;
}) => {
  const tierColors: Record<string, { bg: string; text: string; label: string; labelAr: string }> = {
    community: { bg: '#2563eb', text: '#ffffff', label: 'Community Member', labelAr: 'عضوية المجتمع المجانية' },
    silver: { bg: '#64748b', text: '#ffffff', label: 'Silver Member', labelAr: 'العضوية الفضية' },
    gold: { bg: '#d97706', text: '#ffffff', label: 'Gold Executive', labelAr: 'العضوية الذهبية' },
    platinum: { bg: '#0f172a', text: '#ffffff', label: 'Platinum Elite', labelAr: 'العضوية البلاتينية' }
  };

  const currentTier = tierColors[memberTier] || tierColors.community;

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Maisarah Business Club</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; color: #1e293b; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #A11212 0%, #700c0c 100%); padding: 36px 28px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }
    .header p { margin: 8px 0 0 0; font-size: 13px; color: #fecaca; font-weight: 600; }
    .content { padding: 32px 28px; }
    .badge { display: inline-block; padding: 6px 14px; background-color: ${currentTier.bg}; color: ${currentTier.text}; font-size: 11px; font-weight: 800; border-radius: 9999px; text-transform: uppercase; margin-bottom: 16px; }
    .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 18px; padding: 22px; margin: 20px 0; }
    .card-title { font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    .credential-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
    .credential-row:last-child { border-bottom: none; }
    .credential-label { color: #64748b; font-weight: 600; }
    .credential-val { font-family: monospace; font-weight: 800; color: #0f172a; background: #ffffff; padding: 4px 8px; border-radius: 8px; border: 1px solid #cbd5e1; }
    .btn { display: block; text-align: center; background: #A11212; color: #ffffff !important; padding: 14px 24px; font-size: 14px; font-weight: 800; border-radius: 14px; text-decoration: none; margin: 24px 0 16px 0; box-shadow: 0 4px 12px rgba(161, 18, 18, 0.25); }
    .benefits-list { margin: 16px 0; padding: 0 18px; color: #475569; font-size: 13px; line-height: 1.8; }
    .footer { padding: 24px 28px; background-color: #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    @media only screen and (max-width: 480px) {
      .container { margin: 10px; border-radius: 18px; }
      .content { padding: 24px 18px; }
      .header { padding: 28px 18px; }
    }
  </style>
</head>
<body>
  <div class="container" dir="rtl">
    <div class="header">
      <div style="font-size: 32px; margin-bottom: 8px;">🏛️</div>
      <h1>مرحباً بك في نادي ميسرة للأعمال</h1>
      <p>Maisarah Business Club & Client Portal</p>
    </div>

    <div class="content">
      <div style="text-align: center;">
        <span class="badge">${currentTier.labelAr} • ${currentTier.label}</span>
      </div>

      <p style="font-size: 14px; line-height: 1.7; color: #334155; margin-top: 0;">
        عزيزي <strong>${fullName}</strong> ${companyName ? `(${companyName})` : ''}،
      </p>

      <p style="font-size: 13px; line-height: 1.7; color: #475569;">
        يسرنا انضمامك إلى <strong>نادي ميسرة للأعمال (Maisarah Business Club)</strong> وبوابة الخدمات الذكية. تم تفعيل بطاقة عضويتك الرقمية وحسابك للدخول إلى البوابة ومتابعة التحديثات الضريبية ${isClient ? 'والخدمات والفواتير' : 'والفعاليات المهنية'}.
      </p>

      <!-- Digital Card & Credentials -->
      <div class="card">
        <div class="card-title">🔐 بيانات الدخول والبطاقة الرقمية (Portal Credentials)</div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 700;">رقم العضوية (Member ID):</td>
            <td style="padding: 6px 0; text-align: left; font-family: monospace; font-weight: 800; color: #A11212;">${membershipNumber}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 700;">البريد الإلكتروني (Login Email):</td>
            <td style="padding: 6px 0; text-align: left; font-family: monospace; font-weight: 800; color: #0f172a;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 700;">كلمة المرور المؤقتة (Temp Password):</td>
            <td style="padding: 6px 0; text-align: left; font-family: monospace; font-weight: 800; color: #0f172a; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${tempPassword}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 700;">رصيد نقاط الترحيب (Bonus Points):</td>
            <td style="padding: 6px 0; text-align: left; font-weight: 800; color: #16a34a;">+100 نقطة مكافأة</td>
          </tr>
        </table>
      </div>

      <!-- Action Button -->
      <a href="${portalUrl}" class="btn">
        🚀 تسجيل الدخول إلى بوابة ميسرة (Access Portal)
      </a>

      <!-- Benefits Highlights -->
      <div style="margin-top: 24px;">
        <h4 style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">مزايا عضويتك في نادي ميسرة للأعمال:</h4>
        <ul class="benefits-list">
          <li><strong>تحديثات ضريبية دورية:</strong> إشعارات فورية بقرارات مصلحة الضرائب وضريبة القيمة المضافة.</li>
          <li><strong>تنبيهات المواعيد والامتثال:</strong> التذكير بانتهاء التراخيص والمواعيد القانونية.</li>
          <li><strong>ورش العمل والندوات:</strong> أولوية التسجيل في الدورات التدريبية وجلسات التواصل المهني.</li>
          ${isClient ? '<li><strong>متابعة الخدمات المباشرة:</strong> الاطلاع على مسار تنفيذ المهام وتدقيق الحسابات والفواتير.</li>' : ''}
          <li><strong>استشارات تأسيس الأعمال:</strong> دعم شامل عبر منظومة شركاء OSAN Group.</li>
        </ul>
      </div>

      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 20px;">
        يرجى تغيير كلمة المرور المؤقتة فور تسجيل الدخول لأول مرة لضمان أمان حسابك.
      </p>
    </div>

    <div class="footer">
      <p style="margin: 0; font-weight: 700;">ميسرة لتدقيق الحسابات والاستشارات المالية • Maisarah Auditing</p>
      <p style="margin: 4px 0 0 0;">سلطنة عمان • مسقط | info@maisarah.om</p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Main Controller: Provisions Auth User, Inserts Business Club Member Record, and Dispatches Welcome Email
 */
export async function provisionClientOrMemberAuth(params: ProvisionClientParams): Promise<ProvisionResult> {
  const { email, fullName, companyName, phone, clientType, memberTier = 'community', clientId, leadId } = params;
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail) {
    return { success: false, emailSent: false, error: 'Email is required for auth provisioning' };
  }

  const tempPassword = generateSecureTempPassword();
  let userId: string | null = null;

  try {
    // ── 1. Create or Update Auth User via manage-auth Edge Function ───────────
    const { data: authRes, error: edgeErr } = await supabase.functions.invoke('manage-auth', {
      body: {
        action: 'create_user',
        email: cleanEmail,
        password: tempPassword,
        full_name: fullName,
        company_name: companyName || fullName,
        phone: phone || '',
        role: 'client',
        client_type: clientType,
        department_id: 'audit'
      }
    });

    if (edgeErr) {
      console.warn('manage-auth invoke notice:', edgeErr.message);
    }

    if (authRes?.userId || authRes?.user?.id) {
      userId = authRes.userId || authRes.user.id;
    } else {
      // Fallback: lookup profile id by email
      const { data: prof } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();
      if (prof?.id) userId = prof.id;
    }

    if (!userId) {
      throw new Error('Failed to resolve or create Auth account for client/member');
    }

    // ── 2. Create or Update Business Club Member Record ───────────────────────
    // Check if member already exists
    const { data: existingMember } = await supabase
      .from('business_club_members')
      .select('id, membership_number')
      .or(`email.eq.${cleanEmail},user_id.eq.${userId}`)
      .maybeSingle();

    let membershipNumber = existingMember?.membership_number;

    if (!membershipNumber) {
      const year = new Date().getFullYear();
      const randDigits = Math.floor(1000 + Math.random() * 9000);
      membershipNumber = `MBC-${year}-${randDigits}`;

      const { error: memberInsertErr } = await supabase
        .from('business_club_members')
        .insert([{
          user_id: userId,
          client_id: clientId || null,
          lead_id: leadId || null,
          membership_number: membershipNumber,
          full_name: fullName,
          company_name: companyName || null,
          email: cleanEmail,
          phone: phone || null,
          member_tier: memberTier,
          loyalty_points: 100, // 100 welcome bonus points
          qr_code_token: `QR-${membershipNumber}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          compliance_health_score: 85,
          status: 'active'
        }]);

      if (memberInsertErr) {
        console.warn('business_club_members insert notice:', memberInsertErr.message);
      }
    } else {
      // Update existing membership with user_id
      await supabase
        .from('business_club_members')
        .update({
          user_id: userId,
          client_id: clientId || undefined,
          lead_id: leadId || undefined,
          status: 'active'
        })
        .eq('id', existingMember.id);
    }

    // ── 3. Dispatch Welcome Email via Resend ──────────────────────────────────
    const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : 'https://maisarah.om/login';
    const emailHtml = buildBusinessClubWelcomeEmailHtml({
      fullName,
      companyName,
      email: cleanEmail,
      tempPassword,
      membershipNumber,
      memberTier,
      portalUrl,
      isClient: clientType === 'client'
    });

    let emailSent = false;
    try {
      const { data: emailData, error: emailErr } = await supabase.functions.invoke('send-email', {
        body: {
          to: cleanEmail,
          subject: `🏛️ مرحباً بك في نادي ميسرة للأعمال | Your Maisarah Business Club Card (${membershipNumber})`,
          html: emailHtml
        }
      });

      if (!emailErr && emailData?.success !== false) {
        emailSent = true;
      } else {
        console.warn('send-email response notice:', emailErr?.message || emailData?.error);
      }
    } catch (mailEx: any) {
      console.warn('Email dispatch warning:', mailEx.message);
    }

    return {
      success: true,
      userId,
      membershipNumber,
      temporaryPassword: tempPassword,
      emailSent
    };
  } catch (err: any) {
    console.error('provisionClientOrMemberAuth error:', err);
    return {
      success: false,
      emailSent: false,
      error: err.message || 'Internal provisioning error'
    };
  }
}

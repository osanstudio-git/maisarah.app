import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';

export interface WhatsAppRouteOptions {
  serviceId?: string;
  serviceName: string;
  mode: 'presales' | 'operational';
  companyName?: string;
  contactName?: string;
  leadId?: string;
  customMessage?: string;
  onSuccess?: () => void;
}

export const CENTRAL_SALES_PHONE = '96891234567'; // Central CRM & Field Sales Hotline
export const CENTRAL_OPS_PHONE = '96897654321';   // Central Operations & Audit Desk

export function useWhatsAppRouter() {
  const { user, role } = useAuth();

  const getUtmParams = () => {
    if (typeof window === 'undefined') return {};
    const urlParams = new URLSearchParams(window.location.search);
    return {
      utm_source: urlParams.get('utm_source') || 'direct_web',
      utm_medium: urlParams.get('utm_medium') || 'catalog_cta',
      utm_campaign: urlParams.get('utm_campaign') || 'services_funnel',
      utm_content: urlParams.get('utm_content') || undefined,
      ref: urlParams.get('ref') || undefined
    };
  };

  const routeWhatsApp = useCallback(async (options: WhatsAppRouteOptions) => {
    const trackingRef = `MS-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const utms = getUtmParams();

    let targetPhone = CENTRAL_SALES_PHONE;
    let routedRole = 'crm_sales';
    let assignedEmployeeName: string | null = null;
    let clientId: string | null = null;

    // Check if user is an authenticated active client with an assigned operations lead
    if (options.mode === 'operational' && user) {
      try {
        // Find client record for current user
        const { data: clientRecord } = await supabase
          .from('clients')
          .select('id, company_name, assigned_employee_id, assigned_profile:profiles!clients_assigned_employee_id_fkey(id, full_name, phone)')
          .or(`id.eq.${user.id},email.eq.${user.email}`)
          .maybeSingle();

        if (clientRecord) {
          clientId = clientRecord.id;
          const assignedProfile = clientRecord.assigned_profile as any;
          if (assignedProfile?.phone) {
            targetPhone = assignedProfile.phone.replace(/[^0-9]/g, '');
            routedRole = 'operations_lead';
            assignedEmployeeName = assignedProfile.full_name;
          }
        }
      } catch (err) {
        console.warn('Fallback to central dispatcher:', err);
      }

      // If no assigned employee phone was found, fallback to Central Operations
      if (routedRole !== 'operations_lead') {
        targetPhone = CENTRAL_OPS_PHONE;
        routedRole = 'operations_central';
      }
    }

    // Compose tailored prefilled message
    let prefilledMessage = '';
    const resolvedCompany = options.companyName || user?.user_metadata?.company_name || 'My Company';
    const resolvedContact = options.contactName || user?.user_metadata?.full_name || 'Prospective Client';

    if (options.customMessage) {
      prefilledMessage = `${options.customMessage}\n\n[Ref: ${trackingRef}]`;
    } else if (options.mode === 'operational') {
      prefilledMessage = `Hello${assignedEmployeeName ? ' ' + assignedEmployeeName : ' Operations Team'},\nI need to initiate a service engagement for: *${options.serviceName}*.\n\n🏢 Company: ${resolvedCompany}\n👤 Account Ref: ${trackingRef}\n\nPlease review our account and follow up with the required scope.`;
    } else {
      prefilledMessage = `Hello Maisarah Team,\nI am interested in learning more about your *${options.serviceName}* services for my company.\n\n🏢 Company: ${resolvedCompany}\n👤 Contact: ${resolvedContact}\n🔖 Ref: ${trackingRef}\n\nPlease share the proposal details and compliance timeline.`;
    }

    // 1. Asynchronously log telemetry event to avoid losing offline WhatsApp chats
    try {
      await supabase.from('lead_activity_logs').insert({
        service_id: options.serviceId || null,
        lead_id: options.leadId || null,
        client_id: clientId,
        event_type: options.mode === 'operational' ? 'whatsapp_ops_click' : 'whatsapp_presales_click',
        source_url: typeof window !== 'undefined' ? window.location.href : '',
        utm_source: utms.utm_source,
        utm_medium: utms.utm_medium,
        utm_campaign: utms.utm_campaign,
        utm_content: utms.utm_content,
        routed_to_phone: targetPhone,
        routed_to_role: routedRole,
        metadata: {
          trackingRef,
          serviceName: options.serviceName,
          companyName: resolvedCompany,
          contactName: resolvedContact,
          refCode: utms.ref,
          prefilledMessage
        }
      });
    } catch (logErr) {
      console.warn('Telemetry log error:', logErr);
    }

    // 2. If operational, log an in-dashboard notification for employee/manager
    if (options.mode === 'operational') {
      try {
        await supabase.from('notifications').insert({
          title: `New WhatsApp Engagement: ${options.serviceName}`,
          message: `${resolvedCompany} initiated a WhatsApp service request for ${options.serviceName} (Ref: ${trackingRef})`,
          type: 'general',
          recipient_role: 'manager',
          is_read: false
        });
      } catch (notifErr) {
        console.warn('Notification log error:', notifErr);
      }
    }

    // 3. Open WhatsApp link
    const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(prefilledMessage);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

    if (typeof window !== 'undefined') {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }

    if (options.onSuccess) {
      options.onSuccess();
    }

    return {
      trackingRef,
      targetPhone,
      routedRole,
      whatsappUrl
    };
  }, [user, role]);

  return {
    routeWhatsApp,
    getUtmParams
  };
}

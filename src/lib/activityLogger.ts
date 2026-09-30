import { supabase } from './supabaseClient';

export type ActivityType = 
  | 'client_created' 
  | 'client_archived' 
  | 'service_created' 
  | 'service_updated' 
  | 'service_deleted' 
  | 'invoice_created' 
  | 'invoice_paid' 
  | 'broadcast_sent'
  | 'service_approved'
  | 'delay_escalated'
  | 'delay_action_logged'
  | 'task_dispatched';

export const logActivity = async (
  userId: string,
  userName: string,
  type: ActivityType,
  detailsEn: string,
  detailsAr: string
) => {
  try {
    const { error } = await supabase.from('activity_log').insert([
      {
        user_name: userName || 'System User',
        description_en: detailsEn,
        description_ar: detailsAr,
      },
    ]);

    if (error) {
      console.warn('Activity log notice:', error.message);
    }
  } catch (err) {
    console.error('Activity Logger Error:', err);
  }
};

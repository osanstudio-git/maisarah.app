import { supabase } from './supabaseClient';

export type ActivityType = 
  | 'client_created' 
  | 'client_archived' 
  | 'service_created' 
  | 'service_updated' 
  | 'invoice_created' 
  | 'invoice_paid' 
  | 'broadcast_sent'
  | 'service_approved';

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
        user_id: userId,
        user_name: userName,
        activity_type: type,
        description_en: detailsEn,
        description_ar: detailsAr,
      },
    ]);

    if (error) {
      // If table doesn't exist, we fail silently to not break the app
      console.warn('Activity log failed - table might not exist:', error.message);
    }
  } catch (err) {
    console.error('Activity Logger Error:', err);
  }
};

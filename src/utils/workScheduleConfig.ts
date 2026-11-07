/**
 * Maisarah HR Work Schedules & Holiday Configuration
 * Supports differential policies for Omani vs Expat staff:
 * - Expat: Sun-Wed (08:30-17:00), Thu (08:30-16:00), Sat (10:00-16:00), Fri (Day Off - L)
 * - Omani: Sun-Wed (08:30-17:00), Thu (08:30-16:00), Sat (Day Off - L), Fri (Day Off - L)
 * Also manages Public & Company Holidays that reflect on employee timesheet calendars.
 */

import { supabase } from '../lib/supabaseClient';

export type EmployeeCategory = 'Omani' | 'Expat';

export interface DaySchedule {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
  dayNameEn: string;
  dayNameAr: string;
  isOffDay: boolean; // true = Day Off (L)
  startTime: string; // e.g. "08:30"
  endTime: string;   // e.g. "17:00", "16:00"
}

export interface PolicySchedule {
  category: EmployeeCategory;
  categoryLabelEn: string;
  categoryLabelAr: string;
  days: DaySchedule[];
}

export interface HolidayItem {
  id: string;
  nameEn: string;
  nameAr: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  targetCategory?: 'All' | 'Omani' | 'Expat';
  notes?: string;
}

const SCHEDULE_STORAGE_KEY = 'maisarah_hr_work_schedules_v1';
const HOLIDAY_STORAGE_KEY = 'maisarah_hr_holidays_v1';
const EVENT_SCHEDULE_CHANGED = 'maisarah_hr_schedule_changed';
const EVENT_HOLIDAY_CHANGED = 'maisarah_hr_holiday_changed';

// Default Omani Weekly Timings
export const DEFAULT_OMANI_SCHEDULE: DaySchedule[] = [
  { dayOfWeek: 0, dayNameEn: 'Sunday',    dayNameAr: 'الأحد',     isOffDay: false, startTime: '08:30', endTime: '17:00' },
  { dayOfWeek: 1, dayNameEn: 'Monday',    dayNameAr: 'الاثنين',   isOffDay: false, startTime: '08:30', endTime: '17:00' },
  { dayOfWeek: 2, dayNameEn: 'Tuesday',   dayNameAr: 'الثلاثاء',  isOffDay: false, startTime: '08:30', endTime: '17:00' },
  { dayOfWeek: 3, dayNameEn: 'Wednesday', dayNameAr: 'الأربعاء',  isOffDay: false, startTime: '08:30', endTime: '17:00' },
  { dayOfWeek: 4, dayNameEn: 'Thursday',  dayNameAr: 'الخميس',    isOffDay: false, startTime: '08:30', endTime: '16:00' },
  { dayOfWeek: 5, dayNameEn: 'Friday',    dayNameAr: 'الجمعة',    isOffDay: true,  startTime: '08:30', endTime: '17:00' },
  { dayOfWeek: 6, dayNameEn: 'Saturday',  dayNameAr: 'السبت',     isOffDay: true,  startTime: '08:30', endTime: '17:00' },
];

// Default Expat Weekly Timings (Saturday 10:00 - 16:00)
export const DEFAULT_EXPAT_SCHEDULE: DaySchedule[] = [
  { dayOfWeek: 0, dayNameEn: 'Sunday',    dayNameAr: 'الأحد',     isOffDay: false, startTime: '08:30', endTime: '17:00' },
  { dayOfWeek: 1, dayNameEn: 'Monday',    dayNameAr: 'الاثنين',   isOffDay: false, startTime: '08:30', endTime: '17:00' },
  { dayOfWeek: 2, dayNameEn: 'Tuesday',   dayNameAr: 'الثلاثاء',  isOffDay: false, startTime: '08:30', endTime: '17:00' },
  { dayOfWeek: 3, dayNameEn: 'Wednesday', dayNameAr: 'الأربعاء',  isOffDay: false, startTime: '08:30', endTime: '17:00' },
  { dayOfWeek: 4, dayNameEn: 'Thursday',  dayNameAr: 'الخميس',    isOffDay: false, startTime: '08:30', endTime: '16:00' },
  { dayOfWeek: 5, dayNameEn: 'Friday',    dayNameAr: 'الجمعة',    isOffDay: true,  startTime: '08:30', endTime: '17:00' },
  { dayOfWeek: 6, dayNameEn: 'Saturday',  dayNameAr: 'السبت',     isOffDay: false, startTime: '10:00', endTime: '16:00' },
];

// Official Oman Holidays
export const DEFAULT_HOLIDAYS: HolidayItem[] = [
  {
    id: 'hol-national-day',
    nameEn: 'Oman National Day',
    nameAr: 'العيد الوطني العماني المجيد',
    startDate: '2026-11-18',
    endDate: '2026-11-19',
    targetCategory: 'All',
    notes: 'Official National Holiday in Sultanate of Oman'
  },
  {
    id: 'hol-new-year',
    nameEn: "New Year's Day",
    nameAr: 'رأس السنة الميلادية',
    startDate: '2027-01-01',
    endDate: '2027-01-01',
    targetCategory: 'All',
    notes: 'Public holiday'
  },
  {
    id: 'hol-isra-miraj',
    nameEn: 'Al Isra wal Miraj',
    nameAr: 'ذكرى الإسراء والمعراج',
    startDate: '2027-01-26',
    endDate: '2027-01-26',
    targetCategory: 'All',
    notes: 'Official holiday'
  }
];

/**
 * Fetch latest schedules from Supabase DB
 */
export const fetchWorkSchedulesFromDB = async (): Promise<{ omani: DaySchedule[]; expat: DaySchedule[] } | null> => {
  try {
    const { data, error } = await supabase.from('hr_work_schedules').select('*');
    if (error || !data || data.length === 0) return null;

    let omani = DEFAULT_OMANI_SCHEDULE;
    let expat = DEFAULT_EXPAT_SCHEDULE;

    data.forEach((row: any) => {
      const schedule = Array.isArray(row.schedule_json) ? row.schedule_json : null;
      if (schedule) {
        if (row.id === 'Omani' || row.category === 'Omani') omani = schedule;
        if (row.id === 'Expat' || row.category === 'Expat') expat = schedule;
      }
    });

    const result = { omani, expat };
    if (typeof window !== 'undefined') {
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(result));
      window.dispatchEvent(new CustomEvent(EVENT_SCHEDULE_CHANGED, { detail: result }));
    }
    return result;
  } catch (e) {
    console.warn('Supabase work schedules fetch note:', e);
    return null;
  }
};

/**
 * Fetch latest holidays from Supabase DB
 */
export const fetchHolidaysFromDB = async (): Promise<HolidayItem[] | null> => {
  try {
    const { data, error } = await supabase.from('hr_holidays').select('*').order('start_date', { ascending: true });
    if (error || !data || data.length === 0) return null;

    const holidays: HolidayItem[] = data.map((h: any) => ({
      id: h.id,
      nameEn: h.name_en || h.name_ar,
      nameAr: h.name_ar || h.name_en,
      startDate: h.start_date,
      endDate: h.end_date || h.start_date,
      targetCategory: h.target_category || 'All',
      notes: h.notes || undefined
    }));

    if (typeof window !== 'undefined') {
      localStorage.setItem(HOLIDAY_STORAGE_KEY, JSON.stringify(holidays));
      window.dispatchEvent(new CustomEvent(EVENT_HOLIDAY_CHANGED, { detail: holidays }));
    }
    return holidays;
  } catch (e) {
    console.warn('Supabase holidays fetch note:', e);
    return null;
  }
};

/**
 * Get the current configured work schedules for both categories (synchronous with background sync)
 */
export const getWorkSchedules = (): { omani: DaySchedule[]; expat: DaySchedule[] } => {
  if (typeof window === 'undefined') {
    return { omani: DEFAULT_OMANI_SCHEDULE, expat: DEFAULT_EXPAT_SCHEDULE };
  }
  try {
    const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.omani && parsed.expat) return parsed;
    }
  } catch (e) {
    console.warn('Error reading work schedules:', e);
  }
  return { omani: DEFAULT_OMANI_SCHEDULE, expat: DEFAULT_EXPAT_SCHEDULE };
};

/**
 * Save updated work schedules to Supabase DB and local storage
 */
export const saveWorkSchedules = (schedules: { omani: DaySchedule[]; expat: DaySchedule[] }): void => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(schedules));
      window.dispatchEvent(new CustomEvent(EVENT_SCHEDULE_CHANGED, { detail: schedules }));
    } catch (e) {
      console.error('Error saving work schedules locally:', e);
    }
  }

  // Persist to Supabase DB
  supabase
    .from('hr_work_schedules')
    .upsert([
      { id: 'Omani', category: 'Omani', schedule_json: schedules.omani, updated_at: new Date().toISOString() },
      { id: 'Expat', category: 'Expat', schedule_json: schedules.expat, updated_at: new Date().toISOString() }
    ], { onConflict: 'id' })
    .then(({ error }) => {
      if (error) {
        console.warn('Note: Could not upsert to public.hr_work_schedules in DB yet:', error.message);
      }
    })
    .catch(err => console.warn('Supabase schedule upsert exception:', err));
};

/**
 * Get configured holidays list (synchronous with background sync)
 */
export const getHolidays = (): HolidayItem[] => {
  if (typeof window === 'undefined') return DEFAULT_HOLIDAYS;
  try {
    const raw = localStorage.getItem(HOLIDAY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Error reading holidays:', e);
  }
  return DEFAULT_HOLIDAYS;
};

/**
 * Save updated holidays list to Supabase DB and local storage
 */
export const saveHolidays = (holidays: HolidayItem[]): void => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(HOLIDAY_STORAGE_KEY, JSON.stringify(holidays));
      window.dispatchEvent(new CustomEvent(EVENT_HOLIDAY_CHANGED, { detail: holidays }));
    } catch (e) {
      console.error('Error saving holidays locally:', e);
    }
  }

  // Persist to Supabase DB
  const payload = holidays.map(h => ({
    id: h.id,
    name_en: h.nameEn,
    name_ar: h.nameAr,
    start_date: h.startDate,
    end_date: h.endDate,
    target_category: h.targetCategory || 'All',
    notes: h.notes || null
  }));

  supabase
    .from('hr_holidays')
    .upsert(payload, { onConflict: 'id' })
    .then(({ error }) => {
      if (error) {
        console.warn('Note: Could not upsert to public.hr_holidays in DB yet:', error.message);
      }
    })
    .catch(err => console.warn('Supabase holidays upsert exception:', err));
};

/**
 * Delete holiday from Supabase DB and local storage
 */
export const deleteHoliday = (id: string, currentList: HolidayItem[]): void => {
  const updated = currentList.filter(h => h.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(HOLIDAY_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(EVENT_HOLIDAY_CHANGED, { detail: updated }));
  }

  supabase
    .from('hr_holidays')
    .delete()
    .eq('id', id)
    .then(({ error }) => {
      if (error) console.warn('Note: Could not delete from public.hr_holidays:', error.message);
    })
    .catch(err => console.warn('Supabase holiday delete exception:', err));
};

/**
 * Check if a specific YYYY-MM-DD date is a registered holiday
 */
export const getHolidayForDate = (dateStr: string, category: EmployeeCategory = 'Expat'): HolidayItem | null => {
  const holidays = getHolidays();
  const match = holidays.find(h => {
    const targetMatch = !h.targetCategory || h.targetCategory === 'All' || h.targetCategory === category;
    if (!targetMatch) return false;
    return dateStr >= h.startDate && dateStr <= (h.endDate || h.startDate);
  });
  return match || null;
};

/**
 * Resolve employee category: Omani vs Expat based on nationality
 */
export const resolveEmployeeCategory = (emp?: { nationality?: string | null }): EmployeeCategory => {
  if (!emp || !emp.nationality) return 'Expat';
  const nat = emp.nationality.trim().toLowerCase();
  if (nat.includes('oman') || nat.includes('عمان') || nat.includes('عُمان')) {
    return 'Omani';
  }
  return 'Expat';
};

/**
 * Get daily schedule rule for an employee on a given date
 */
export const getDayScheduleForEmployee = (
  dateStr: string,
  category: EmployeeCategory = 'Expat'
): {
  isHoliday: boolean;
  holidayName?: string;
  isOffDay: boolean;
  startTime: string;
  endTime: string;
  scheduledStartMins: number;
  scheduledEndMins: number;
} => {
  // 1. Check Holiday first
  const holiday = getHolidayForDate(dateStr, category);
  if (holiday) {
    return {
      isHoliday: true,
      holidayName: holiday.nameEn,
      isOffDay: true,
      startTime: '--',
      endTime: '--',
      scheduledStartMins: 0,
      scheduledEndMins: 0
    };
  }

  // 2. Weekly Day Schedule
  const [y, m, d] = dateStr.split('-').map(Number);
  const dayOfWeek = new Date(y, m - 1, d).getDay(); // 0 = Sun .. 6 = Sat
  const schedules = getWorkSchedules();
  const policyDays = category === 'Omani' ? schedules.omani : schedules.expat;
  const dayRule = policyDays.find(p => p.dayOfWeek === dayOfWeek) || policyDays[0];

  const [sh, sm] = (dayRule.startTime || '08:30').split(':').map(Number);
  const [eh, em] = (dayRule.endTime || '17:00').split(':').map(Number);

  return {
    isHoliday: false,
    isOffDay: dayRule.isOffDay,
    startTime: dayRule.startTime,
    endTime: dayRule.endTime,
    scheduledStartMins: (sh || 8) * 60 + (sm || 30),
    scheduledEndMins: (eh || 17) * 60 + (em || 0)
  };
};

/**
 * React hook subscriber for live schedule and holiday updates (Multi-tab + Cross-device Supabase Realtime)
 */
export const subscribeWorkSchedules = (callback: () => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  // 1. Initial background fetch from Supabase DB to ensure fresh data
  fetchWorkSchedulesFromDB().then((res) => {
    if (res) callback();
  });
  fetchHolidaysFromDB().then((res) => {
    if (res) callback();
  });

  // 2. Local window event listener for instant multi-tab sync
  const handleLocalUpdate = () => callback();
  window.addEventListener(EVENT_SCHEDULE_CHANGED, handleLocalUpdate);
  window.addEventListener(EVENT_HOLIDAY_CHANGED, handleLocalUpdate);

  // 3. Supabase Realtime WebSocket for cross-device updates
  const channel = supabase
    .channel('hr_schedules_holidays_realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'hr_work_schedules' },
      async () => {
        await fetchWorkSchedulesFromDB();
        callback();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'hr_holidays' },
      async () => {
        await fetchHolidaysFromDB();
        callback();
      }
    )
    .subscribe();

  return () => {
    window.removeEventListener(EVENT_SCHEDULE_CHANGED, handleLocalUpdate);
    window.removeEventListener(EVENT_HOLIDAY_CHANGED, handleLocalUpdate);
    supabase.removeChannel(channel);
  };
};

import { supabase } from '../lib/supabaseClient';
import { 
  DEPARTMENTS, 
  getAllDepartments, 
  getDepartmentById, 
  type DepartmentConfig, 
  type DepartmentStage, 
  type DepartmentRole,
  type CycleType
} from '../config/departments';

const LOCAL_STORAGE_CUSTOM_DEPTS_KEY = 'maisarah_custom_departments_v2';
const LOCAL_STORAGE_STAGES_KEY = 'maisarah_custom_stages_v2';
const LOCAL_STORAGE_ROLES_KEY = 'maisarah_custom_roles_v2';

// ---------------------------------------------------------------------------
// Helpers for Local Storage Fallback Cache
// ---------------------------------------------------------------------------
const getCachedCustomDepts = (): Record<string, DepartmentConfig> => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CUSTOM_DEPTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const setCachedCustomDepts = (depts: Record<string, DepartmentConfig>) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_DEPTS_KEY, JSON.stringify(depts));
  } catch (e) {
    console.error('Failed to cache departments:', e);
  }
};

// ---------------------------------------------------------------------------
// Department Fetch & Management
// ---------------------------------------------------------------------------
export const fetchAllDepartments = async (): Promise<DepartmentConfig[]> => {
  const cached = getCachedCustomDepts();
  const defaultList = getAllDepartments();

  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('name_en');

    if (error || !data || data.length === 0) {
      // Return defaults merged with local cached overrides
      return defaultList.map(d => cached[d.id] || d);
    }

    // Map DB rows to DepartmentConfig
    const dbDepts: DepartmentConfig[] = data.map(row => {
      const defaultD = getDepartmentById(row.id);
      return {
        id: row.id,
        name: row.name_en,
        name_ar: row.name_ar,
        head_title: row.head_title_en || defaultD?.head_title || 'Head of Department',
        head_title_ar: row.head_title_ar || defaultD?.head_title_ar || 'رئيس القسم',
        duty: row.duty_en || defaultD?.duty || '',
        duty_ar: row.duty_ar || defaultD?.duty_ar || '',
        cycle_type: (row.cycle_type as CycleType) || defaultD?.cycle_type || 'custom',
        color: row.color || defaultD?.color || '#A11212',
        icon: row.icon || defaultD?.icon || 'Briefcase',
        enable_cross_handoff: row.enable_cross_handoff ?? defaultD?.enable_cross_handoff ?? true,
        allowed_handoff_dept_ids: Array.isArray(row.allowed_handoff_dept_ids) 
          ? row.allowed_handoff_dept_ids 
          : defaultD?.allowed_handoff_dept_ids || [],
        job_positions: defaultD?.job_positions || [],
        stages: defaultD?.stages || [],
        services: defaultD?.services || [],
        kpis: defaultD?.kpis || [],
        extra_features: defaultD?.extra_features || []
      };
    });

    return dbDepts;
  } catch (err) {
    console.warn('Using local departments configuration:', err);
    return defaultList.map(d => cached[d.id] || d);
  }
};

export const saveDepartment = async (dept: DepartmentConfig): Promise<{ success: boolean; error?: string }> => {
  // Update local cache first for zero-latency reactive UI
  const cached = getCachedCustomDepts();
  cached[dept.id] = dept;
  setCachedCustomDepts(cached);

  try {
    const { error } = await supabase.from('departments').upsert({
      id: dept.id,
      name_en: dept.name,
      name_ar: dept.name_ar || dept.name,
      head_title_en: dept.head_title,
      head_title_ar: dept.head_title_ar || dept.head_title,
      duty_en: dept.duty,
      duty_ar: dept.duty_ar || dept.duty,
      cycle_type: dept.cycle_type,
      color: dept.color || '#A11212',
      icon: dept.icon || 'Briefcase',
      enable_cross_handoff: dept.enable_cross_handoff ?? true,
      allowed_handoff_dept_ids: dept.allowed_handoff_dept_ids || [],
      is_active: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    if (error) {
      console.warn('Database upsert warning (saved locally):', error.message);
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Saved department in local state:', err.message);
    return { success: true };
  }
};

// ---------------------------------------------------------------------------
// Stages Fetch & Management
// ---------------------------------------------------------------------------
export const fetchDepartmentStages = async (deptId: string): Promise<DepartmentStage[]> => {
  const defaultStages = DEPARTMENTS[deptId]?.stages || [];

  try {
    const { data, error } = await supabase
      .from('department_stages')
      .select('*')
      .eq('department_id', deptId)
      .order('step_number', { ascending: true });

    if (error || !data || data.length === 0) {
      return defaultStages;
    }

    return data.map(d => ({
      step_number: d.step_number,
      name_en: d.name_en,
      name_ar: d.name_ar,
      deadline_rule: d.deadline_rule || '',
      requires_approval: d.requires_approval ?? false,
      description_en: d.description_en,
      description_ar: d.description_ar
    }));
  } catch {
    return defaultStages;
  }
};

export const saveDepartmentStage = async (deptId: string, stage: DepartmentStage): Promise<boolean> => {
  try {
    await supabase.from('department_stages').insert({
      department_id: deptId,
      step_number: stage.step_number,
      name_en: stage.name_en,
      name_ar: stage.name_ar,
      deadline_rule: stage.deadline_rule,
      requires_approval: stage.requires_approval ?? false
    });
    return true;
  } catch {
    return false;
  }
};

// ---------------------------------------------------------------------------
// Roles Fetch & Management
// ---------------------------------------------------------------------------
export const fetchDepartmentRoles = async (deptId: string): Promise<DepartmentRole[]> => {
  const defaultPositions = DEPARTMENTS[deptId]?.job_positions || ['Staff Member'];
  const defaultRoles: DepartmentRole[] = defaultPositions.map(title => ({
    title_en: title,
    title_ar: title,
    access_role: 'employee'
  }));

  try {
    const { data, error } = await supabase
      .from('department_roles')
      .select('*')
      .eq('department_id', deptId);

    if (error || !data || data.length === 0) {
      return defaultRoles;
    }

    return data.map(r => ({
      title_en: r.title_en,
      title_ar: r.title_ar,
      access_role: r.access_role
    }));
  } catch {
    return defaultRoles;
  }
};

export const saveDepartmentRole = async (deptId: string, role: DepartmentRole): Promise<boolean> => {
  try {
    await supabase.from('department_roles').insert({
      department_id: deptId,
      title_en: role.title_en,
      title_ar: role.title_ar,
      access_role: role.access_role || 'employee'
    });
    return true;
  } catch {
    return false;
  }
};

// ---------------------------------------------------------------------------
// Optional Inter-Department Handoffs
// ---------------------------------------------------------------------------
export interface DepartmentHandoffPayload {
  source_department_id: string;
  target_department_id: string;
  client_id?: string;
  service_id?: string;
  service_name?: string;
  notes?: string;
  priority?: 'low' | 'normal' | 'urgent';
}

export const createDepartmentHandoff = async (payload: DepartmentHandoffPayload): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from('department_handoffs').insert({
      source_department_id: payload.source_department_id,
      target_department_id: payload.target_department_id,
      client_id: payload.client_id,
      service_id: payload.service_id,
      service_name: payload.service_name,
      notes: payload.notes,
      priority: payload.priority || 'normal',
      status: 'pending',
      created_at: new Date().toISOString()
    });

    if (error) {
      console.warn('Could not record handoff in table:', error.message);
    }
    return { success: true };
  } catch (err: any) {
    return { success: true };
  }
};

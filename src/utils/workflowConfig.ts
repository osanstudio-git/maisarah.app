/**
 * Maisarah System Workflow & Hierarchy Configuration
 * Manages organization hierarchy modes:
 * - 'direct_employee': Flat Mode (Lean / Direct dispatch from CRM & Manager to Employees, bypassing HOD)
 * - 'hod_hierarchical': Enterprise Mode (Full HOD routing, multi-tier QC, department queues)
 */

export type HierarchyMode = 'direct_employee' | 'hod_hierarchical';

const STORAGE_KEY = 'maisarah_hierarchy_mode';
const EVENT_NAME = 'maisarah_hierarchy_mode_changed';

/**
 * Get current hierarchy mode. Defaults to 'direct_employee' (Flat Mode).
 */
export const getHierarchyMode = (): HierarchyMode => {
  if (typeof window === 'undefined') return 'direct_employee';
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'hod_hierarchical' || saved === 'direct_employee') {
    return saved;
  }
  // Default to Flat / Direct Employee Mode
  return 'direct_employee';
};

/**
 * Check if the organization is currently in Direct Employee (Flat) Mode
 */
export const isDirectEmployeeMode = (): boolean => {
  return getHierarchyMode() === 'direct_employee';
};

/**
 * Set and broadcast hierarchy mode change across the application
 */
export const setHierarchyMode = (mode: HierarchyMode): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, mode);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { mode } }));
};

/**
 * React hook / listener helper for hierarchy mode changes
 */
export const subscribeHierarchyMode = (callback: (mode: HierarchyMode) => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<{ mode: HierarchyMode }>;
    callback(customEvent.detail?.mode || getHierarchyMode());
  };

  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
};

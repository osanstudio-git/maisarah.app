import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  AlertCircle,
  Printer,
  RotateCcw,
  Search,
  Filter,
  Layers,
  ChevronDown,
  ChevronRight,
  FileText,
  Building2,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';
import {
  getClientChecklist,
  toggleChecklistItem,
  toggleChecklistSubItem,
  addCustomChecklistItem,
  deleteCustomChecklistItem,
  updateChecklistItemNote,
  resetDepartmentChecklist,
  type ChecklistItem
} from '../../services/checklistService';
import { getAllDepartments, DEPARTMENT_CONFIGS } from '../../config/departments';
import { normalizeDepartmentId } from '../../utils/departmentScoping';
import { useAuth } from '../../hooks/useAuth';

interface ClientDepartmentChecklistProps {
  clientId: string;
  clientName: string;
  crNumber?: string | null;
  defaultDeptId: string;
  isAr: boolean;
  isManager?: boolean;
}

export default function ClientDepartmentChecklist({
  clientId,
  clientName,
  crNumber,
  defaultDeptId,
  isAr,
  isManager = false
}: ClientDepartmentChecklistProps) {
  const { user, role } = useAuth();
  const canSwitchDepartments = isManager || role === 'manager' || role === 'admin';
  const effectiveDept = normalizeDepartmentId(defaultDeptId);
  const [activeDeptId, setActiveDeptId] = useState<string>(() => effectiveDept);

  useEffect(() => {
    if (!canSwitchDepartments) {
      setActiveDeptId(effectiveDept);
    }
  }, [effectiveDept, canSwitchDepartments]);

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Custom Item Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customTitleEn, setCustomTitleEn] = useState('');
  const [customTitleAr, setCustomTitleAr] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);

  // Active editing notes state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Staff';

  // Load checklist
  const loadChecklist = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getClientChecklist(clientId, activeDeptId);
      setItems(data);
    } catch (err) {
      console.warn('Error loading checklist:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId, activeDeptId]);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  // Listen for live update events
  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail?.clientId === clientId && e.detail?.departmentId === activeDeptId) {
        loadChecklist();
      }
    };
    window.addEventListener('maisarah_checklist_updated', handleUpdate);
    return () => window.removeEventListener('maisarah_checklist_updated', handleUpdate);
  }, [clientId, activeDeptId, loadChecklist]);

  // Toggle item
  const handleToggle = async (item: ChecklistItem) => {
    const newStatus = !item.is_completed;
    // Optimistic UI update
    setItems(prev => prev.map(i => i.id === item.id ? {
      ...i,
      is_completed: newStatus,
      completed_at: newStatus ? new Date().toISOString() : null,
      completed_by_name: newStatus ? userName : null,
      sub_items: i.sub_items?.map(s => ({ ...s, is_completed: newStatus }))
    } : i));

    await toggleChecklistItem(clientId, activeDeptId, item.id, newStatus, userName);
  };

  // Toggle sub-item
  const handleToggleSub = async (parentId: string, subCode: string, currentSubStatus: boolean) => {
    const newSubStatus = !currentSubStatus;
    setItems(prev => prev.map(item => {
      if (item.id === parentId && item.sub_items) {
        const updatedSubs = item.sub_items.map(s => s.code === subCode ? { ...s, is_completed: newSubStatus } : s);
        const allDone = updatedSubs.every(s => s.is_completed);
        return {
          ...item,
          sub_items: updatedSubs,
          is_completed: allDone,
          completed_at: allDone ? new Date().toISOString() : null,
          completed_by_name: allDone ? userName : null
        };
      }
      return item;
    }));

    await toggleChecklistSubItem(clientId, activeDeptId, parentId, subCode, newSubStatus, userName);
  };

  // Add custom item
  const handleAddCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitleEn.trim() && !customTitleAr.trim()) return;
    setIsSubmittingCustom(true);
    try {
      const en = customTitleEn.trim() || customTitleAr.trim();
      const ar = customTitleAr.trim() || customTitleEn.trim();
      const updated = await addCustomChecklistItem(
        clientId,
        activeDeptId,
        en,
        ar,
        customCategory.trim() || (isAr ? 'متطلبات خاصة' : 'Custom Requirements'),
        customNotes.trim()
      );
      setItems(updated);
      setIsAddModalOpen(false);
      setCustomTitleEn('');
      setCustomTitleAr('');
      setCustomCategory('');
      setCustomNotes('');
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  // Delete custom item
  const handleDeleteCustom = async (itemId: string) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من حذف هذا البند المخصص؟' : 'Are you sure you want to delete this custom item?')) {
      return;
    }
    setItems(prev => prev.filter(i => i.id !== itemId));
    await deleteCustomChecklistItem(clientId, activeDeptId, itemId);
  };

  // Save notes
  const handleSaveNote = async (itemId: string) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, notes: tempNote } : i));
    setEditingNoteId(null);
    await updateChecklistItemNote(clientId, activeDeptId, itemId, tempNote);
  };

  // Reset to default template
  const handleReset = async () => {
    if (!window.confirm(isAr ? 'إعادة ضبط القائمة إلى النموذج الافتراضي المعتمد لهذا القسم؟' : 'Reset checklist to official default template?')) {
      return;
    }
    setLoading(true);
    const res = await resetDepartmentChecklist(clientId, activeDeptId);
    setItems(res);
    setLoading(false);
  };

  // Print checklist
  const handlePrint = () => {
    window.print();
  };

  // Stats calculation
  const totalCount = items.length;
  const completedCount = items.filter(i => i.is_completed).length;
  const pendingCount = totalCount - completedCount;
  const percentComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filtered list
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Status filter
      if (filterMode === 'completed' && !item.is_completed) return false;
      if (filterMode === 'pending' && item.is_completed) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title_en.toLowerCase().includes(q) || item.title_ar.includes(q);
        const matchCat = (item.category || '').toLowerCase().includes(q);
        const matchNotes = (item.notes || '').toLowerCase().includes(q);
        const matchSubs = item.sub_items?.some(s => s.title_en.toLowerCase().includes(q) || s.title_ar.includes(q));
        if (!matchTitle && !matchCat && !matchNotes && !matchSubs) return false;
      }

      return true;
    });
  }, [items, filterMode, searchQuery]);

  const currentDept = DEPARTMENT_CONFIGS[activeDeptId] || DEPARTMENT_CONFIGS.audit;

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ── Top Bar: Department Badge & Controls ─────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {canSwitchDepartments ? (
          /* Manager View: Switch between the 6 operational departments */
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-400 mb-2">
              {isAr ? 'قائمة فحص ومستندات القسم:' : 'Department Document Checklist:'}
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {getAllDepartments()
                .filter(dept => ['bookkeeping', 'audit', 'tax_vat', 'income_tax', 'consultancy', 'liquidation'].includes(dept.id))
                .map(dept => {
                  const isSelected = dept.id === activeDeptId;
                  return (
                    <button
                      key={dept.id}
                      onClick={() => setActiveDeptId(dept.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-brand-dark text-white shadow-md shadow-brand-dark/20 ring-2 ring-brand-dark/20'
                          : 'bg-gray-100/80 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-gray-400'}`} />
                      {isAr ? (dept.name_ar || dept.name) : dept.name}
                    </button>
                  );
                })}
            </div>
          </div>
        ) : (
          /* Employee View: Strictly department wise - only show their assigned department */
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
              {isAr ? 'قسم العمليات المخصص:' : 'Department Checklist:'}
            </span>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand-dark text-white rounded-xl text-xs font-bold shadow-sm shadow-brand-dark/20">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>{isAr ? (currentDept?.name_ar || currentDept?.name) : currentDept?.name}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 bg-red-50 text-brand-dark border border-brand-dark/20 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={15} />
            {isAr ? 'إضافة بند مخصص' : 'Add Custom Item'}
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1.5 shadow-sm"
            title={isAr ? 'طباعة القائمة' : 'Print Checklist'}
          >
            <Printer size={15} />
            {isAr ? 'طباعة' : 'Print'}
          </button>

          <button
            onClick={handleReset}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            title={isAr ? 'استعادة النموذج الافتراضي' : 'Reset to default template'}
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* ── Progress & KPI Strip ────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-white to-gray-50/80 rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-base">
              <CheckSquare className="text-brand-dark" size={18} />
              {isAr ? `قائمة فحص ${currentDept?.name_ar || currentDept?.name}` : `${currentDept?.name} Document Checklist`}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-dark/10 text-brand-dark font-black">
                {percentComplete}%
              </span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {isAr
                ? `تم استلام ${completedCount} من أصل ${totalCount} مستند مطلوب لهذا العميل`
                : `${completedCount} of ${totalCount} documents received & verified for this client`}
            </p>
          </div>

          {/* Counts Badges */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 text-xs font-bold rounded-xl flex items-center gap-1">
              <CheckCircle2 size={13} />
              {isAr ? `${completedCount} مكتمل` : `${completedCount} Completed`}
            </span>
            <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-xl flex items-center gap-1">
              <Clock size={13} />
              {isAr ? `${pendingCount} متبقي / ناقص` : `${pendingCount} Pending`}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden p-0.5 shadow-inner">
          <div
            className="bg-gradient-to-r from-brand-dark via-red-600 to-green-500 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      {/* ── Filter & Search Toolbar ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 text-gray-400`} size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'بحث في بنود القائمة والملاحظات...' : 'Search checklist items or notes...'}
            className={`w-full ${isAr ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/10 transition-all`}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-gray-100 p-1 rounded-xl">
          {(['all', 'pending', 'completed'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterMode === mode
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {mode === 'all'
                ? (isAr ? 'الكل' : 'All')
                : mode === 'pending'
                ? (isAr ? 'المعلق / الناقص' : 'Pending')
                : (isAr ? 'المستلم / المكتمل' : 'Completed')}
            </button>
          ))}
        </div>
      </div>

      {/* ── Checklist Items List ────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center p-12 bg-white rounded-2xl border border-gray-100">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-brand-dark" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white rounded-2xl border border-gray-100 text-gray-400">
          <CheckSquare className="mx-auto mb-2 opacity-30 text-brand-dark" size={32} />
          <p className="text-sm font-semibold">{isAr ? 'لا توجد بنود مطابقة' : 'No matching checklist items'}</p>
          <p className="text-xs text-gray-400 mt-1">
            {isAr ? 'يمكنك إضافة بند مخصص عبر الزر بالأعلى' : 'You can add custom checklist requirements above'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map(item => {
            const isEditingNote = editingNoteId === item.id;
            const hasSubItems = item.sub_items && item.sub_items.length > 0;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl p-4 border transition-all ${
                  item.is_completed
                    ? 'border-green-200/80 bg-green-50/20 shadow-sm'
                    : 'border-gray-100 hover:border-gray-200 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Big Checkbox */}
                  <button
                    onClick={() => handleToggle(item)}
                    className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                      item.is_completed
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'border-2 border-gray-300 hover:border-brand-dark bg-white'
                    }`}
                  >
                    {item.is_completed && <CheckCircle2 size={16} />}
                  </button>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {/* Number & Category */}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {item.item_number && (
                            <span className="w-5 h-5 rounded-md bg-gray-100 text-gray-600 font-bold text-[10px] flex items-center justify-center">
                              {item.item_number}
                            </span>
                          )}
                          {item.category && (
                            <span className="text-[10px] uppercase font-extrabold tracking-wider text-gray-400">
                              {item.category}
                            </span>
                          )}
                          {item.is_custom && (
                            <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-bold">
                              {isAr ? 'بند مخصص' : 'Custom Item'}
                            </span>
                          )}
                        </div>

                        {/* Title Bilingual */}
                        <h4 className={`text-sm font-bold leading-relaxed ${
                          item.is_completed ? 'text-gray-900 line-through decoration-green-500/50' : 'text-gray-800'
                        }`}>
                          {isAr ? item.title_ar : item.title_en}
                        </h4>
                        {/* Secondary language subtitle */}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {isAr ? item.title_en : item.title_ar}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            if (isEditingNote) {
                              setEditingNoteId(null);
                            } else {
                              setEditingNoteId(item.id);
                              setTempNote(item.notes || '');
                            }
                          }}
                          className={`p-1.5 rounded-lg text-xs transition-colors ${
                            item.notes
                              ? 'text-brand-dark bg-red-50 hover:bg-red-100'
                              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                          }`}
                          title={isAr ? 'ملاحظة تشغيلية' : 'Item note'}
                        >
                          <Edit3 size={14} />
                        </button>

                        {item.is_custom && (
                          <button
                            onClick={() => handleDeleteCustom(item.id)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={isAr ? 'حذف البند المخصص' : 'Delete custom item'}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Sub-items (if present, like Audit Item 7 with A-F) */}
                    {hasSubItems && (
                      <div className="mt-3 ps-2 sm:ps-4 border-s-2 border-gray-200 space-y-2 py-1">
                        <div className="text-[11px] font-bold text-gray-500 mb-1.5 flex items-center gap-1">
                          <Info size={12} className="text-brand-dark" />
                          {isAr ? 'المستندات الفرعية المطلوبة:' : 'Detailed sub-documents breakdown:'}
                        </div>
                        {item.sub_items!.map(sub => (
                          <div
                            key={sub.code}
                            onClick={() => handleToggleSub(item.id, sub.code, sub.is_completed)}
                            className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all ${
                              sub.is_completed
                                ? 'bg-green-50/60 border border-green-200 text-green-900'
                                : 'bg-gray-50 hover:bg-gray-100 border border-transparent text-gray-700'
                            }`}
                          >
                            <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                              sub.is_completed
                                ? 'bg-green-600 text-white'
                                : 'border border-gray-300 bg-white text-gray-600'
                            }`}>
                              {sub.is_completed ? '✓' : sub.code}
                            </span>
                            <span className="text-xs font-semibold">
                              <span className="font-bold me-1">[{sub.code}]</span>
                              {isAr ? sub.title_ar : sub.title_en}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Completion Tag & Timestamp */}
                    {item.is_completed && item.completed_at && (
                      <div className="mt-2 text-[11px] text-green-700 flex items-center gap-1.5 font-medium">
                        <CheckCircle2 size={12} />
                        <span>
                          {isAr
                            ? `تم الاستلام في ${new Date(item.completed_at).toLocaleDateString('ar-OM', { year: 'numeric', month: 'short', day: 'numeric' })} بواسطة ${item.completed_by_name || userName}`
                            : `Received on ${new Date(item.completed_at).toLocaleDateString('en-GB')} by ${item.completed_by_name || userName}`}
                        </span>
                      </div>
                    )}

                    {/* Operational Note Display */}
                    {item.notes && !isEditingNote && (
                      <div className="mt-2 p-2 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                        <FileText size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{item.notes}</span>
                      </div>
                    )}

                    {/* Inline Note Editor */}
                    {isEditingNote && (
                      <div className="mt-2.5 p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                        <label className="block text-[11px] font-bold text-gray-600">
                          {isAr ? 'ملاحظة تشغيلية على المستند (مثال: بانتظار النسخة الأصلية يوم الأحد):' : 'Operational Note / Remark:'}
                        </label>
                        <input
                          type="text"
                          value={tempNote}
                          onChange={e => setTempNote(e.target.value)}
                          placeholder={isAr ? 'اكتب ملاحظتك هنا...' : 'Enter document remark...'}
                          className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-brand-dark"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setEditingNoteId(null)}
                            className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700"
                          >
                            {isAr ? 'إلغاء' : 'Cancel'}
                          </button>
                          <button
                            onClick={() => handleSaveNote(item.id)}
                            className="px-3 py-1 bg-brand-dark text-white rounded-lg text-xs font-bold hover:bg-red-800 transition-colors"
                          >
                            {isAr ? 'حفظ الملاحظة' : 'Save Note'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Add Custom Checklist Item ────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <Plus size={18} className="text-brand-dark" />
                {isAr ? 'إضافة بند مخصص لقائمة العميل' : 'Add Custom Checklist Requirement'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {isAr ? 'اسم المستند / البند (بالعربية)' : 'Document / Item Title (Arabic)'}
                </label>
                <input
                  type="text"
                  value={customTitleAr}
                  onChange={e => setCustomTitleAr(e.target.value)}
                  placeholder={isAr ? 'مثال: نسخة من خطاب التنازل الموثق' : 'e.g. Attested Waiver Letter'}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-dark"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {isAr ? 'اسم المستند / البند (بالإنجليزية)' : 'Document / Item Title (English)'}
                </label>
                <input
                  type="text"
                  value={customTitleEn}
                  onChange={e => setCustomTitleEn(e.target.value)}
                  placeholder="e.g. Attested Waiver Letter from Landlord"
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-dark"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {isAr ? 'التصنيف / المرحلة' : 'Category / Classification'}
                </label>
                <input
                  type="text"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  placeholder={isAr ? 'مثال: عقود خاصة أو موافقات بنكية' : 'e.g. Special Contracts, Bank Approvals'}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {isAr ? 'ملاحظة أولية (اختياري)' : 'Initial Note / Instructions (Optional)'}
                </label>
                <textarea
                  rows={2}
                  value={customNotes}
                  onChange={e => setCustomNotes(e.target.value)}
                  placeholder={isAr ? 'أي توجيهات أو تفاصيل حول هذا المستند...' : 'Any remarks or requirements for this item...'}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-dark resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCustom}
                  className="px-5 py-2.5 bg-brand-dark text-white rounded-xl text-xs font-bold hover:bg-red-800 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmittingCustom ? (isAr ? 'جاري الإضافة...' : 'Adding...') : (isAr ? 'حفظ البند في القائمة' : 'Add to Checklist')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

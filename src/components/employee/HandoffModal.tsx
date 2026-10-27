import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Share2, CheckCircle2, AlertCircle, ArrowRight, Building2, Send } from 'lucide-react';
import { getAllDepartments, getDepartmentById } from '../../config/departments';
import { createDepartmentHandoff } from '../../services/departmentService';

interface HandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceDeptId: string;
  clientName: string;
  clientId?: string;
  serviceName: string;
  serviceId?: string;
  onSuccess?: () => void;
}

export const HandoffModal: React.FC<HandoffModalProps> = ({
  isOpen,
  onClose,
  sourceDeptId,
  clientName,
  clientId,
  serviceName,
  serviceId,
  onSuccess
}) => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const sourceDept = getDepartmentById(sourceDeptId);
  const allDepts = getAllDepartments().filter(d => d.id !== sourceDeptId && d.id !== 'management');

  // Default target department based on common workflows
  const defaultTarget = sourceDeptId === 'bookkeeping' 
    ? 'tax_vat' 
    : sourceDeptId === 'liquidation'
    ? 'tax_vat'
    : allDepts[0]?.id || 'tax_vat';

  const [targetDeptId, setTargetDeptId] = useState<string>(defaultTarget);
  const [priority, setPriority] = useState<'normal' | 'urgent' | 'low'>('normal');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const targetDept = getDepartmentById(targetDeptId);
    await createDepartmentHandoff({
      source_department_id: sourceDeptId,
      target_department_id: targetDeptId,
      client_id: clientId,
      service_id: serviceId,
      service_name: serviceName,
      notes: notes || `Work handed off from ${sourceDept?.name || sourceDeptId} for ${clientName}`,
      priority
    });

    setSubmitting(false);
    setSuccessNotice(
      isAr 
        ? `تم إرسال التحويل بنجاح إلى قسم (${targetDept?.name_ar || targetDept?.name})`
        : `Successfully handed off to ${targetDept?.name} department!`
    );

    setTimeout(() => {
      setSuccessNotice(null);
      onSuccess?.();
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden my-6"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-red-50 to-orange-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#A11212] text-white flex items-center justify-center font-black shadow-md shadow-[#A11212]/20">
              <Share2 size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900">
                {isAr ? 'تحويل المعاملة إلى قسم آخر (اختياري)' : 'Cross-Department Handoff (Optional)'}
              </h3>
              <p className="text-[11px] text-gray-500">
                {isAr ? 'ربط المعاملة بالقسم التالي لمتابعة العمليات' : 'Pass the file to the next department to continue workflow'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success Banner */}
        {successNotice && (
          <div className="bg-emerald-500 text-white text-xs font-bold px-5 py-2.5 flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{successNotice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Work details summary */}
          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">{isAr ? 'العميل:' : 'Client:'}</span>
              <span className="font-bold text-gray-900">{clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{isAr ? 'الخدمة الحالية:' : 'Service:'}</span>
              <span className="font-bold text-gray-900">{serviceName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{isAr ? 'القسم المرسِل:' : 'From Dept:'}</span>
              <span className="font-bold text-[#A11212]">{sourceDept?.name_ar || sourceDept?.name}</span>
            </div>
          </div>

          {/* Target Department Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              {isAr ? 'اختر القسم المستلم للعملية *' : 'Target Receiving Department *'}
            </label>
            <select
              value={targetDeptId}
              onChange={(e) => setTargetDeptId(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#A11212]"
            >
              {allDepts.map(d => (
                <option key={d.id} value={d.id}>
                  {isAr ? d.name_ar || d.name : d.name} ({d.head_title})
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              {isAr ? 'درجة الأولوية' : 'Priority Level'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'normal', 'urgent'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    priority === p 
                      ? p === 'urgent' 
                        ? 'bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-200' 
                        : 'bg-red-50 border-red-300 text-[#A11212] ring-2 ring-red-100'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p === 'urgent' 
                    ? (isAr ? 'عاجل جداً' : 'Urgent') 
                    : p === 'normal' 
                    ? (isAr ? 'عادي' : 'Normal') 
                    : (isAr ? 'منخفض' : 'Low')}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              {isAr ? 'ملاحظات أو تعليمات للقسم المستلم' : 'Handoff Notes & Instructions'}
            </label>
            <textarea
              rows={3}
              placeholder={isAr 
                ? 'مثال: تم إغلاق وتدقيق حسابات الشهر بالكامل، جاهزة لرفع إقرار الربع الثاني...' 
                : 'e.g., Monthly books closed and reconciled, ready for Q2 VAT filing...'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#A11212]"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-[#A11212] hover:bg-red-800 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Send size={14} />
              <span>{submitting ? (isAr ? 'جاري التحويل...' : 'Sending...') : (isAr ? 'تأكيد التحويل للقسم' : 'Send Handoff')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HandoffModal;

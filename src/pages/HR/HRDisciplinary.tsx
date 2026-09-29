import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import {
  AlertOctagon, Gift, Award, PlusCircle, CheckCircle2, Trash2, Calendar, FileText, ArrowUpRight, ArrowDownLeft, X, AlertTriangle, Download, Loader2
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface EmployeeProfile {
  id: string;
  name: string;
  role: string;
  dept: string;
}

interface RecordItem {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'Reward' | 'Disciplinary';
  actionType: 'Written Warning' | 'Verbal Warning' | 'Salary Deduction' | 'Suspension' | 'Cash Bonus' | 'Appreciation Letter' | 'Employee of the Month';
  reason: string;
  amountOrPenalty?: string;
  date: string;
  issuedBy: string;
}

export default function HRDisciplinary() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'rewards' | 'disciplinary'>('all');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [newRecord, setNewRecord] = useState({
    employeeId: '',
    type: 'Reward' as RecordItem['type'],
    actionType: 'Cash Bonus' as RecordItem['actionType'],
    reason: '',
    amountOrPenalty: '',
    issuedBy: 'Executive HR Management'
  });

  // ── 1. Fetch live records & employees ──────────────────────────────────────
  const fetchDisciplinaryData = useCallback(async () => {
    try {
      setLoading(true);

      const [{ data: profData }, { data: hrData }, { data: discData }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('hr_employees').select('id, full_name, email, role, dept, disciplinaries, bonuses'),
        supabase.from('hr_disciplinary').select('*').order('created_at', { ascending: false })
      ]);

      const empMap = new Map<string, EmployeeProfile>();
      (profData || []).filter(p => p.role !== 'client').forEach(p => {
        empMap.set(p.id, {
          id: p.id,
          name: p.full_name || p.email?.split('@')[0] || 'Staff Member',
          role: p.role || 'Employee',
          dept: p.department_id || p.department || 'General'
        });
      });

      (hrData || []).forEach(h => {
        if (!empMap.has(h.id)) {
          empMap.set(h.id, {
            id: h.id,
            name: h.full_name || 'Staff Member',
            role: h.role || 'Employee',
            dept: h.dept || 'General'
          });
        }
      });

      const empList = Array.from(empMap.values());
      setEmployees(empList);

      if (empList.length > 0 && !newRecord.employeeId) {
        setNewRecord(prev => ({ ...prev, employeeId: empList[0].id }));
      }

      // Parse DB records
      const parsedRecords: RecordItem[] = (discData || []).map((d: any) => {
        const emp = empMap.get(d.employee_id);
        return {
          id: d.id,
          employeeId: d.employee_id,
          employeeName: emp ? emp.name : 'Staff Member',
          type: d.type,
          actionType: d.action_type,
          reason: d.reason,
          amountOrPenalty: d.amount_or_penalty || 'N/A',
          date: d.record_date || (d.created_at ? d.created_at.split('T')[0] : 'Today'),
          issuedBy: d.issued_by || 'HR Management'
        };
      });

      // Default mock fallback if DB table is empty
      if (parsedRecords.length === 0 && empList.length > 0) {
        empList.slice(0, 3).forEach((emp, i) => {
          if (i === 0) {
            parsedRecords.push({
              id: 'REC-1001',
              employeeId: emp.id,
              employeeName: emp.name,
              type: 'Disciplinary',
              actionType: 'Written Warning',
              reason: 'Repeated unexcused late arrivals beyond the 15-minute grace period.',
              amountOrPenalty: 'Warning Record',
              date: '2026-06-15',
              issuedBy: 'Executive HR Management'
            });
          } else {
            parsedRecords.push({
              id: `REC-100${i + 1}`,
              employeeId: emp.id,
              employeeName: emp.name,
              type: 'Reward',
              actionType: i === 1 ? 'Cash Bonus' : 'Employee of the Month',
              reason: i === 1 ? 'Exemplary dedication during quarterly audit closing.' : 'Recognized for top client feedback.',
              amountOrPenalty: i === 1 ? '500 OMR' : 'Certificate',
              date: '2026-06-25',
              issuedBy: 'Executive HR Management'
            });
          }
        });
      }

      setRecords(parsedRecords);
      localStorage.setItem('hr_disciplinary_cache', JSON.stringify(parsedRecords));
    } catch (err) {
      console.error('Error fetching disciplinary data:', err);
    } finally {
      setLoading(false);
    }
  }, [newRecord.employeeId]);

  useEffect(() => {
    fetchDisciplinaryData();

    const channel = supabase
      .channel('hr_disciplinary_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_disciplinary' }, () => fetchDisciplinaryData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDisciplinaryData]);

  // ── 2. Handle Create Record ────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecord.employeeId) return;

    setSubmitting(true);
    const selectedEmp = employees.find(e => e.id === newRecord.employeeId);
    const today = new Date().toISOString().split('T')[0];

    const tempRec: RecordItem = {
      id: `REC-${Math.floor(1000 + Math.random() * 1000)}`,
      employeeId: newRecord.employeeId,
      employeeName: selectedEmp?.name || 'Staff Member',
      type: newRecord.type,
      actionType: newRecord.actionType,
      reason: newRecord.reason,
      amountOrPenalty: newRecord.amountOrPenalty || 'N/A',
      date: today,
      issuedBy: newRecord.issuedBy
    };

    try {
      const { data, error } = await supabase
        .from('hr_disciplinary')
        .insert({
          employee_id: newRecord.employeeId,
          type: newRecord.type,
          action_type: newRecord.actionType,
          reason: newRecord.reason,
          amount_or_penalty: newRecord.amountOrPenalty || null,
          record_date: today,
          issued_by: newRecord.issuedBy
        })
        .select()
        .single();

      if (!error && data) {
        tempRec.id = data.id;
      }
    } catch (err) {
      console.warn('Direct hr_disciplinary DB insert notice:', err);
    }

    const nextRecords = [tempRec, ...records];
    setRecords(nextRecords);
    localStorage.setItem('hr_disciplinary_cache', JSON.stringify(nextRecords));

    setShowModal(false);
    setNewRecord(prev => ({
      ...prev,
      reason: '',
      amountOrPenalty: ''
    }));
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    localStorage.setItem('hr_disciplinary_cache', JSON.stringify(updated));

    try {
      await supabase.from('hr_disciplinary').delete().eq('id', id);
    } catch (err) {
      console.warn('DB delete notice for hr_disciplinary:', err);
    }
  };

  const downloadDisciplinaryLetter = (rec: RecordItem) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const isReward = rec.type === 'Reward';
    const brandColor = isReward ? [16, 149, 193] : [161, 18, 18];
    const charcoal = [26, 26, 26];
    const grayText = [110, 110, 110];
    const bgLight = [249, 249, 249];

    // 1. Accent Bar
    doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.rect(0, 0, 210, 8, 'F');

    // Title / Corporate Brand
    doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('MAISARAH GROUP', 14, 24);

    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Human Resources & Compliance Department | Muscat, Sultanate of Oman', 14, 29);

    // Letter Type
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(isReward ? 'OFFICIAL RECOGNITION & REWARD' : 'FORMAL DISCIPLINARY NOTICE', 120, 24);

    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFontSize(9);
    doc.text(`Ref: ${rec.id} | Date: ${rec.date}`, 120, 29);

    // Separator Line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(14, 34, 196, 34);

    // Recipient Details Card
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(14, 40, 182, 26, 3, 3, 'FD');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.text('RECIPIENT EMPLOYEE:', 20, 48);
    doc.text('ACTION / CLASSIFICATION:', 20, 56);

    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.text(rec.employeeName, 75, 48);
    doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.text(`${rec.actionType} (${rec.amountOrPenalty || 'N/A'})`, 75, 56);

    // Body
    let y = 78;
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(isReward ? 'Commendation & Appreciation Statement:' : 'Statement of Facts & Disciplinary Grounds:', 14, y);

    y += 8;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    const splitReason = doc.splitTextToSize(rec.reason, 180);
    doc.text(splitReason, 14, y);

    y += (splitReason.length * 6) + 14;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Regulatory Context & Authority:', 14, y);

    y += 6;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    const legalNotice = isReward
      ? 'This commendation is recorded in the employee personal folder in recognition of excellent contributions to corporate standards.'
      : 'This notice is issued under the executive management code and Oman Labor Law compliance guidelines. Future occurrences may result in escalated disciplinary tiers.';
    doc.text(doc.splitTextToSize(legalNotice, 180), 14, y);

    // Signatures Block
    y = 230;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, 75, y);
    doc.line(135, y, 196, y);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.text('Issued By:', 14, y + 6);
    doc.text('Employee Acknowledgment:', 135, y + 6);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.text(rec.issuedBy, 14, y + 11);
    doc.text(rec.employeeName, 135, y + 11);

    doc.save(`${isReward ? 'Commendation' : 'Disciplinary'}_Letter_${rec.employeeName.replace(/\s+/g, '_')}.pdf`);
  };

  const filteredRecords = records.filter(rec => {
    if (activeTab === 'rewards') return rec.type === 'Reward';
    if (activeTab === 'disciplinary') return rec.type === 'Disciplinary';
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <AlertOctagon className="text-[#A11212]" size={24} />
            {isAr ? 'الجزاءات والمكافآت' : 'Disciplinary & Reward Management'}
          </h2>
          <p className="text-xs text-gray-500 font-bold">
            {isAr ? 'إدارة الإنذارات، الخصومات، وشهادات التقدير والمكافآت' : 'Manage formal warnings, penalties, bonuses, and commendations'}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#A11212] text-white text-xs font-black uppercase tracking-wider px-4.5 py-3 rounded-xl flex items-center gap-1.5 hover:bg-[#800e0e] shadow-sm transition-all"
        >
          <PlusCircle size={16} /> {isAr ? 'إصدار قرار جديد' : 'Issue New Action'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-100 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
            activeTab === 'all' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          {isAr ? 'جميع السجلات' : 'All Records'} ({records.length})
        </button>
        <button
          onClick={() => setActiveTab('rewards')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
            activeTab === 'rewards' ? 'bg-green-700 text-white' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          {isAr ? 'المكافآت والتقدير' : 'Rewards & Recognition'} ({records.filter(r => r.type === 'Reward').length})
        </button>
        <button
          onClick={() => setActiveTab('disciplinary')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
            activeTab === 'disciplinary' ? 'bg-[#A11212] text-white' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          {isAr ? 'الإنذارات والجزاءات' : 'Disciplinary Actions'} ({records.filter(r => r.type === 'Disciplinary').length})
        </button>
      </div>

      {/* Records List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
            <Loader2 size={28} className="animate-spin text-[#A11212] mx-auto mb-2" />
            <p className="text-xs font-bold">{isAr ? 'جاري تحميل السجلات...' : 'Syncing records...'}</p>
          </div>
        ) : (
          <>
            {filteredRecords.map(rec => {
              const isReward = rec.type === 'Reward';
              return (
                <div key={rec.id} className="bg-white border border-gray-150 rounded-2xl p-5 shadow-xs hover:border-gray-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        isReward ? 'bg-green-50 text-green-700 border border-green-150' : 'bg-red-50 text-red-700 border border-red-150'
                      }`}>
                        {rec.actionType}
                      </span>
                      <h4 className="font-black text-sm text-gray-900">{rec.employeeName}</h4>
                      {rec.amountOrPenalty && rec.amountOrPenalty !== 'N/A' && (
                        <span className="bg-gray-100 text-gray-700 text-[10px] font-black px-2 py-0.5 rounded">
                          {rec.amountOrPenalty}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-650 font-medium leading-relaxed">{rec.reason}</p>
                    <div className="flex items-center gap-3 text-[10px] text-gray-400 font-bold pt-1">
                      <span>{isAr ? 'التاريخ:' : 'Date:'} {rec.date}</span>
                      <span>·</span>
                      <span>{isAr ? 'صادر عن:' : 'Issued by:'} {rec.issuedBy}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => downloadDisciplinaryLetter(rec)}
                      className="bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5"
                    >
                      <Download size={13} /> {isAr ? 'تحميل الخطاب PDF' : 'Download Letter'}
                    </button>
                    <button
                      onClick={() => handleDelete(rec.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-50 transition-colors"
                      title={isAr ? 'حذف' : 'Delete'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredRecords.length === 0 && (
              <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                <CheckCircle2 size={32} className="mx-auto mb-2 opacity-20 text-green-600" />
                <p className="font-bold text-sm">{isAr ? 'لا توجد سجلات مسجلة في هذا القسم' : 'No records found in this category.'}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                {isAr ? 'إصدار قرار مكافأة أو جزاء' : 'Issue New Reward / Disciplinary Action'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'اختيار الموظف' : 'Select Employee'}
                </label>
                <select
                  value={newRecord.employeeId}
                  onChange={(e) => setNewRecord({ ...newRecord, employeeId: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.dept} - {emp.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'النوع العام' : 'Category'}
                  </label>
                  <select
                    value={newRecord.type}
                    onChange={(e) => {
                      const t = e.target.value as RecordItem['type'];
                      setNewRecord({
                        ...newRecord,
                        type: t,
                        actionType: t === 'Reward' ? 'Cash Bonus' : 'Written Warning'
                      });
                    }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  >
                    <option value="Reward">{isAr ? 'مكافأة وتقدير (Reward)' : 'Reward'}</option>
                    <option value="Disciplinary">{isAr ? 'جزاء أو إنذار (Disciplinary)' : 'Disciplinary'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'الإجراء التفصيلي' : 'Action Type'}
                  </label>
                  <select
                    value={newRecord.actionType}
                    onChange={(e) => setNewRecord({ ...newRecord, actionType: e.target.value as any })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  >
                    {newRecord.type === 'Reward' ? (
                      <>
                        <option value="Cash Bonus">Cash Bonus (مكافأة نقدية)</option>
                        <option value="Appreciation Letter">Appreciation Letter (خطاب شكر وتقدير)</option>
                        <option value="Employee of the Month">Employee of the Month (موظف الشهر)</option>
                      </>
                    ) : (
                      <>
                        <option value="Written Warning">Written Warning (إنذار كتابي)</option>
                        <option value="Verbal Warning">Verbal Warning (تنبيه شفهي)</option>
                        <option value="Salary Deduction">Salary Deduction (خصم من الراتب)</option>
                        <option value="Suspension">Suspension (إيقاف مؤقت)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'المبلغ أو نوع الجزاء' : 'Amount / Penalty (Optional)'}
                </label>
                <input
                  type="text"
                  value={newRecord.amountOrPenalty}
                  onChange={(e) => setNewRecord({ ...newRecord, amountOrPenalty: e.target.value })}
                  placeholder={newRecord.type === 'Reward' ? 'e.g. 300 OMR or Gold Medal' : 'e.g. 50 OMR Deduction or 1st Warning'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'الأسباب والمبررات' : 'Reason / Facts'}
                </label>
                <textarea
                  required
                  value={newRecord.reason}
                  onChange={(e) => setNewRecord({ ...newRecord, reason: e.target.value })}
                  placeholder="Provide comprehensive details and factual grounds for this decision..."
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212] resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-200 transition-colors"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#A11212] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#800e0e] transition-colors flex items-center justify-center gap-1.5"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {isAr ? 'إصدار القرار' : 'Issue Decision'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

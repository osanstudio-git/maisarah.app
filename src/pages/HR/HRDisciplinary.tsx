import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertOctagon, Gift, Award, PlusCircle, CheckCircle2, Trash2, Calendar, FileText, ArrowUpRight, ArrowDownLeft, X, AlertTriangle, Download
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface RecordItem {
  id: string;
  employeeName: string;
  type: 'Reward' | 'Disciplinary';
  actionType: 'Written Warning' | 'Verbal Warning' | 'Salary Deduction' | 'Suspension' | 'Cash Bonus' | 'Appreciation Letter' | 'Employee of the Month';
  reason: string;
  amountOrPenalty?: string; // e.g. "50 OMR Deduction" or "300 OMR Bonus"
  date: string;
  issuedBy: string;
}

const INITIAL_RECORDS: RecordItem[] = [
  {
    id: 'REC-1001',
    employeeName: 'Sara Al-Balushi',
    type: 'Disciplinary',
    actionType: 'Written Warning',
    reason: 'Repeated unexcused late arrivals beyond the 15-minute grace period.',
    amountOrPenalty: 'Warning Record',
    date: '2026-06-15',
    issuedBy: 'Fatma Al-Harthy'
  },
  {
    id: 'REC-1002',
    employeeName: 'Ahmed Al-Kharusi',
    type: 'Reward',
    actionType: 'Cash Bonus',
    reason: 'Exemplary dedication during the Q2 external banking audit process.',
    amountOrPenalty: '500 OMR',
    date: '2026-06-25',
    issuedBy: 'Fatma Al-Harthy'
  },
  {
    id: 'REC-1003',
    employeeName: 'Ahmed Al-Kharusi',
    type: 'Reward',
    actionType: 'Employee of the Month',
    reason: 'Recognized for excellent client feedback and compliance performance.',
    amountOrPenalty: 'Certificate',
    date: '2026-05-30',
    issuedBy: 'Fatma Al-Harthy'
  }
];

export default function HRDisciplinary() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [records, setRecords] = useState<RecordItem[]>(INITIAL_RECORDS);
  const [activeTab, setActiveTab] = useState<'all' | 'rewards' | 'disciplinary'>('all');
  const [showModal, setShowModal] = useState(false);

  const [newRecord, setNewRecord] = useState({
    employeeName: 'Ahmed Al-Kharusi',
    type: 'Reward' as RecordItem['type'],
    actionType: 'Cash Bonus' as RecordItem['actionType'],
    reason: '',
    amountOrPenalty: '',
    issuedBy: 'Fatma Al-Harthy'
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const rec: RecordItem = {
      id: `REC-${Math.floor(1000 + Math.random() * 1000)}`,
      employeeName: newRecord.employeeName,
      type: newRecord.type,
      actionType: newRecord.actionType,
      reason: newRecord.reason,
      amountOrPenalty: newRecord.amountOrPenalty || 'N/A',
      date: new Date().toISOString().split('T')[0],
      issuedBy: newRecord.issuedBy
    };
    setRecords([rec, ...records]);
    setShowModal(false);
    setNewRecord({
      employeeName: 'Ahmed Al-Kharusi',
      type: 'Reward',
      actionType: 'Cash Bonus',
      reason: '',
      amountOrPenalty: '',
      issuedBy: 'Fatma Al-Harthy'
    });
  };

  const downloadDisciplinaryLetter = (rec: RecordItem) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const isReward = rec.type === 'Reward';
    const brandRed = [161, 18, 18];       // #A11212
    const charcoal = [26, 26, 26];         // #1A1A1A
    const grayText = [110, 110, 110];      // #6E6E6E
    const bgCard = isReward ? [240, 248, 240] : [255, 245, 245]; // Greenish or Pinkish container background

    // 1. Header Accent Bar
    doc.setFillColor(isReward ? 46 : brandRed[0], isReward ? 117 : brandRed[1], isReward ? 89 : brandRed[2]);
    doc.rect(0, 0, 210, 8, 'F');

    // Title / Corporate Brand
    doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('MAISARAH GROUP', 14, 24);

    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Corporate HR Services Portal | Muscat, Sultanate of Oman', 14, 29);

    // Document Type
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(isReward ? 'CORPORATE REWARD RECORD' : 'DISCIPLINARY ACTION LETTER', 115, 24);

    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFontSize(9);
    doc.text(`Ref: ${rec.id}`, 115, 29);

    // Separator line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(14, 33, 196, 33);

    // Date
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Date: ${rec.date}`, 14, 42);

    // 2. Recipient Block
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('To:', 14, 52);
    doc.setFont('Helvetica', 'bold');
    doc.text(rec.employeeName, 22, 52);
    doc.setFont('Helvetica', 'normal');
    doc.text('Employee Group Member', 22, 57);

    // Subject Line
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(isReward ? 46 : brandRed[0], isReward ? 117 : brandRed[1], isReward ? 89 : brandRed[2]);
    const subject = isReward
      ? `SUBJECT: OFFICIAL APPRECIATION & REWARD (${rec.actionType.toUpperCase()})`
      : `SUBJECT: FORMAL DISCIPLINARY STATEMENT (${rec.actionType.toUpperCase()})`;
    doc.text(subject, 14, 70);

    // Underline subject
    doc.setDrawColor(isReward ? 46 : brandRed[0], isReward ? 117 : brandRed[1], isReward ? 89 : brandRed[2]);
    doc.setLineWidth(0.6);
    doc.line(14, 72, 196, 72);

    // 3. Body Text Context
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);

    let bodyParagraphs: string[] = [];
    if (isReward) {
      bodyParagraphs = [
        `We are writing this letter to formally recognize and appreciate your outstanding performance and dedication at Maisarah Group. The management has registered a rewarding action in your record.`,
        `Reason / Justification for Reward:`,
        `"${rec.reason}"`,
        `Corporate Action Taken:`,
        `The company has officially awarded you: ${rec.amountOrPenalty}. This milestone has been filed under your employee dossier as a testament to your professional excellence.`
      ];
    } else {
      bodyParagraphs = [
        `This letter serves as a formal notification regarding disciplinary violations reported and verified under Omani Labor Law and corporate compliance rules.`,
        `Reason / Violation Circumstance:`,
        `"${rec.reason}"`,
        `Corporate Disciplinary Action Taken:`,
        `The company has formally issued: ${rec.actionType} (${rec.amountOrPenalty}). Please be advised that continued infractions or failure to perform to requirements will result in progressive disciplinary actions, up to and including employment separation.`
      ];
    }

    let currentY = 82;
    bodyParagraphs.forEach((para) => {
      // Split text to fit page width
      const splitText = doc.splitTextToSize(para, 180);
      if (para.startsWith('"')) {
        // Draw indent box for quotes/justification
        doc.setFillColor(bgCard[0], bgCard[1], bgCard[2]);
        const boxHeight = (splitText.length * 5) + 6;
        doc.rect(14, currentY - 2, 182, boxHeight, 'F');
        doc.setFont('Helvetica', 'italic');
        doc.text(splitText, 18, currentY + 3);
        doc.setFont('Helvetica', 'normal');
        currentY += boxHeight + 6;
      } else {
        doc.text(splitText, 14, currentY);
        currentY += (splitText.length * 5) + 5;
      }
    });

    // 4. Sign-off signatures
    currentY = Math.max(currentY + 20, 180);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.4);
    
    // HR signature line
    doc.line(14, currentY, 80, currentY);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Issued By HR Admin:', 14, currentY + 5);
    doc.setFont('Helvetica', 'bold');
    doc.text(rec.issuedBy, 14, currentY + 10);
    doc.setFont('Helvetica', 'normal');
    doc.text('Maisarah Group HR Director', 14, currentY + 14);

    // Recipient signature line
    doc.line(130, currentY, 196, currentY);
    doc.text('Employee Acknowledgement:', 130, currentY + 5);
    doc.setFont('Helvetica', 'italic');
    doc.text('Signature & Date', 130, currentY + 10);

    // Save PDF
    doc.save(`${isReward ? 'Reward' : 'Disciplinary'}_Letter_${rec.employeeName.replace(/\s+/g, '_')}_${rec.id}.pdf`);
  };

  const filteredRecords = records.filter(r => {
    if (activeTab === 'rewards') return r.type === 'Reward';
    if (activeTab === 'disciplinary') return r.type === 'Disciplinary';
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <AlertOctagon className="text-[#A11212]" size={24} />
            {isAr ? 'الجزاءات والمكافآت' : 'Disciplinaries & Corporate Rewards'}
          </h2>
          <p className="text-xs text-gray-500 font-bold">
            {isAr ? 'توثيق سجل المكافآت والجزاءات التأديبية للموظفين' : 'Document and log employee warnings, disciplinary reviews, and awards'}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#A11212] text-white text-xs font-black uppercase tracking-wider px-4.5 py-3 rounded-xl flex items-center gap-1.5 hover:bg-[#800e0e] shadow-sm transition-all"
        >
          <PlusCircle size={16} /> {isAr ? 'تسجيل إجراء جديد' : 'Issue New Action'}
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-gray-100 gap-4 py-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-2 text-xs font-black uppercase tracking-wider ${activeTab === 'all' ? 'text-[#A11212] border-b-2 border-[#A11212]' : 'text-gray-400'}`}
        >
          All Actions
        </button>
        <button
          onClick={() => setActiveTab('rewards')}
          className={`pb-2 text-xs font-black uppercase tracking-wider ${activeTab === 'rewards' ? 'text-green-700 border-b-2 border-green-700' : 'text-gray-400'}`}
        >
          Rewards & Bonuses
        </button>
        <button
          onClick={() => setActiveTab('disciplinary')}
          className={`pb-2 text-xs font-black uppercase tracking-wider ${activeTab === 'disciplinary' ? 'text-red-700 border-b-2 border-red-700' : 'text-gray-400'}`}
        >
          Disciplinary Records
        </button>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredRecords.map(rec => {
          const isReward = rec.type === 'Reward';
          return (
            <div key={rec.id} className={`border rounded-2xl p-5 hover:border-gray-300 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
              isReward ? 'bg-green-50/10 border-green-100' : 'bg-red-50/10 border-red-100'
            }`}>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-black text-sm text-gray-900">{rec.employeeName}</h4>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                    isReward ? 'bg-green-50 text-green-700 border-green-150' : 'bg-red-50 text-red-700 border-red-150'
                  }`}>
                    {rec.actionType}
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold">#{rec.id}</span>
                </div>
                <p className="text-xs text-gray-600 font-medium">{rec.reason}</p>
                <div className="flex gap-4 text-[10px] text-gray-400 font-bold pt-1">
                  <span>Issued By: {rec.issuedBy}</span>
                  <span>Date: {rec.date}</span>
                </div>
              </div>

              <div className="text-end flex flex-col items-end gap-2">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{isReward ? 'Award/Value' : 'Penalty/Deduction'}</p>
                  <p className={`text-base font-black ${isReward ? 'text-green-700' : 'text-red-650'}`}>
                    {isReward ? <ArrowUpRight size={14} className="inline mr-0.5" /> : <ArrowDownLeft size={14} className="inline mr-0.5" />}
                    {rec.amountOrPenalty}
                  </p>
                </div>
                {(rec.actionType === 'Written Warning' || rec.actionType === 'Appreciation Letter' || rec.actionType === 'Verbal Warning' || rec.actionType === 'Suspension') && (
                  <button
                    onClick={() => downloadDisciplinaryLetter(rec)}
                    className="bg-gray-900 hover:bg-gray-800 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all shadow-xs"
                  >
                    <Download size={10} /> Letter PDF
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filteredRecords.length === 0 && (
          <p className="text-center text-xs text-gray-400 py-8">No records registered under this category.</p>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Log Action Review</h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Employee Name</label>
                  <select
                    value={newRecord.employeeName}
                    onChange={(e) => setNewRecord({ ...newRecord, employeeName: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  >
                    <option value="Ahmed Al-Kharusi">Ahmed Al-Kharusi</option>
                    <option value="Sara Al-Balushi">Sara Al-Balushi</option>
                    <option value="Mohammed Maamari">Mohammed Maamari</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Action Category</label>
                  <select
                    value={newRecord.type}
                    onChange={(e) => {
                      const val = e.target.value as RecordItem['type'];
                      setNewRecord({
                        ...newRecord,
                        type: val,
                        actionType: val === 'Reward' ? 'Cash Bonus' : 'Written Warning'
                      });
                    }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  >
                    <option value="Reward">Reward / Bonus</option>
                    <option value="Disciplinary">Disciplinary Warning</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Specific Action Type</label>
                <select
                  value={newRecord.actionType}
                  onChange={(e) => setNewRecord({ ...newRecord, actionType: e.target.value as any })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                >
                  {newRecord.type === 'Reward' ? (
                    <>
                      <option value="Cash Bonus">Cash Bonus (مكافأة نقدية)</option>
                      <option value="Appreciation Letter">Appreciation Letter (رسالة شكر وتقدير)</option>
                      <option value="Employee of the Month">Employee of the Month (موظف الشهر)</option>
                    </>
                  ) : (
                    <>
                      <option value="Verbal Warning">Verbal Warning (إنذار شفهي)</option>
                      <option value="Written Warning">Written Warning (إنذار كتابي)</option>
                      <option value="Salary Deduction">Salary Deduction (خصم من الراتب)</option>
                      <option value="Suspension">Suspension (إيقاف عن العمل)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Amount or Penalty Scope</label>
                <input
                  type="text"
                  placeholder="e.g. 150 OMR, 3 Days Salary Deduction, Warning record..."
                  value={newRecord.amountOrPenalty}
                  onChange={(e) => setNewRecord({ ...newRecord, amountOrPenalty: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Justification & Details</label>
                <textarea
                  required
                  value={newRecord.reason}
                  onChange={(e) => setNewRecord({ ...newRecord, reason: e.target.value })}
                  placeholder="Detail the case facts, dates, context, warnings issued..."
                  rows={4}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212] resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#A11212] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#800e0e] transition-colors"
                >
                  Register Action
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

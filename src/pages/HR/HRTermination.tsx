import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UserMinus, CheckSquare, Square, FileText, CheckCircle2, PlusCircle, Trash2, Calendar, ShieldAlert, Award, Download, X
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface OffboardingTask {
  id: string;
  title: string;
  completed: boolean;
}

interface TerminatedEmployee {
  id: string;
  name: string;
  role: string;
  dept: string;
  lastWorkingDay: string;
  reason: 'Resignation' | 'Dismissal' | 'Redundancy' | 'End of Contract';
  eosBenefits: number; // End of service benefits (OMR)
  tasks: OffboardingTask[];
}

const INITIAL_TERMINATIONS: TerminatedEmployee[] = [
  {
    id: 'TERM-1301',
    name: 'Mohammed Maamari',
    role: 'Junior Associate',
    dept: 'Accounting',
    lastWorkingDay: '2026-07-15',
    reason: 'Resignation',
    eosBenefits: 1200,
    tasks: [
      { id: 't1', title: 'Return Company Laptop, Monitors & Access Card', completed: true },
      { id: 't2', title: 'Deactivate Corporate Email & System Accounts', completed: false },
      { id: 't3', title: 'Calculate & Approve Final EOS Settlement Pay', completed: false },
      { id: 't4', title: 'Draft & Issue Certificate of Employment Experience', completed: false }
    ]
  }
];

export default function HRTermination() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [terminations, setTerminations] = useState<TerminatedEmployee[]>(INITIAL_TERMINATIONS);
  const [selectedTermId, setSelectedTermId] = useState<string>(INITIAL_TERMINATIONS[0].id);
  const [showModal, setShowModal] = useState(false);

  const [newTerm, setNewTerm] = useState({
    name: '',
    role: 'Junior Associate',
    dept: 'Accounting',
    lastWorkingDay: '',
    reason: 'Resignation' as TerminatedEmployee['reason'],
    eosBenefits: 1000
  });

  const selectedTerm = terminations.find(t => t.id === selectedTermId) || terminations[0];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const term: TerminatedEmployee = {
      id: `TERM-${Math.floor(1300 + Math.random() * 100)}`,
      name: newTerm.name,
      role: newTerm.role,
      dept: newTerm.dept,
      lastWorkingDay: newTerm.lastWorkingDay,
      reason: newTerm.reason,
      eosBenefits: Number(newTerm.eosBenefits),
      tasks: [
        { id: 't1', title: 'Return Company Laptop, Monitors & Access Card', completed: false },
        { id: 't2', title: 'Deactivate Corporate Email & System Accounts', completed: false },
        { id: 't3', title: 'Calculate & Approve Final EOS Settlement Pay', completed: false },
        { id: 't4', title: 'Draft & Issue Certificate of Employment Experience', completed: false }
      ]
    };
    setTerminations([...terminations, term]);
    setSelectedTermId(term.id);
    setShowModal(false);
    setNewTerm({ name: '', role: 'Junior Associate', dept: 'Accounting', lastWorkingDay: '', reason: 'Resignation', eosBenefits: 1000 });
  };

  const toggleTask = (termId: string, taskId: string) => {
    setTerminations(prev => prev.map(t => {
      if (t.id === termId) {
        return {
          ...t,
          tasks: t.tasks.map(tsk => tsk.id === taskId ? { ...tsk, completed: !tsk.completed } : tsk)
        };
      }
      return t;
    }));
  };

  const calculateProgress = (term: TerminatedEmployee) => {
    const done = term.tasks.filter(t => t.completed).length;
    return Math.round((done / term.tasks.length) * 100);
  };

  const generateExperienceCert = (emp: TerminatedEmployee) => {
    const doc = new jsPDF({
      orientation: 'landscape', // Landscape looks much more prestigious for certificates!
      unit: 'mm',
      format: 'a4'
    });

    const brandRed = [161, 18, 18];      // #A11212
    const charcoal = [26, 26, 26];        // #1A1A1A
    const goldAccent = [197, 160, 89];    // Gold border #C5A059
    const grayText = [110, 110, 110];     // #6E6E6E

    // 1. Elegant Double Border Layout
    // Outer border
    doc.setDrawColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.setLineWidth(1.5);
    doc.rect(8, 8, 281, 194, 'D'); // Outer thick red border

    // Inner border
    doc.setDrawColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    doc.setLineWidth(0.6);
    doc.rect(11, 11, 275, 188, 'D'); // Inner gold border

    // 2. Certificate Header
    // Logo & Corporate Brand
    doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(26);
    doc.text('MAISARAH GROUP', 148, 30, { align: 'center' });

    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Muscat, Sultanate of Oman | Corporate HR Division', 148, 36, { align: 'center' });

    // Certificate Title
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('CERTIFICATE OF EMPLOYMENT EXPERIENCE', 148, 56, { align: 'center' });

    // Sub-title
    doc.setTextColor(brandRed[0], brandRed[1], brandRed[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('TO WHOM IT MAY CONCERN', 148, 70, { align: 'center' });

    // Gold Divider line under title
    doc.setDrawColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    doc.setLineWidth(0.8);
    doc.line(98, 74, 198, 74);

    // 3. Body Text (Certificate statement)
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(11);
    
    // Estimate a mock start date (e.g. 3 years prior to last working day)
    const lastDay = new Date(emp.lastWorkingDay);
    const startYear = lastDay.getFullYear() - 3;
    const startMonth = String(lastDay.getMonth() + 1).padStart(2, '0');
    const startDay = String(lastDay.getDate()).padStart(2, '0');
    const mockStartDate = `${startYear}-${startMonth}-${startDay}`;

    const statementLine1 = `This is to certify that Mr. / Ms. ${emp.name}`;
    const statementLine2 = `was employed with Maisarah Group as a designated ${emp.role} in the ${emp.dept} Department.`;
    const statementLine3 = `The tenure of employment commenced on ${mockStartDate} and concluded on ${emp.lastWorkingDay}.`;
    const statementLine4 = `During this tenure of service, they executed their professional duties with diligence, high competence,`;
    const statementLine5 = `and full compliance with company policies and Omani Labor Law. We highly appreciate their contributions`;
    const statementLine6 = `to the department and wish them the absolute best in their future professional pursuits.`;

    doc.text(statementLine1, 148, 92, { align: 'center' });
    doc.text(statementLine2, 148, 100, { align: 'center' });
    doc.text(statementLine3, 148, 108, { align: 'center' });
    doc.setFont('Helvetica', 'normal');
    doc.text(statementLine4, 148, 118, { align: 'center' });
    doc.text(statementLine5, 148, 126, { align: 'center' });
    doc.text(statementLine6, 148, 134, { align: 'center' });

    // 4. Footer Section (Signatures & Seal)
    const footerY = 160;

    // HR Signature line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.4);
    doc.line(40, footerY, 110, footerY);
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFontSize(9);
    doc.text('Prepared & Approved By:', 75, footerY + 5, { align: 'center' });
    doc.setTextColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.setFont('Helvetica', 'bold');
    doc.text('Director of Human Resources', 75, footerY + 10, { align: 'center' });
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.setFont('Helvetica', 'normal');
    doc.text('Maisarah Group Headquarters', 75, footerY + 14, { align: 'center' });

    // Stamp Seal Box on Right
    doc.setDrawColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    doc.setLineWidth(0.5);
    doc.rect(190, footerY - 15, 60, 28, 'D');
    doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('OFFICIAL CORPORATE SEAL', 220, footerY - 10, { align: 'center' });
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(7);
    doc.text('MAISARAH GROUP HR', 220, footerY, { align: 'center' });

    // Save PDF file
    doc.save(`Experience_Certificate_${emp.name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <UserMinus className="text-[#A11212]" size={24} />
            {isAr ? 'إنهاء الخدمة وتصفية المستحقات' : 'Employment Termination & Clearance'}
          </h2>
          <p className="text-xs text-gray-500 font-bold">
            {isAr ? 'متابعة إجراءات تصفية الحسابات وتسليم العهد للموظفين المغادرين' : 'Manage employee offboarding clearance lists and end-of-service payments'}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#A11212] text-white text-xs font-black uppercase tracking-wider px-4.5 py-3 rounded-xl flex items-center gap-1.5 hover:bg-[#800e0e] shadow-sm transition-all"
        >
          <PlusCircle size={16} /> {isAr ? 'بدء إجراءات المغادرة' : 'Initiate Offboarding'}
        </button>
      </div>

      {/* Grid Layout */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[500px]">
        {/* Left Side: Directory with completion indicators */}
        <div className="w-full lg:w-1/3 bg-white rounded-2xl border border-gray-100 p-4 space-y-2 shadow-sm">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest px-1 mb-3">Offboarding Roster</h3>
          <div className="space-y-2">
            {terminations.map(t => {
              const progress = calculateProgress(t);
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTermId(t.id)}
                  className={`w-full p-4 rounded-xl flex flex-col gap-2 border transition-all text-start ${
                    selectedTermId === t.id
                      ? 'bg-[#A11212]/5 border-[#A11212]'
                      : 'bg-white border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <div>
                      <h4 className="font-black text-xs text-gray-900">{t.name}</h4>
                      <p className="text-[9px] text-gray-500 font-bold">{t.role} · {t.reason}</p>
                    </div>
                    <span className="text-[9px] font-black text-[#A11212]">{progress}%</span>
                  </div>

                  <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#A11212] transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Offboarding Dashboard */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
          {selectedTerm ? (
            <div className="space-y-6">
              {/* Header profile info */}
              <div className="flex justify-between items-center pb-6 border-b border-gray-100 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-900 text-white font-black text-xl rounded-xl flex items-center justify-center">
                    {selectedTerm.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-gray-900">{selectedTerm.name}</h3>
                    <p className="text-[10px] text-gray-500 font-bold">{selectedTerm.role} · {selectedTerm.dept}</p>
                  </div>
                </div>
                <div className="text-end">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Last Working Day</p>
                  <p className="text-xs font-black text-red-600 flex items-center gap-1 mt-0.5 justify-end">
                    <Calendar size={12} className="text-red-400" /> {selectedTerm.lastWorkingDay}
                  </p>
                </div>
              </div>

              {/* End of Service and Experience Certificate widgets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">End of Service (EOS) Benefits</p>
                  <h3 className="text-xl font-black text-gray-900 mt-1">{selectedTerm.eosBenefits.toLocaleString()} OMR</h3>
                  <p className="text-[9px] text-gray-400 font-medium mt-1">Calculated according to Omani Labor Law articles.</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Experience Certificate</p>
                    <p className="text-[9px] text-gray-450 font-bold mt-1">Generate experience certificate referencing years of service.</p>
                  </div>
                  <button
                    onClick={() => generateExperienceCert(selectedTerm)}
                    className="mt-2 bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-1"
                  >
                    <Award size={12} /> Issue Certificate
                  </button>
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-[#A11212] uppercase tracking-wider">Offboarding Clearance Checklist</h4>
                <div className="space-y-2 pt-1">
                  {selectedTerm.tasks.map(t => (
                    <button
                      key={t.id}
                      onClick={() => toggleTask(selectedTerm.id, t.id)}
                      className={`w-full p-4 rounded-xl border flex items-center gap-3 transition-all text-start ${
                        t.completed ? 'bg-green-50/10 border-green-150' : 'bg-white border-gray-150 hover:border-gray-300'
                      }`}
                    >
                      {t.completed ? (
                        <CheckSquare className="text-green-700 flex-shrink-0" size={16} />
                      ) : (
                        <Square className="text-gray-455 flex-shrink-0" size={16} />
                      )}
                      <span className={`text-xs font-bold ${t.completed ? 'text-green-950 line-through' : 'text-gray-900'}`}>
                        {t.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              Select an offboarding roster profile.
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Initiate Employee Offboarding</h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Select Employee</label>
                <select
                  value={newTerm.name}
                  onChange={(e) => setNewTerm({ ...newTerm, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                >
                  <option value="Mohammed Maamari">Mohammed Maamari</option>
                  <option value="Sara Al-Balushi">Sara Al-Balushi</option>
                  <option value="Ahmed Al-Kharusi">Ahmed Al-Kharusi</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Separation Reason</label>
                  <select
                    value={newTerm.reason}
                    onChange={(e) => setNewTerm({ ...newTerm, reason: e.target.value as any })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  >
                    <option value="Resignation">Resignation (استقالة)</option>
                    <option value="Dismissal">Dismissal (فصل)</option>
                    <option value="Redundancy">Redundancy (إنهاء خدمة اقتصادي)</option>
                    <option value="End of Contract">End of Contract (انتهاء العقد)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Last Working Day</label>
                  <input
                    type="date"
                    required
                    value={newTerm.lastWorkingDay}
                    onChange={(e) => setNewTerm({ ...newTerm, lastWorkingDay: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Estimated EOS Settlement Pay (OMR)</label>
                <input
                  type="number"
                  min="0"
                  value={newTerm.eosBenefits}
                  onChange={(e) => setNewTerm({ ...newTerm, eosBenefits: Number(e.target.value) })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
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
                  Confirm Offboarding
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

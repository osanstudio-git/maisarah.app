import React, { useState, useEffect } from 'react';
import { X, Printer, FileText, RotateCcw, Plus, Trash2, Check, Edit3 } from 'lucide-react';

export interface EngagementLetterClientData {
  clientName?: string;
  companyName?: string;
  crNumber?: string;
  email?: string;
  phone?: string;
  serviceType?: string;
  totalAmount?: number;
  subtotal?: number;
  vatAmount?: number;
  quoteNumber?: string;
  yearsCovered?: string;
}

interface EngagementLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientData?: EngagementLetterClientData;
  onSave?: (letterData: any) => void;
}

export default function EngagementLetterModal({
  isOpen,
  onClose,
  clientData,
  onSave
}: EngagementLetterModalProps) {
  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();
  const defaultYears = `${currentYear - 2}&${currentYear - 1}`;
  const defaultDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // ── Core Document Header & Parties ──
  const [docTitle, setDocTitle] = useState('AUDIT ENGAGEMENT LETTER');
  const [docSubtitle, setDocSubtitle] = useState('Annual Statutory Audit Engagement');
  const [letterDate, setLetterDate] = useState(defaultDate);

  const [auditorName, setAuditorName] = useState('MAISARAH AUDITING & FINANCIAL CONSULTANT');
  const [auditorCr, setAuditorCr] = useState('1475532');

  const [clientName, setClientName] = useState(
    clientData?.companyName || clientData?.clientName || 'Arif for Construction and Projects LLC'
  );
  const [clientCr, setClientCr] = useState(clientData?.crNumber || '1361665');
  const [yearsCovered, setYearsCovered] = useState(clientData?.yearsCovered || defaultYears);

  // ── Section 1: Introduction ──
  const [sec1Intro, setSec1Intro] = useState(
    `We are pleased to confirm our acceptance and understanding of our engagement to audit the financial statements of ${
      clientData?.companyName || clientData?.clientName || 'Arif for Construction and Projects LLC'
    } for the year ${defaultYears}. This letter sets out the terms and conditions of our engagement and the nature and scope of the audit we will provide.`
  );

  // ── Section 2: Objective & Scope ──
  const [sec2ScopeP1, setSec2ScopeP1] = useState(
    'Our audit will be conducted in accordance with International Standards on Auditing (ISA) and applicable laws and regulations in the Sultanate of Oman.'
  );
  const [sec2ScopeP2, setSec2ScopeP2] = useState(
    'The objective of our audit is to express an independent opinion on whether the financial statements present fairly, in all material respects, the financial position of the Company and its financial performance for the respective years. Because of the inherent limitations of an audit, there is an unavoidable risk that some material misstatements may not be detected.'
  );

  // ── Section 3: Management Responsibilities ──
  const [managementBullets, setManagementBullets] = useState<string[]>([
    'Preparation and fair presentation of the financial statements',
    'Maintaining adequate accounting records and internal controls',
    'Providing us with access to all relevant financial information and documentation',
    'Ensuring compliance with applicable laws and regulations',
    'Providing written representations as required for the audit'
  ]);

  // ── Section 4: Auditor Responsibilities ──
  const [sec4AuditorP1, setSec4AuditorP1] = useState(
    `Our responsibility is to conduct the audit and issue an Independent Auditor's Report for the financial year ${defaultYears}.`
  );
  const [sec4AuditorP2, setSec4AuditorP2] = useState(
    'We will maintain professional independence and comply with ethical requirements throughout the engagement.'
  );

  // ── Section 5: Reporting ──
  const [sec5ReportingP1, setSec5ReportingP1] = useState("Upon completion of each year's audit, we will issue:");
  const [reportingBullets, setReportingBullets] = useState<string[]>([
    "Independent Auditor's Report",
    'Management Letter (if applicable), highlighting observations and recommendations.'
  ]);

  // ── Section 6: Professional Fees ──
  const [totalFeeOMR, setTotalFeeOMR] = useState<number>(clientData?.totalAmount || 450);
  const [feeHeadingCustom, setFeeHeadingCustom] = useState('');
  const [feeInWords, setFeeInWords] = useState('Four Hundred and fifty Omani Rials Only');
  const [paymentTerms, setPaymentTerms] = useState<string[]>([
    '50% upon signing this engagement letter.',
    '50% upon issuance of the final audit report.'
  ]);

  // ── Section 7: Confidentiality ──
  const [sec7Confidentiality, setSec7Confidentiality] = useState(
    'All information obtained during our engagement will be treated as strictly confidential and will not be disclosed to third parties without prior consent.'
  );

  // ── Section 8: Acceptance ──
  const [sec8AcceptanceP1, setSec8AcceptanceP1] = useState(
    'Please confirm your agreement with the terms of this engagement by signing and returning a copy of this letter.'
  );
  const [sec8AcceptanceP2, setSec8AcceptanceP2] = useState(
    `We look forward to working with ${
      clientData?.companyName || clientData?.clientName || 'Arif for Construction and Projects LLC'
    } and providing professional audit services.`
  );

  // ── Signatures Table ──
  const [auditorSignName, setAuditorSignName] = useState('');
  const [auditorSignDesignation, setAuditorSignDesignation] = useState('');
  const [clientSignName, setClientSignName] = useState('');
  const [clientSignDesignation, setClientSignDesignation] = useState('');
  const [signDate, setSignDate] = useState('');

  // ── Studio Navigation Tab on Left Controls ──
  const [activeControlTab, setActiveControlTab] = useState<'parties' | 'scope' | 'fees' | 'signatures'>('parties');

  // Convert Number to English Words for OMR
  const convertNumberToWords = (num: number): string => {
    if (!num || num <= 0) return 'Zero Omani Rials Only';
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n: number): string => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
      if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + inWords(n % 100) : '');
      if (n < 1000000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
      return n.toString();
    };

    const whole = Math.floor(num);
    const baisa = Math.round((num - whole) * 1000);
    let result = inWords(whole) + ' Omani Rial';
    if (whole !== 1) result += 's';
    if (baisa > 0) {
      result += ' and ' + inWords(baisa) + ' Baisa';
    }
    result += ' Only';
    return result;
  };

  const handleFeeAmountChange = (val: number) => {
    setTotalFeeOMR(val);
    setFeeInWords(convertNumberToWords(val));
  };

  // Sync clientData prop changes when opened
  useEffect(() => {
    if (clientData) {
      const name = clientData.companyName || clientData.clientName || 'Arif for Construction and Projects LLC';
      setClientName(name);
      if (clientData.crNumber) setClientCr(clientData.crNumber);
      if (clientData.totalAmount) {
        setTotalFeeOMR(clientData.totalAmount);
        setFeeInWords(convertNumberToWords(clientData.totalAmount));
      }
      if (clientData.yearsCovered) {
        setYearsCovered(clientData.yearsCovered);
      }
    }
  }, [clientData]);

  // Keep dynamic mentions updated if client/year changes
  const handleClientNameChange = (name: string) => {
    setClientName(name);
    setSec1Intro(prev =>
      prev.includes('audit the financial statements of')
        ? `We are pleased to confirm our acceptance and understanding of our engagement to audit the financial statements of ${name} for the year ${yearsCovered}. This letter sets out the terms and conditions of our engagement and the nature and scope of the audit we will provide.`
        : prev
    );
    setSec8AcceptanceP2(`We look forward to working with ${name} and providing professional audit services.`);
  };

  const handleYearsChange = (years: string) => {
    setYearsCovered(years);
    setSec1Intro(prev =>
      prev.includes('for the year')
        ? `We are pleased to confirm our acceptance and understanding of our engagement to audit the financial statements of ${clientName} for the year ${years}. This letter sets out the terms and conditions of our engagement and the nature and scope of the audit we will provide.`
        : prev
    );
    setSec4AuditorP1(`Our responsibility is to conduct the audit and issue an Independent Auditor's Report for the financial year ${years}.`);
  };

  // Bullet list helpers
  const handleUpdateBullet = (setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number, val: string) => {
    setter(prev => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  const handleAddBullet = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => [...prev, 'New item']);
  };

  const handleRemoveBullet = (setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number) => {
    setter(prev => prev.filter((_, i) => i !== idx));
  };

  const displayFeeHeading = feeHeadingCustom || `OMR ${totalFeeOMR} / Total for ${yearsCovered}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      {/* ── Strict A4 Print Styles (Exact 2-page printout matching attached PDF) ── */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 12mm 15mm;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-engagement-letter, #printable-engagement-letter * {
            visibility: visible !important;
          }
          #printable-engagement-letter {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: #1a1a1a !important;
          }
          .el-page-break {
            page-break-before: always !important;
            break-before: page !important;
            padding-top: 10mm !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-slate-950 rounded-3xl w-full max-w-7xl h-[94vh] shadow-2xl flex flex-col overflow-hidden border border-slate-800 text-white animate-in fade-in zoom-in-95 duration-150">

        {/* ── Top Modal Navigation & Action Bar ── */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#800000]/20 border border-[#800000]/40 text-red-400 rounded-xl">
              <FileText size={22} />
            </div>
            <div>
              <h3 className="font-black text-white text-base tracking-wide flex items-center gap-2">
                Audit Engagement Letter Studio
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800">
                  Exact 2-Page Model
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Live editable contract replica of official Maisarah Statutory Audit Engagement Letter
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-[#800000] hover:bg-[#990000] text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-red-950/50 cursor-pointer"
            >
              <Printer size={15} /> Print / Export PDF
            </button>

            {onSave && (
              <button
                type="button"
                onClick={() => {
                  onSave({
                    docTitle,
                    docSubtitle,
                    letterDate,
                    clientName,
                    clientCr,
                    yearsCovered,
                    totalFeeOMR,
                    feeInWords,
                    sec1Intro,
                    managementBullets,
                    paymentTerms
                  });
                  onClose();
                }}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Check size={15} /> Save Contract
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Studio Body (Split: Left Editable Controls / Right Live A4 Sheet) ── */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

          {/* ── LEFT PANEL: Section Accordion & Granular Controls ── */}
          <div className="w-full md:w-[420px] lg:w-[460px] bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 text-xs">

            {/* Sub-Tabs for Controls */}
            <div className="flex bg-slate-950 border-b border-slate-800 p-1.5 gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setActiveControlTab('parties')}
                className={`flex-1 py-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  activeControlTab === 'parties' ? 'bg-[#800000] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Parties & Date
              </button>
              <button
                type="button"
                onClick={() => setActiveControlTab('scope')}
                className={`flex-1 py-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  activeControlTab === 'scope' ? 'bg-[#800000] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Scope & Terms
              </button>
              <button
                type="button"
                onClick={() => setActiveControlTab('fees')}
                className={`flex-1 py-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  activeControlTab === 'fees' ? 'bg-[#800000] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Fees & Terms
              </button>
              <button
                type="button"
                onClick={() => setActiveControlTab('signatures')}
                className={`flex-1 py-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  activeControlTab === 'signatures' ? 'bg-[#800000] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Signatures
              </button>
            </div>

            {/* Scrollable Form Controls */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-slate-700">

              {/* TAB 1: Parties & Date */}
              {activeControlTab === 'parties' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Document Title</label>
                    <input
                      type="text"
                      value={docTitle}
                      onChange={e => setDocTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Document Subtitle</label>
                    <input
                      type="text"
                      value={docSubtitle}
                      onChange={e => setDocSubtitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Engagement Date</label>
                    <input
                      type="text"
                      value={letterDate}
                      onChange={e => setLetterDate(e.target.value)}
                      placeholder="e.g. 5 October 2026"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                    <h5 className="text-[10px] font-black uppercase text-red-400 tracking-wider">The Auditor Details</h5>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400">Firm Name</label>
                      <input
                        type="text"
                        value={auditorName}
                        onChange={e => setAuditorName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400">Auditor CR No.</label>
                      <input
                        type="text"
                        value={auditorCr}
                        onChange={e => setAuditorCr(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                    <h5 className="text-[10px] font-black uppercase text-red-400 tracking-wider">The Client Details</h5>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400">Client Legal Name</label>
                      <input
                        type="text"
                        value={clientName}
                        onChange={e => handleClientNameChange(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400">Client CR No.</label>
                        <input
                          type="text"
                          value={clientCr}
                          onChange={e => setClientCr(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400">Years Covered</label>
                        <input
                          type="text"
                          value={yearsCovered}
                          onChange={e => handleYearsChange(e.target.value)}
                          placeholder="e.g. 2024&2025"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Scope & Terms */}
              {activeControlTab === 'scope' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">1. Introduction Text</label>
                    <textarea
                      rows={3}
                      value={sec1Intro}
                      onChange={e => setSec1Intro(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">2. Objective & Scope (P1)</label>
                    <textarea
                      rows={2}
                      value={sec2ScopeP1}
                      onChange={e => setSec2ScopeP1(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">2. Objective & Scope (P2)</label>
                    <textarea
                      rows={3}
                      value={sec2ScopeP2}
                      onChange={e => setSec2ScopeP2(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none"
                    />
                  </div>

                  {/* 3. Management Responsibilities Bullets */}
                  <div className="space-y-2 p-3.5 bg-slate-950 border border-slate-800 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[10px] font-black uppercase text-red-400 tracking-wider">
                        3. Management's Responsibilities Bullets
                      </h5>
                      <button
                        type="button"
                        onClick={() => handleAddBullet(setManagementBullets)}
                        className="text-[10px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={12} /> Add
                      </button>
                    </div>
                    {managementBullets.map((b, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-500 font-bold mt-1.5">•</span>
                        <input
                          type="text"
                          value={b}
                          onChange={e => handleUpdateBullet(setManagementBullets, idx, e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-750 text-white rounded-lg px-2.5 py-1 text-xs outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveBullet(setManagementBullets, idx)}
                          className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">4. Auditor Responsibilities (P1)</label>
                    <textarea
                      rows={2}
                      value={sec4AuditorP1}
                      onChange={e => setSec4AuditorP1(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">4. Auditor Responsibilities (P2)</label>
                    <textarea
                      rows={2}
                      value={sec4AuditorP2}
                      onChange={e => setSec4AuditorP2(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: Fees & Terms */}
              {activeControlTab === 'fees' && (
                <div className="space-y-4">
                  {/* 5. Reporting */}
                  <div className="space-y-2 p-3.5 bg-slate-950 border border-slate-800 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[10px] font-black uppercase text-red-400 tracking-wider">5. Reporting Bullets</h5>
                      <button
                        type="button"
                        onClick={() => handleAddBullet(setReportingBullets)}
                        className="text-[10px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={12} /> Add
                      </button>
                    </div>
                    {reportingBullets.map((b, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-500 font-bold mt-1.5">•</span>
                        <input
                          type="text"
                          value={b}
                          onChange={e => handleUpdateBullet(setReportingBullets, idx, e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-750 text-white rounded-lg px-2.5 py-1 text-xs outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveBullet(setReportingBullets, idx)}
                          className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* 6. Professional Fees */}
                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                    <h5 className="text-[10px] font-black uppercase text-red-400 tracking-wider">6. Professional Fees Highlight</h5>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400">Total Fee Amount (OMR)</label>
                      <input
                        type="number"
                        value={totalFeeOMR}
                        onChange={e => handleFeeAmountChange(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 text-red-400 font-black rounded-xl px-3 py-2 text-sm outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400">Fee Banner Text (Overrides Default)</label>
                      <input
                        type="text"
                        placeholder={displayFeeHeading}
                        value={feeHeadingCustom}
                        onChange={e => setFeeHeadingCustom(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400">Amount in Words</label>
                      <input
                        type="text"
                        value={feeInWords}
                        onChange={e => setFeeInWords(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs outline-none"
                      />
                    </div>

                    {/* Payment Terms Bullets */}
                    <div className="space-y-2 pt-2 border-t border-slate-850">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-300">Payment Terms Bullets</span>
                        <button
                          type="button"
                          onClick={() => handleAddBullet(setPaymentTerms)}
                          className="text-[10px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={12} /> Add
                        </button>
                      </div>
                      {paymentTerms.map((t, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-500 font-bold mt-1.5">•</span>
                          <input
                            type="text"
                            value={t}
                            onChange={e => handleUpdateBullet(setPaymentTerms, idx, e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-750 text-white rounded-lg px-2.5 py-1 text-xs outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveBullet(setPaymentTerms, idx)}
                            className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">7. Confidentiality</label>
                    <textarea
                      rows={2}
                      value={sec7Confidentiality}
                      onChange={e => setSec7Confidentiality(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">8. Acceptance Paragraph 1</label>
                    <textarea
                      rows={2}
                      value={sec8AcceptanceP1}
                      onChange={e => setSec8AcceptanceP1(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">8. Acceptance Paragraph 2</label>
                    <textarea
                      rows={2}
                      value={sec8AcceptanceP2}
                      onChange={e => setSec8AcceptanceP2(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: Signatures */}
              {activeControlTab === 'signatures' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                    <h5 className="text-[10px] font-black uppercase text-red-400 tracking-wider">
                      For Maisarah Auditing & Financial Consultant
                    </h5>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400">Signatory Name (Optional)</label>
                      <input
                        type="text"
                        placeholder="Leave blank for physical signature or e.g. Salim Al-Abri"
                        value={auditorSignName}
                        onChange={e => setAuditorSignName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400">Designation</label>
                      <input
                        type="text"
                        placeholder="Leave blank or e.g. Managing Partner"
                        value={auditorSignDesignation}
                        onChange={e => setAuditorSignDesignation(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                    <h5 className="text-[10px] font-black uppercase text-red-400 tracking-wider">
                      For {clientName}
                    </h5>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400">Signatory Name</label>
                      <input
                        type="text"
                        placeholder="Leave blank for client to fill"
                        value={clientSignName}
                        onChange={e => setClientSignName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400">Designation</label>
                      <input
                        type="text"
                        placeholder="Leave blank or e.g. General Manager"
                        value={clientSignDesignation}
                        onChange={e => setClientSignDesignation(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400">Signing Date</label>
                      <input
                        type="text"
                        placeholder="Leave blank or specific date"
                        value={signDate}
                        onChange={e => setSignDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* ── RIGHT PANEL: Live Document Preview (Exact Replica of Attached PDF) ── */}
          <div className="flex-1 bg-slate-800 p-3 sm:p-6 lg:p-8 overflow-y-auto flex justify-center items-start scrollbar-thin scrollbar-thumb-slate-600">

            <div
              id="printable-engagement-letter"
              className="bg-white text-slate-900 shadow-2xl rounded-sm w-full max-w-[210mm] text-[12px] font-serif leading-relaxed select-text border border-slate-200"
            >

              {/* ══════════════════════════════════════════════════════════════
                  PAGE 1
                  ══════════════════════════════════════════════════════════════ */}
              <div className="p-8 sm:p-12 min-h-[297mm] flex flex-col justify-between">
                <div>

                  {/* Top Header Bar */}
                  <div className="flex justify-between items-start pb-3">
                    {/* Left: Contact Info */}
                    <div className="space-y-0.5 text-[11px] font-sans text-slate-800 pt-1">
                      <div className="flex items-center gap-1.5">
                        <span>✉</span>
                        <span className="font-medium">info@mafcfinance.com</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>☎</span>
                        <span className="font-medium">72596534</span>
                        <span>🌐</span>
                        <span className="font-medium">Maisarah.net</span>
                      </div>
                    </div>

                    {/* Right: Maisarah Official Brandmark */}
                    <div className="flex items-center gap-2">
                      <div className="text-right font-sans">
                        <div className="text-[9px] text-[#800000] font-black leading-tight">للتدقيق والاستشارات المالية</div>
                        <div className="text-[7px] text-gray-400 font-bold tracking-wider">AUDITING & FINANCIAL CONSULTANT</div>
                        <div className="text-xs font-black text-[#800000] tracking-wide flex items-center justify-end gap-1">
                          <span className="text-[8px] text-[#C59B27]">●●</span> MAISARAH
                        </div>
                        <div className="text-lg font-black text-[#800000] leading-none mt-0.5">ميسرة</div>
                      </div>
                      <img
                        src="/logo.png"
                        alt="Maisarah Logo"
                        className="h-10 w-auto object-contain hidden sm:inline-block"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    </div>
                  </div>

                  {/* Red Dividing Line Across Header */}
                  <div className="w-full h-[3px] bg-[#800000] mb-8" />

                  {/* Document Title Block */}
                  <div className="text-center space-y-1 mb-6">
                    <h1 className="text-2xl sm:text-[26px] font-black text-[#800000] uppercase tracking-wide font-sans">
                      {docTitle}
                    </h1>
                    <p className="text-xs sm:text-[13px] italic text-slate-700 font-serif">
                      {docSubtitle}
                    </p>
                  </div>

                  {/* Thin Separator Rule */}
                  <div className="w-full h-[1.5px] bg-[#800000] my-5" />

                  {/* Intro Lead-in */}
                  <p className="text-[12px] font-serif text-slate-800 mb-5">
                    This Engagement Letter is made and entered into on <strong className="font-bold text-slate-900">{letterDate}</strong>, by and between:
                  </p>

                  {/* Two-Column Parties Box (Light Gray Shading) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 bg-[#f3f4f6] p-4 sm:p-5 rounded-xs mb-8 gap-4 font-sans text-[11px] leading-snug">
                    <div className="space-y-0.5">
                      <span className="font-black text-[#800000] text-[10px] uppercase block tracking-wider">
                        THE AUDITOR
                      </span>
                      <p className="font-bold text-slate-900 text-xs uppercase">{auditorName}</p>
                      <p className="text-slate-600 font-medium text-[11px]">CR No. {auditorCr}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-black text-[#800000] text-[10px] uppercase block tracking-wider">
                        THE CLIENT
                      </span>
                      <p className="font-bold text-slate-900 text-xs">{clientName}</p>
                      <p className="text-slate-600 font-medium text-[11px]">CR No. {clientCr}</p>
                    </div>
                  </div>

                  {/* Content Sections 1 to 4 */}
                  <div className="space-y-6 text-[12px] text-slate-800 font-serif leading-relaxed">

                    {/* 1. INTRODUCTION */}
                    <div className="space-y-1.5">
                      <h3 className="font-black text-[#800000] uppercase text-xs tracking-wider font-sans">
                        1. INTRODUCTION
                      </h3>
                      <p className="text-justify">{sec1Intro}</p>
                    </div>

                    {/* 2. OBJECTIVE AND SCOPE OF THE AUDIT */}
                    <div className="space-y-2">
                      <h3 className="font-black text-[#800000] uppercase text-xs tracking-wider font-sans">
                        2. OBJECTIVE AND SCOPE OF THE AUDIT
                      </h3>
                      <p className="text-justify">{sec2ScopeP1}</p>
                      <p className="text-justify">{sec2ScopeP2}</p>
                    </div>

                    {/* 3. MANAGEMENT'S RESPONSIBILITIES */}
                    <div className="space-y-2">
                      <h3 className="font-black text-[#800000] uppercase text-xs tracking-wider font-sans">
                        3. MANAGEMENT'S RESPONSIBILITIES
                      </h3>
                      <ul className="space-y-1.5 pl-2">
                        {managementBullets.map((b, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <span className="text-[#D97706] font-bold text-base leading-none select-none">•</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 4. AUDITOR'S RESPONSIBILITIES */}
                    <div className="space-y-2">
                      <h3 className="font-black text-[#800000] uppercase text-xs tracking-wider font-sans">
                        4. AUDITOR'S RESPONSIBILITIES
                      </h3>
                      <p className="text-justify">{sec4AuditorP1}</p>
                      <p className="text-justify">{sec4AuditorP2}</p>
                    </div>

                  </div>

                </div>

                {/* Page 1 Footer */}
                <div className="pt-6 border-t border-slate-200 mt-10 flex justify-between items-center text-[9px] text-slate-500 font-sans italic">
                  <span>info@mafcfinance.com | +968 72596534 | Maisarah.net</span>
                  <span>Page 1 of 2</span>
                </div>
              </div>

              {/* ══════════════════════════════════════════════════════════════
                  PAGE 2
                  ══════════════════════════════════════════════════════════════ */}
              <div className="el-page-break p-8 sm:p-12 min-h-[297mm] flex flex-col justify-between border-t-8 border-slate-100 sm:border-t-0">
                <div>

                  {/* Top Header Page 2 (Exact Duplicate) */}
                  <div className="flex justify-between items-start pb-3">
                    <div className="space-y-0.5 text-[11px] font-sans text-slate-800 pt-1">
                      <div className="flex items-center gap-1.5">
                        <span>✉</span>
                        <span className="font-medium">info@mafcfinance.com</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>☎</span>
                        <span className="font-medium">72596534</span>
                        <span>🌐</span>
                        <span className="font-medium">Maisarah.net</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right font-sans">
                        <div className="text-[9px] text-[#800000] font-black leading-tight">للتدقيق والاستشارات المالية</div>
                        <div className="text-[7px] text-gray-400 font-bold tracking-wider">AUDITING & FINANCIAL CONSULTANT</div>
                        <div className="text-xs font-black text-[#800000] tracking-wide flex items-center justify-end gap-1">
                          <span className="text-[8px] text-[#C59B27]">●●</span> MAISARAH
                        </div>
                        <div className="text-lg font-black text-[#800000] leading-none mt-0.5">ميسرة</div>
                      </div>
                      <img
                        src="/logo.png"
                        alt="Maisarah Logo"
                        className="h-10 w-auto object-contain hidden sm:inline-block"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    </div>
                  </div>

                  {/* Red Dividing Line Across Header */}
                  <div className="w-full h-[3px] bg-[#800000] mb-8" />

                  {/* Content Sections 5 to 8 */}
                  <div className="space-y-6 text-[12px] text-slate-800 font-serif leading-relaxed">

                    {/* 5. REPORTING */}
                    <div className="space-y-2">
                      <h3 className="font-black text-[#800000] uppercase text-xs tracking-wider font-sans">
                        5. REPORTING
                      </h3>
                      <p>{sec5ReportingP1}</p>
                      <ul className="space-y-1.5 pl-2">
                        {reportingBullets.map((b, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <span className="text-[#D97706] font-bold text-base leading-none select-none">•</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 6. PROFESSIONAL FEES (Exact Model Box from PDF) */}
                    <div className="space-y-3">
                      <h3 className="font-black text-[#800000] uppercase text-xs tracking-wider font-sans">
                        6. PROFESSIONAL FEES
                      </h3>

                      {/* Model Fee Highlight Box */}
                      <div className="overflow-hidden rounded-xs border border-slate-200 shadow-xs">
                        {/* Solid Dark Red Banner Bar */}
                        <div className="h-6 bg-[#800000] w-full" />

                        {/* Light Shaded Content Area */}
                        <div className="bg-[#f3f4f6] py-5 px-4 text-center space-y-1">
                          <p className="text-lg sm:text-xl font-bold text-[#800000] font-sans tracking-wide">
                            {displayFeeHeading}
                          </p>
                          <p className="text-xs sm:text-[13px] italic text-slate-700 font-serif">
                            {feeInWords}
                          </p>
                        </div>
                      </div>

                      {/* Payment Terms */}
                      <div className="space-y-1.5 pt-1 font-serif">
                        <p className="font-bold text-slate-900 text-xs">Payment Terms:</p>
                        <ul className="space-y-1 pl-2">
                          {paymentTerms.map((t, idx) => (
                            <li key={idx} className="flex items-start gap-2.5">
                              <span className="text-[#D97706] font-bold text-base leading-none select-none">•</span>
                              <span>{t}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* 7. CONFIDENTIALITY */}
                    <div className="space-y-1.5">
                      <h3 className="font-black text-[#800000] uppercase text-xs tracking-wider font-sans">
                        7. CONFIDENTIALITY
                      </h3>
                      <p className="text-justify">{sec7Confidentiality}</p>
                    </div>

                    {/* 8. ACCEPTANCE */}
                    <div className="space-y-2">
                      <h3 className="font-black text-[#800000] uppercase text-xs tracking-wider font-sans">
                        8. ACCEPTANCE
                      </h3>
                      <p>{sec8AcceptanceP1}</p>
                      <p>{sec8AcceptanceP2}</p>
                    </div>

                    {/* ACKNOWLEDGEMENT & SIGNATURES */}
                    <div className="space-y-2 pt-2">
                      <h3 className="font-black text-[#800000] uppercase text-sm sm:text-base tracking-wider text-center font-sans">
                        ACKNOWLEDGEMENT & SIGNATURES
                      </h3>
                      <p className="text-[11px] text-slate-700 text-center font-serif">
                        In witness whereof, the parties have executed this Engagement Letter as of the date first written above.
                      </p>

                      <div className="w-full h-[1px] bg-slate-300 my-2" />

                      {/* Signatures Table (Exact Layout from PDF) */}
                      <table className="w-full border-collapse border border-slate-300 text-[11px] font-sans mt-3">
                        <thead>
                          <tr className="bg-[#FBF3F3] text-[#800000] font-bold text-left border-b border-slate-300">
                            <th className="p-3 w-1/2 border-r border-slate-300 font-black">
                              For Maisarah Auditing & Financial Consultant
                            </th>
                            <th className="p-3 w-1/2 font-black">
                              For {clientName}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                          <tr>
                            <td className="p-3 border-r border-slate-300">
                              <span className="font-semibold text-slate-900">Name:</span> {auditorSignName}
                            </td>
                            <td className="p-3">
                              <span className="font-semibold text-slate-900">Name:</span> {clientSignName}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-3 border-r border-slate-300">
                              <span className="font-semibold text-slate-900">Designation:</span> {auditorSignDesignation}
                            </td>
                            <td className="p-3">
                              <span className="font-semibold text-slate-900">Designation:</span> {clientSignDesignation}
                            </td>
                          </tr>
                          <tr className="h-20 sm:h-24">
                            <td className="p-3 border-r border-slate-300 align-top">
                              <span className="font-semibold text-slate-900">Signature:</span>
                            </td>
                            <td className="p-3 align-top">
                              <span className="font-semibold text-slate-900">Signature:</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="p-3 border-r border-slate-300">
                              <span className="font-semibold text-slate-900">Date:</span> {signDate}
                            </td>
                            <td className="p-3">
                              <span className="font-semibold text-slate-900">Date:</span> {signDate}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                  </div>

                </div>

                {/* Page 2 Footer */}
                <div className="pt-6 border-t border-slate-200 mt-10 flex justify-between items-center text-[9px] text-slate-500 font-sans italic">
                  <span>info@mafcfinance.com | +968 72596534 | Maisarah.net</span>
                  <span>Page 2 of 2</span>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

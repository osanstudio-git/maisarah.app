import React, { useState } from 'react';
import { X, Printer, CheckCircle2, FileText } from 'lucide-react';

interface EngagementLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientData?: {
    clientName: string;
    companyName?: string;
    crNumber?: string;
    email?: string;
    phone?: string;
    serviceType?: string;
    totalAmount?: number;
    subtotal?: number;
    vatAmount?: number;
    quoteNumber?: string;
  };
}

export default function EngagementLetterModal({ isOpen, onClose, clientData }: EngagementLetterModalProps) {
  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'LONG', year: 'numeric' }).toUpperCase();
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  const [letterDate, setLetterDate] = useState(todayStr);
  const [clientName, setClientName] = useState(clientData?.companyName || clientData?.clientName || 'ZAHRAT AL QASR GENERAL TRADING');
  const [clientCr, setClientCr] = useState(clientData?.crNumber || '1563171');
  const [yearsCovered, setYearsCovered] = useState(`${currentYear} and ${nextYear}`);
  const [serviceScope, setServiceScope] = useState(clientData?.serviceType || 'Financial Consultation & Tax Filing');
  const [totalFee, setTotalFee] = useState<number>(clientData?.totalAmount || 140);
  const [feeBreakdownText, setFeeBreakdownText] = useState(`OMR ${Math.round((clientData?.totalAmount || 140) * 0.6)} per year - Income Tax Filing, OMR ${Math.round((clientData?.totalAmount || 140) * 0.4)} per year - consultation`);
  const [feeInWords, setFeeInWords] = useState('One Hundred Forty Omani Rials Only');

  const convertNumberToWords = (num: number): string => {
    if (!num || num <= 0) return 'Zero Omani Rials Only';
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n: number): string => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
      if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + inWords(n % 100) : '');
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

  const handleFeeChange = (val: number) => {
    setTotalFee(val);
    setFeeInWords(convertNumberToWords(val));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #printable-engagement-letter, #printable-engagement-letter * { visibility: visible !important; }
          #printable-engagement-letter {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
            z-index: 999999 !important;
          }
          .page-break-before {
            page-break-before: always !important;
            break-before: page !important;
          }
        }
      `}</style>

      <div className="bg-slate-950 rounded-3xl w-full max-w-7xl h-[94vh] shadow-2xl flex flex-col overflow-hidden border border-slate-800 animate-in fade-in zoom-in duration-200 text-white">
        
        {/* Header Bar */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600/20 border border-red-500/30 text-red-400 rounded-xl">
              <FileText size={22} />
            </div>
            <div>
              <h3 className="font-black text-white text-base tracking-wide flex items-center gap-2">
                Official Audit & Tax Engagement Letter Generator
              </h3>
              <p className="text-[11px] text-slate-400">
                Pre-filled 2-page formal engagement contract for Maisarah Auditing & Financial Consultant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-red-700 hover:bg-red-800 text-white text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-red-700/30"
            >
              <Printer size={15} /> Print / Export PDF
            </button>

            <button 
              onClick={onClose} 
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Studio Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Controls */}
          <div className="w-full md:w-1/3 p-6 overflow-y-auto space-y-5 bg-slate-900 border-r border-slate-800 text-xs">
            <h4 className="text-xs font-black uppercase tracking-widest text-red-400 border-b border-slate-800 pb-2">
              Letter Parameters & Client Information
            </h4>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Engagement Date</label>
              <input
                type="text"
                value={letterDate}
                onChange={e => setLetterDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Client Legal Name</label>
              <input
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Client CR Number</label>
              <input
                type="text"
                value={clientCr}
                onChange={e => setClientCr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Years Covered</label>
              <input
                type="text"
                value={yearsCovered}
                onChange={e => setYearsCovered(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Scope / Service Title</label>
              <input
                type="text"
                value={serviceScope}
                onChange={e => setServiceScope(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-red-500"
              />
            </div>

            <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <h5 className="text-[10px] font-black uppercase text-red-400 tracking-wider">Fee Structure</h5>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Total Fee (OMR)</label>
                <input
                  type="number"
                  value={totalFee}
                  onChange={e => handleFeeChange(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 text-red-400 font-black rounded-xl px-3 py-2 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Fee Breakdown Text</label>
                <input
                  type="text"
                  value={feeBreakdownText}
                  onChange={e => setFeeBreakdownText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Fee in Words</label>
                <input
                  type="text"
                  value={feeInWords}
                  onChange={e => setFeeInWords(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs outline-none"
                />
              </div>
            </div>

          </div>

          {/* Right Live Document Preview Studio (2-Page A4 Sheet Format) */}
          <div className="w-full md:w-2/3 bg-slate-800 p-4 sm:p-8 overflow-y-auto flex justify-center items-start scrollbar-thin scrollbar-thumb-slate-600">
            
            <div 
              id="printable-engagement-letter" 
              className="bg-white text-slate-900 shadow-2xl rounded-sm p-8 sm:p-12 w-full max-w-[210mm] min-h-[297mm] text-[12px] font-serif leading-relaxed select-text space-y-6 border border-slate-200"
            >
              {/* PAGE 1 */}
              <div>
                {/* Header */}
                <div className="flex justify-between items-center border-b-2 border-red-900 pb-3 mb-6">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-sans font-medium text-slate-600">✉ info@mafcfinance.com</span>
                    <span className="text-[10px] font-sans font-medium text-slate-600">☎ +968 72596534</span>
                    <span className="text-[10px] font-sans font-bold text-red-900">Maisarah.net</span>
                  </div>
                  <div className="text-end">
                    <img src="/logo.png" alt="Maisarah Logo" className="h-9 object-contain inline-block" />
                    <p className="text-[8px] font-sans text-red-900 uppercase font-black tracking-wider">ميسرة للتدقيق والاستشارات المالية</p>
                  </div>
                </div>

                {/* Document Title Banner */}
                <div className="text-center space-y-1 mb-6">
                  <h1 className="text-xl font-black text-red-900 uppercase tracking-wide font-sans">ENGAGEMENT LETTER</h1>
                  <p className="text-xs italic text-red-950 font-bold">{serviceScope}</p>
                  <p className="text-[11px] text-slate-600 font-sans pt-2">
                    This Engagement Letter is made and entered into on <span className="font-bold text-slate-900">{letterDate}</span>, by and between:
                  </p>
                </div>

                {/* Parties Table */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 p-3 rounded-sm mb-6 text-[11px] font-sans">
                  <div>
                    <span className="font-black text-red-900 text-[10px] uppercase block tracking-wider">THE AUDITOR</span>
                    <p className="font-bold text-slate-900">MAISARAH AUDITING & FINANCIAL CONSULTANT</p>
                    <p className="text-slate-600 font-medium">CR No. 1475532</p>
                  </div>
                  <div>
                    <span className="font-black text-red-900 text-[10px] uppercase block tracking-wider">THE CLIENT</span>
                    <p className="font-bold text-slate-900">{clientName.toUpperCase()}</p>
                    <p className="text-slate-600 font-medium">CR No: {clientCr}</p>
                  </div>
                </div>

                {/* Content Sections */}
                <div className="space-y-4 font-sans text-[11px] text-slate-800">
                  
                  {/* 1. INTRODUCTION */}
                  <div className="space-y-1">
                    <h3 className="font-black text-red-900 uppercase text-xs tracking-wider">1. INTRODUCTION</h3>
                    <p className="leading-relaxed">
                      We are pleased to confirm our acceptance and understanding of our engagement to provide tax consultation and Income Tax Filing for <strong className="text-slate-900">{clientName}</strong> for the years ended 31 December {yearsCovered}. This letter sets out the terms and conditions of our engagement and the nature and scope of the engagement we will provide.
                    </p>
                  </div>

                  {/* 2. OBJECTIVE AND SCOPE */}
                  <div className="space-y-1">
                    <h3 className="font-black text-red-900 uppercase text-xs tracking-wider">2. OBJECTIVE AND SCOPE OF THE AUDIT</h3>
                    <p className="leading-relaxed">
                      Our audit will be conducted in accordance with Tax Laws, Regulations and practices applicable in the Sultanate of Oman, including the Income Tax Law and the Value Added Tax (VAT) Law.
                    </p>
                    <p className="font-bold text-slate-900 pt-1">The objective of our engagement is to:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Review and confirm the Company's Income Tax and VAT filings for the years {yearsCovered};</li>
                      <li>Perform and review that the filings have been prepared in accordance with applicable Oman Tax Authority (OTA) requirements;</li>
                      <li>Identify and advise on any discrepancies, exposures or opportunities (including brought forward loss relief) noted during our review;</li>
                      <li>Provide ongoing advisory support, allowing the Company to raise tax-related questions to us as they arise.</li>
                    </ul>
                  </div>

                  {/* 3. MANAGEMENT'S RESPONSIBILITIES */}
                  <div className="space-y-1">
                    <h3 className="font-black text-red-900 uppercase text-xs tracking-wider">3. MANAGEMENT'S RESPONSIBILITIES</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Providing us with complete and accurate financial records, filed returns, and supporting documentation for {yearsCovered};</li>
                      <li>Maintaining adequate accounting records and internal controls;</li>
                      <li>Ensuring compliance with applicable laws and regulations;</li>
                      <li>Providing written representations as required for the audit.</li>
                    </ul>
                  </div>

                  {/* 4. CONSULTANT'S RESPONSIBILITIES */}
                  <div className="space-y-1">
                    <h3 className="font-black text-red-900 uppercase text-xs tracking-wider">4. CONSULTANT'S RESPONSIBILITIES</h3>
                    <p className="leading-relaxed">
                      Our responsibility is to review the Company's {yearsCovered} tax filings, confirm their accuracy and compliance, and respond to tax-related queries raised by the Company during the engagement. We will maintain professional independence and comply with applicable ethical requirements throughout the engagement.
                    </p>
                  </div>

                </div>

                <div className="pt-4 border-t border-slate-200 mt-6 flex justify-between items-center text-[9px] text-slate-400 font-sans">
                  <span>info@mafcfinance.com | +968 72596534 | Maisarah.net</span>
                  <span>Page 1 of 2</span>
                </div>
              </div>

              {/* PAGE 2 BREAK */}
              <div className="page-break-before pt-8 space-y-6">
                
                {/* Header Page 2 */}
                <div className="flex justify-between items-center border-b-2 border-red-900 pb-3 mb-6">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-sans font-medium text-slate-600">✉ info@mafcfinance.com</span>
                    <span className="text-[10px] font-sans font-medium text-slate-600">☎ +968 72596534</span>
                    <span className="text-[10px] font-sans font-bold text-red-900">Maisarah.net</span>
                  </div>
                  <div className="text-end">
                    <img src="/logo.png" alt="Maisarah Logo" className="h-8 object-contain inline-block" />
                  </div>
                </div>

                <div className="space-y-5 font-sans text-[11px] text-slate-800">
                  
                  {/* 5. REPORTING */}
                  <div className="space-y-1">
                    <h3 className="font-black text-red-900 uppercase text-xs tracking-wider">5. REPORTING</h3>
                    <p className="leading-relaxed">Upon completion of each year's audit, we will issue:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Income Tax Filing Acknowledgment.</li>
                      <li>Management Letter (if applicable), highlighting observations and recommendations.</li>
                    </ul>
                  </div>

                  {/* 6. PROFESSIONAL FEES */}
                  <div className="space-y-2">
                    <h3 className="font-black text-red-900 uppercase text-xs tracking-wider">6. PROFESSIONAL FEES</h3>
                    <div className="bg-red-50 border-2 border-red-900 p-4 text-center rounded-sm space-y-1">
                      <p className="text-base font-black text-red-900 font-sans">
                        OMR {totalFee} / Total for {yearsCovered}
                      </p>
                      <p className="text-[11px] font-bold text-slate-700 italic">
                        {feeBreakdownText}
                      </p>
                      <p className="text-xs font-black text-red-950 underline pt-1">
                        {feeInWords}
                      </p>
                    </div>
                  </div>

                  {/* 7. CONFIDENTIALITY */}
                  <div className="space-y-1">
                    <h3 className="font-black text-red-900 uppercase text-xs tracking-wider">7. CONFIDENTIALITY</h3>
                    <p className="leading-relaxed">
                      All information obtained during our engagement will be treated as strictly confidential and will not be disclosed to third parties without prior consent.
                    </p>
                  </div>

                  {/* 8. ACCEPTANCE */}
                  <div className="space-y-1">
                    <h3 className="font-black text-red-900 uppercase text-xs tracking-wider">8. ACCEPTANCE</h3>
                    <p className="leading-relaxed">
                      Please confirm your agreement with the terms of this engagement by signing and returning a copy of this letter. We look forward to working with <strong className="text-slate-900">{clientName}</strong> and providing professional audit services.
                    </p>
                  </div>

                  {/* ACKNOWLEDGEMENT & SIGNATURES TABLE */}
                  <div className="space-y-2 pt-4">
                    <h3 className="font-black text-red-900 uppercase text-xs tracking-wider text-center">
                      ACKNOWLEDGEMENT & SIGNATURES
                    </h3>
                    <p className="text-[10px] text-slate-600 text-center italic">
                      In witness whereof, the parties have executed this Engagement Letter as of the date first written above.
                    </p>

                    <table className="w-full border-collapse border border-slate-300 text-[11px] mt-2">
                      <thead>
                        <tr className="bg-red-900 text-white font-black">
                          <th className="p-2 text-start border border-red-900 w-1/2">For Maisarah Auditing & Financial Consultant</th>
                          <th className="p-2 text-start border border-red-900 w-1/2">For {clientName.toUpperCase()}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="p-2 border border-slate-300 font-bold">Name: Salim Al-Abri / Managing Partner</td>
                          <td className="p-2 border border-slate-300 font-bold">Name:</td>
                        </tr>
                        <tr>
                          <td className="p-2 border border-slate-300 font-bold">Designation: Authorised Auditor & Partner</td>
                          <td className="p-2 border border-slate-300 font-bold">Designation: General Manager / Director</td>
                        </tr>
                        <tr className="h-16">
                          <td className="p-2 border border-slate-300 align-bottom">
                            <span className="text-[9px] text-slate-400 italic block">Signature & Official Stamp:</span>
                          </td>
                          <td className="p-2 border border-slate-300 align-bottom">
                            <span className="text-[9px] text-slate-400 italic block">Signature & Official Stamp:</span>
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 border border-slate-300">Date: {letterDate}</td>
                          <td className="p-2 border border-slate-300">Date: {letterDate}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                </div>

                <div className="pt-6 border-t border-slate-200 mt-8 flex justify-between items-center text-[9px] text-slate-400 font-sans">
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

import React, { useState } from 'react';
import { X, Printer, FileText, CheckCircle2 } from 'lucide-react';

interface BookkeepingProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientData?: {
    clientName: string;
    companyName?: string;
    email?: string;
    phone?: string;
    totalAmount?: number;
    monthlyFee?: number;
  };
}

export default function BookkeepingProposalModal({ isOpen, onClose, clientData }: BookkeepingProposalModalProps) {
  if (!isOpen) return null;

  const currentMonthYear = new Date().toLocaleDateString('en-US', { month: 'LONG', year: 'NUMERIC' }).toUpperCase();
  const [proposalClientName, setProposalClientName] = useState(clientData?.companyName || clientData?.clientName || 'AWAN COMPANY');
  const [monthlyRate, setMonthlyRate] = useState<number>(clientData?.monthlyFee || clientData?.totalAmount || 100);
  const [proposalDate, setProposalDate] = useState(currentMonthYear);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #printable-bookkeeping-proposal, #printable-bookkeeping-proposal * { visibility: visible !important; }
          #printable-bookkeeping-proposal {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #800E0E !important;
            color: white !important;
            z-index: 999999 !important;
          }
          .proposal-page {
            page-break-after: always !important;
            break-after: page !important;
            height: 100vh !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
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
                Maisarah 8-Page Bookkeeping & Accounting Proposal Studio
              </h3>
              <p className="text-[11px] text-slate-400">
                Exact replica of official Maisarah maroon presentation proposal deck
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-red-700 hover:bg-red-800 text-white text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-red-700/30"
            >
              <Printer size={15} /> Print / Export Proposal Deck (8 Pages)
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
              Proposal Deck Parameters
            </h4>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Target Company Name</label>
              <input
                type="text"
                value={proposalClientName}
                onChange={e => setProposalClientName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Monthly Bookkeeping Fee (OMR)</label>
              <input
                type="number"
                value={monthlyRate}
                onChange={e => setMonthlyRate(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 text-red-400 font-black rounded-xl px-3 py-2 text-sm outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Proposal Month & Year</label>
              <input
                type="text"
                value={proposalDate}
                onChange={e => setProposalDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-red-500"
              />
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <h5 className="text-[10px] font-black uppercase text-red-400 tracking-wider">8-Page Deck Contents</h5>
              <ol className="list-decimal pl-4 text-[10px] text-slate-300 space-y-1">
                <li>Cover Page & Client Title</li>
                <li>Ongoing Bookkeeping & Accounting Scope</li>
                <li>Additional & Value-Added Services Table</li>
                <li>Initial Establishment Services</li>
                <li>Existing Accounts Review & Cleanup</li>
                <li>Work Process & Commercial Terms</li>
                <li>Thank You Presentation Page</li>
                <li>Contact Us & Office Coordinates</li>
              </ol>
            </div>
          </div>

          {/* Right Live Document Preview Studio (8-Page Maroon Slides Container) */}
          <div className="w-full md:w-2/3 bg-slate-900 p-4 sm:p-8 overflow-y-auto flex justify-center items-start scrollbar-thin scrollbar-thumb-slate-700">
            
            <div id="printable-bookkeeping-proposal" className="w-full max-w-[210mm] space-y-8 select-text">
              
              {/* PAGE 1: COVER SLIDE */}
              <div className="proposal-page bg-gradient-to-br from-[#800E0E] via-[#A11212] to-[#5C0A0A] text-white p-10 min-h-[297mm] rounded-sm shadow-2xl flex flex-col justify-between relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
                
                {/* Header Logo */}
                <div className="flex justify-center items-center pt-8">
                  <div className="text-center space-y-1">
                    <img src="/logo.png" alt="Maisarah Logo" className="h-16 object-contain mx-auto filter brightness-0 invert" />
                    <p className="text-xs tracking-widest font-black uppercase text-red-200">ميسرة للتدقيق والاستشارات المالية</p>
                  </div>
                </div>

                {/* Main Title Block */}
                <div className="text-center space-y-6 my-auto">
                  <h1 className="text-5xl sm:text-6xl font-black tracking-wider uppercase font-sans leading-none drop-shadow-md">
                    BOOKKEEPING
                  </h1>
                  <p className="text-xl sm:text-2xl font-light tracking-[0.3em] uppercase text-red-200">
                    PROPOSAL FOR
                  </p>
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl max-w-md mx-auto shadow-xl">
                    <h2 className="text-3xl font-black text-white uppercase tracking-wide">
                      {proposalClientName}
                    </h2>
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="flex justify-between items-end border-t border-white/20 pt-6 text-xs font-bold tracking-wider text-red-100">
                  <span>{proposalDate}</span>
                  <div className="text-end">
                    <p className="text-[10px] text-red-300 uppercase font-medium">Prepared by</p>
                    <p className="font-black text-sm text-white">MAISARAH BOOKKEEPING TEAM</p>
                  </div>
                </div>
              </div>

              {/* PAGE 2: ONGOING SERVICES */}
              <div className="proposal-page bg-gradient-to-br from-[#800E0E] via-[#A11212] to-[#600B0B] text-white p-10 min-h-[297mm] rounded-sm shadow-2xl flex flex-col justify-between relative">
                <div className="space-y-6">
                  <div className="text-center space-y-2 border-b border-white/20 pb-4">
                    <h2 className="text-3xl font-black uppercase tracking-wider">SERVICES</h2>
                    <p className="text-sm font-bold text-red-200 uppercase tracking-widest">
                      ONGOING BOOKKEEPING & ACCOUNTING SERVICES
                    </p>
                  </div>

                  <table className="w-full border-collapse border border-white/30 text-xs font-medium">
                    <thead>
                      <tr className="bg-white/20 text-white font-black text-sm uppercase">
                        <th className="p-3 text-center border border-white/30">Services</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {[
                        'Day to day Voucher entries',
                        'VAT computation & filing support',
                        'Corporate Income Tax Filing',
                        'Monthly Financial Statement Report',
                        'Profit & Loss statement',
                        'Balance Sheet preparation',
                        'Bank Reconciliation',
                        'Accounts payable & receivable management',
                      ].map((service, idx) => (
                        <tr key={idx} className="hover:bg-white/10">
                          <td className="p-3.5 text-center font-bold text-slate-100">{service}</td>
                        </tr>
                      ))}
                      <tr className="bg-white/20 font-black text-sm text-white">
                        <td className="p-4 text-center border-t border-white/40 flex justify-between items-center px-8">
                          <span>PRICE (Monthly)</span>
                          <span className="text-lg text-yellow-300">OMR {monthlyRate}+</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="text-center text-[10px] text-red-200 border-t border-white/20 pt-4 font-medium">
                  Maisarah Auditing & Financial Consultant &bull; Page 2
                </div>
              </div>

              {/* PAGE 3: ADDITIONAL SERVICES */}
              <div className="proposal-page bg-gradient-to-br from-[#800E0E] via-[#A11212] to-[#600B0B] text-white p-10 min-h-[297mm] rounded-sm shadow-2xl flex flex-col justify-between relative">
                <div className="space-y-6">
                  <div className="text-center space-y-2 border-b border-white/20 pb-4">
                    <h2 className="text-3xl font-black uppercase tracking-wider">
                      ADDITIONAL & VALUE-ADDED SERVICES
                    </h2>
                  </div>

                  <table className="w-full border-collapse border border-white/30 text-xs">
                    <thead>
                      <tr className="bg-white/20 text-white font-black text-xs uppercase">
                        <th className="p-3 text-start border border-white/30">Services</th>
                        <th className="p-3 text-center border border-white/30 w-36">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20 font-medium">
                      {[
                        { name: 'Budget preparation', price: 'OMR 50+' },
                        { name: 'Financial analysis & performance review', price: 'OMR 50+' },
                        { name: 'WPS Preparation', price: 'OMR 10' },
                        { name: 'Audit support & Preparation', price: 'OMR 150+' },
                        { name: 'Ratio Analysis', price: 'OMR 120+' },
                        { name: 'Business advisory support', price: 'OMR 50+' },
                        { name: 'Management reporting', price: 'OMR 50+' },
                      ].map((item, idx) => (
                        <tr key={idx} className="hover:bg-white/10">
                          <td className="p-3 border border-white/20 font-bold">{item.name}</td>
                          <td className="p-3 border border-white/20 text-center font-black text-yellow-300">{item.price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="text-center text-[10px] text-red-200 border-t border-white/20 pt-4 font-medium">
                  Maisarah Auditing & Financial Consultant &bull; Page 3
                </div>
              </div>

              {/* PAGE 4: INITIAL ESTABLISHMENT */}
              <div className="proposal-page bg-gradient-to-br from-[#800E0E] via-[#A11212] to-[#600B0B] text-white p-10 min-h-[297mm] rounded-sm shadow-2xl flex flex-col justify-between relative">
                <div className="space-y-6">
                  <div className="text-center space-y-2 border-b border-white/20 pb-4">
                    <h2 className="text-3xl font-black uppercase tracking-wider">
                      INITIAL ESTABLISHMENT
                    </h2>
                  </div>

                  <table className="w-full border-collapse border border-white/30 text-xs">
                    <thead>
                      <tr className="bg-white/20 text-white font-black text-xs uppercase">
                        <th className="p-3 text-start border border-white/30">Services</th>
                        <th className="p-3 text-center border border-white/30 w-40">Price (One Time)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20 font-medium">
                      {[
                        { name: 'ERP & Accounting system setup', price: 'OMR 500+' },
                        { name: 'Chart of accounts design & Financial structure planning', price: 'OMR 80+' },
                        { name: 'Employee Training', price: 'OMR 50+' },
                        { name: 'Initial Investment preparation', price: 'Free' },
                        { name: 'VAT registration assistance (if applicable)', price: 'Free' },
                      ].map((item, idx) => (
                        <tr key={idx} className="hover:bg-white/10">
                          <td className="p-3.5 border border-white/20 font-bold">{item.name}</td>
                          <td className={`p-3.5 border border-white/20 text-center font-black ${item.price === 'Free' ? 'text-green-300' : 'text-yellow-300'}`}>
                            {item.price}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="text-center text-[10px] text-red-200 border-t border-white/20 pt-4 font-medium">
                  Maisarah Auditing & Financial Consultant &bull; Page 4
                </div>
              </div>

              {/* PAGE 5: EXISTING ACCOUNTS REVIEW & CLEANUP */}
              <div className="proposal-page bg-gradient-to-br from-[#800E0E] via-[#A11212] to-[#600B0B] text-white p-10 min-h-[297mm] rounded-sm shadow-2xl flex flex-col justify-between relative">
                <div className="space-y-6">
                  <div className="text-center space-y-2 border-b border-white/20 pb-4">
                    <h2 className="text-3xl font-black uppercase tracking-wider">
                      EXISTING ACCOUNTS REVIEW & CLEANUP
                    </h2>
                  </div>

                  <div className="border border-white/30 rounded-lg overflow-hidden bg-white/10 backdrop-blur-md">
                    <div className="p-3 bg-white/20 font-black text-center text-sm uppercase">Services Scope</div>
                    <ul className="divide-y divide-white/20 text-xs font-medium">
                      {[
                        'Internal control review',
                        'Financial consultation',
                        'Business advisory support',
                        'Bank reconciliation correction',
                        'Backlog accounting entries',
                        'Assessment Review',
                        'Ledger scrutiny and rectification',
                      ].map((service, idx) => (
                        <li key={idx} className="p-3 text-center font-bold text-slate-100 hover:bg-white/10">
                          {service}
                        </li>
                      ))}
                    </ul>
                    <div className="p-4 bg-white/20 text-center text-[11px] font-bold text-red-100 italic border-t border-white/30">
                      Fees are structured based on transaction volume, scope of accounting services, and any pending tax or compliance matters requiring rectification.
                    </div>
                  </div>
                </div>

                <div className="text-center text-[10px] text-red-200 border-t border-white/20 pt-4 font-medium">
                  Maisarah Auditing & Financial Consultant &bull; Page 5
                </div>
              </div>

              {/* PAGE 6: WORK PROCESS & COMMERCIAL TERMS */}
              <div className="proposal-page bg-gradient-to-br from-[#800E0E] via-[#A11212] to-[#600B0B] text-white p-10 min-h-[297mm] rounded-sm shadow-2xl flex flex-col justify-between relative">
                <div className="space-y-8">
                  
                  {/* WORK PROCESS */}
                  <div className="space-y-4">
                    <h2 className="text-3xl font-black uppercase tracking-wider border-b border-white/20 pb-3">
                      WORK PROCESS (REMOTE METHOD)
                    </h2>
                    <ul className="list-disc pl-6 space-y-3 text-sm font-medium leading-relaxed">
                      <li>All invoices & receipts will be shared via WhatsApp, email, Google Drive, shared folder or by physical form</li>
                      <li>Our team updates the accounts daily/weekly</li>
                      <li>Monthly reports delivered</li>
                      <li>Live review call once a month</li>
                    </ul>
                  </div>

                  {/* COMMERCIAL TERMS */}
                  <div className="space-y-4 pt-4">
                    <h2 className="text-3xl font-black uppercase tracking-wider border-b border-white/20 pb-3">
                      COMMERCIAL TERMS
                    </h2>
                    <ul className="list-disc pl-6 space-y-3 text-sm font-medium leading-relaxed">
                      <li>Payment terms: 50% advance for setup work; monthly fees payable at month-end.</li>
                      <li>Contract term: 12 months (renewable).</li>
                    </ul>
                  </div>

                </div>

                <div className="text-center text-[10px] text-red-200 border-t border-white/20 pt-4 font-medium">
                  Maisarah Auditing & Financial Consultant &bull; Page 6
                </div>
              </div>

              {/* PAGE 7: THANK YOU SLIDE */}
              <div className="proposal-page bg-gradient-to-br from-[#800E0E] via-[#A11212] to-[#5C0A0A] text-white p-10 min-h-[297mm] rounded-sm shadow-2xl flex flex-col justify-between items-center text-center relative">
                <div className="my-auto space-y-4">
                  <h1 className="text-6xl font-black tracking-widest uppercase drop-shadow-lg">
                    THANK YOU
                  </h1>
                  <p className="text-sm font-bold tracking-widest text-red-200 uppercase">
                    We look forward to serving {proposalClientName}
                  </p>
                </div>

                <div className="text-[10px] text-red-200 font-medium">
                  Maisarah Auditing & Financial Consultant &bull; Page 7
                </div>
              </div>

              {/* PAGE 8: CONTACT US */}
              <div className="proposal-page bg-gradient-to-br from-[#800E0E] via-[#A11212] to-[#5C0A0A] text-white p-10 min-h-[297mm] rounded-sm shadow-2xl flex flex-col justify-between relative">
                
                <div className="flex justify-end pt-4">
                  <img src="/logo.png" alt="Maisarah Logo" className="h-14 object-contain filter brightness-0 invert" />
                </div>

                <div className="my-auto space-y-8 max-w-lg">
                  <h1 className="text-5xl font-black uppercase tracking-wider border-b-2 border-white/30 pb-4">
                    CONTACT US
                  </h1>

                  <div className="space-y-4 text-sm font-medium">
                    <p className="flex items-center gap-3">
                      <span className="font-black text-red-300">📞 Phone:</span> +968-72596538 | +968-72596534 | +968-72596533
                    </p>
                    <p className="flex items-center gap-3">
                      <span className="font-black text-red-300">📸 Instagram:</span> @maisarahaudit
                    </p>
                    <p className="flex items-center gap-3">
                      <span className="font-black text-red-300">✉ Email:</span> info@mafcfinance.com
                    </p>
                    <p className="flex items-center gap-3">
                      <span className="font-black text-red-300">🌐 Website:</span> maisarah.net
                    </p>
                    <p className="flex items-start gap-3">
                      <span className="font-black text-red-300">📍 Address:</span> P Floor, Building no: 271, Al Jami Al Akbar St, Office No: 92, 101, Muscat, Oman
                    </p>
                  </div>
                </div>

                <div className="text-center text-[10px] text-red-200 border-t border-white/20 pt-4 font-medium">
                  Maisarah Auditing & Financial Consultant &bull; Page 8
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

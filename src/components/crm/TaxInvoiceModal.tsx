import React, { useState } from 'react';
import { X, Printer, FileCheck } from 'lucide-react';

interface TaxInvoiceModalProps {
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

export default function TaxInvoiceModal({ isOpen, onClose, clientData }: TaxInvoiceModalProps) {
  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-');
  const invoiceNumDefault = `FS/305/${Math.floor(10 + Math.random() * 89)}/26`;

  const [invoiceNo, setInvoiceNo] = useState(invoiceNumDefault);
  const [invoiceDate, setInvoiceDate] = useState(todayStr);
  const [buyerName, setBuyerName] = useState(clientData?.companyName || clientData?.clientName || 'Amjaad');
  const [buyerCountry, setBuyerCountry] = useState('Sultanate of Oman');
  const [serviceParticulars, setServiceParticulars] = useState(clientData?.serviceType || 'Feasibility Study / Accounting Retainer');
  const [lineAmount, setLineAmount] = useState<number>(clientData?.subtotal || clientData?.totalAmount || 30.0);
  const [includeVat, setIncludeVat] = useState(true);

  const subtotalAmt = lineAmount;
  const vatAmt = includeVat ? +(subtotalAmt * 0.05).toFixed(3) : 0;
  const grandTotal = +(subtotalAmt + vatAmt).toFixed(3);

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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #printable-tax-invoice, #printable-tax-invoice * { visibility: visible !important; }
          #printable-tax-invoice {
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
        }
      `}</style>

      <div className="bg-slate-950 rounded-3xl w-full max-w-7xl h-[94vh] shadow-2xl flex flex-col overflow-hidden border border-slate-800 animate-in fade-in zoom-in duration-200 text-white">
        
        {/* Header Bar */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-600/20 border border-green-500/30 text-green-400 rounded-xl">
              <FileCheck size={22} />
            </div>
            <div>
              <h3 className="font-black text-white text-base tracking-wide flex items-center gap-2">
                Official Oman Tax Invoice Generator (فاتورة ضريبية)
              </h3>
              <p className="text-[11px] text-slate-400">
                Official Tax Invoice with CR No. 1475532, Bank Muscat Details & 5% Oman VAT
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-green-700 hover:bg-green-800 text-white text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-green-700/30"
            >
              <Printer size={15} /> Print / Export Invoice PDF
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
            <h4 className="text-xs font-black uppercase tracking-widest text-green-400 border-b border-slate-800 pb-2">
              Invoice Parameters
            </h4>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Invoice Number</label>
              <input
                type="text"
                value={invoiceNo}
                onChange={e => setInvoiceNo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Dated</label>
              <input
                type="text"
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Buyer / Client Name</label>
              <input
                type="text"
                value={buyerName}
                onChange={e => setBuyerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Country</label>
              <input
                type="text"
                value={buyerCountry}
                onChange={e => setBuyerCountry(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Particulars / Service</label>
              <input
                type="text"
                value={serviceParticulars}
                onChange={e => setServiceParticulars(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Amount (OMR)</label>
              <input
                type="number"
                step="0.001"
                value={lineAmount}
                onChange={e => setLineAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 text-green-400 font-black rounded-xl px-3 py-2 text-sm outline-none focus:border-green-500"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-200">
              <input
                type="checkbox"
                checked={includeVat}
                onChange={e => setIncludeVat(e.target.checked)}
                className="accent-green-500 rounded w-4 h-4"
              />
              <span>Include 5% Oman VAT</span>
            </label>

          </div>

          {/* Right Live Document Preview Studio (A4 Sheet Format) */}
          <div className="w-full md:w-2/3 bg-slate-800 p-4 sm:p-8 overflow-y-auto flex justify-center items-start scrollbar-thin scrollbar-thumb-slate-600">
            
            <div 
              id="printable-tax-invoice" 
              className="bg-white text-slate-900 shadow-2xl rounded-sm p-6 sm:p-8 w-full max-w-[210mm] min-h-[297mm] text-[11px] font-sans border border-slate-200 flex flex-col justify-between select-text"
            >
              <div className="space-y-4">
                
                {/* Title */}
                <h1 className="text-center text-lg font-black uppercase tracking-widest border-b border-slate-300 pb-2">
                  INVOICE
                </h1>

                {/* Header Grid */}
                <table className="w-full border-collapse border border-slate-400 text-[11px]">
                  <tbody>
                    <tr>
                      <td className="p-3 border border-slate-400 w-1/2 align-top space-y-1">
                        <img src="/logo.png" alt="Maisarah Logo" className="h-8 object-contain mb-1" />
                        <p className="font-black text-slate-900">Maisarah Auditing and Financial Consultant</p>
                        <p className="text-[10px]">C.R No: 1475532</p>
                        <p className="text-[10px]">P.O Box No: 2723, P.C, 130</p>
                        <p className="text-[10px]">Ghala Heights, Bousher, Muscat</p>
                        <p className="text-[10px]">Contact : +968-72596534</p>
                        <p className="text-[10px]">E-Mail : info@mafcfinance.com</p>
                        <p className="text-[10px] font-bold text-red-900">https://maisarah.net/</p>
                      </td>
                      <td className="p-0 border border-slate-400 w-1/2 align-top">
                        <table className="w-full text-[10px] border-collapse">
                          <tbody>
                            <tr className="border-b border-slate-300">
                              <td className="p-2 border-r border-slate-300 font-bold bg-slate-50 w-1/2">Invoice No.<br/><span className="text-xs font-black text-slate-900">{invoiceNo}</span></td>
                              <td className="p-2 font-bold bg-slate-50 w-1/2">Dated<br/><span className="text-xs font-black text-slate-900">{invoiceDate}</span></td>
                            </tr>
                            <tr className="border-b border-slate-300">
                              <td className="p-2 border-r border-slate-300 font-medium">Supplier's Ref.</td>
                              <td className="p-2 font-medium">Mode/Terms of Payment</td>
                            </tr>
                            <tr>
                              <td className="p-2 border-r border-slate-300 font-medium">Terms of Delivery</td>
                              <td className="p-2 font-medium">Other Reference(s)</td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    <tr>
                      <td colSpan={2} className="p-3 border border-slate-400 font-bold bg-slate-50/50">
                        <span className="text-[9px] uppercase text-slate-500 font-black block">Buyer</span>
                        <span className="text-sm font-black text-slate-900">{buyerName}</span>
                        <p className="text-xs font-normal text-slate-700">Country : {buyerCountry}</p>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Line Items Table */}
                <table className="w-full border-collapse border border-slate-400 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 font-black text-slate-900 border-b border-slate-400">
                      <th className="p-2 border-r border-slate-400 text-center w-12">Sl No.</th>
                      <th className="p-2 border-r border-slate-400 text-start">Particulars</th>
                      <th className="p-2 border-r border-slate-400 text-center w-16">Quantity</th>
                      <th className="p-2 border-r border-slate-400 text-end w-20">Rate</th>
                      <th className="p-2 text-end w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="h-48 align-top">
                      <td className="p-2 border-r border-slate-400 text-center font-bold">1</td>
                      <td className="p-2 border-r border-slate-400 font-bold text-slate-900">
                        {serviceParticulars}
                        <p className="text-[10px] font-normal italic text-slate-600 mt-1">{buyerName} Ref#{clientData?.quoteNumber || '1455827'}</p>
                      </td>
                      <td className="p-2 border-r border-slate-400 text-center font-medium">1</td>
                      <td className="p-2 border-r border-slate-400 text-end font-medium">{subtotalAmt.toFixed(3)}</td>
                      <td className="p-2 text-end font-black text-slate-900">{subtotalAmt.toFixed(3)}</td>
                    </tr>
                    {includeVat && (
                      <tr className="border-t border-slate-300 font-bold bg-slate-50">
                        <td colSpan={4} className="p-2 text-end border-r border-slate-400">5% Oman VAT</td>
                        <td className="p-2 text-end text-slate-900">{vatAmt.toFixed(3)}</td>
                      </tr>
                    )}
                    <tr className="border-t-2 border-slate-400 font-black bg-slate-100 text-sm">
                      <td colSpan={4} className="p-2 text-end border-r border-slate-400 uppercase">Total</td>
                      <td className="p-2 text-end text-red-900">OMR {grandTotal.toFixed(3)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Amount in words */}
                <div className="border border-slate-400 p-2.5 bg-slate-50 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[9px] uppercase font-black text-slate-500 block">Amount Chargeable (in words)</span>
                    <span className="font-black text-slate-900 italic">{convertNumberToWords(grandTotal)}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">E. & O.E</span>
                </div>

              </div>

              {/* Bank Details & Signature */}
              <div className="space-y-4 pt-4 border-t border-slate-300 mt-6">
                
                <div className="border border-slate-400 p-3 bg-slate-50 grid grid-cols-2 gap-2 text-[10px]">
                  <div className="col-span-2 border-b border-slate-300 pb-1">
                    <span className="font-black text-slate-900 uppercase">Company's Bank Details</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block">A/c Holder's Name:</span>
                    <span className="font-black text-slate-900">Maisarah Auditing and Financial Consultant</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block">Bank Name:</span>
                    <span className="font-black text-slate-900">Bank Muscat</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block">A/c No:</span>
                    <span className="font-black text-slate-900 font-mono">0328074833720016</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block">IBAN:</span>
                    <span className="font-black text-slate-900 font-mono">OM640270328074833720016</span>
                  </div>
                  <div className="col-span-2 border-t border-slate-200 pt-1 flex justify-between items-center">
                    <span className="text-slate-500 font-bold">Branch & SWIFT Code:</span>
                    <span className="font-black text-slate-900 font-mono">Ghala Industrial & BMUSOMRXTBG</span>
                  </div>
                </div>

                <div className="flex justify-between items-end text-[10px] pt-4">
                  <p className="text-[9px] text-slate-400 italic">This is a Computer Generated Invoice</p>
                  <div className="text-end space-y-6">
                    <p className="font-bold text-slate-900">for Maisarah Auditing and Financial Consultant</p>
                    <p className="border-t border-slate-400 pt-1 font-bold text-slate-600 inline-block px-4">Authorised Signatory</p>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

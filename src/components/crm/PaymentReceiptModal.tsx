import React, { useState } from 'react';
import { X, Printer, ShieldCheck } from 'lucide-react';

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientData?: {
    clientName: string;
    companyName?: string;
    email?: string;
    phone?: string;
    totalAmount?: number;
    subtotal?: number;
    quoteNumber?: string;
  };
}

export default function PaymentReceiptModal({ isOpen, onClose, clientData }: PaymentReceiptModalProps) {
  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const receiptNumDefault = `RC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const [receiptNo, setReceiptNo] = useState(receiptNumDefault);
  const [receiptDate, setReceiptDate] = useState(todayStr);
  const [receivedFrom, setReceivedFrom] = useState(clientData?.companyName || clientData?.clientName || 'Valued Client');
  const [amountPaid, setAmountPaid] = useState<number>(clientData?.totalAmount || 350);
  const [paymentMode, setPaymentMode] = useState<'Bank Transfer' | 'Cash' | 'Cheque' | 'Online Card'>('Bank Transfer');
  const [paymentRef, setPaymentRef] = useState('BM-TXN-984723');
  const [paymentDescription, setPaymentDescription] = useState(`Payment towards ${clientData?.quoteNumber ? 'Quotation #' + clientData.quoteNumber : 'Accounting & Tax Retainer'}`);
  const [receivedBy, setReceivedBy] = useState('Maisarah Accounts Desk');

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
          #printable-payment-receipt, #printable-payment-receipt * { visibility: visible !important; }
          #printable-payment-receipt {
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
            <div className="p-2.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-xl">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="font-black text-white text-base tracking-wide flex items-center gap-2">
                Official Payment Receipt Voucher Generator (سند قبض رسمى)
              </h3>
              <p className="text-[11px] text-slate-400">
                Generate official proof of payment voucher for client accounts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/30"
            >
              <Printer size={15} /> Print / Export Receipt PDF
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
            <h4 className="text-xs font-black uppercase tracking-widest text-blue-400 border-b border-slate-800 pb-2">
              Receipt Parameters
            </h4>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Receipt Voucher No.</label>
              <input
                type="text"
                value={receiptNo}
                onChange={e => setReceiptNo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Payment Date</label>
              <input
                type="text"
                value={receiptDate}
                onChange={e => setReceiptDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Received From (Client / Company)</label>
              <input
                type="text"
                value={receivedFrom}
                onChange={e => setReceivedFrom(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Amount Paid (OMR)</label>
              <input
                type="number"
                step="0.001"
                value={amountPaid}
                onChange={e => setAmountPaid(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 text-blue-400 font-black rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={e => setPaymentMode(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
              >
                <option value="Bank Transfer">Bank Transfer (Bank Muscat)</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Online Card">Online Card Payment</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Payment Ref / Transaction No.</label>
              <input
                type="text"
                value={paymentRef}
                onChange={e => setPaymentRef(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Towards / Description</label>
              <textarea
                rows={2}
                value={paymentDescription}
                onChange={e => setPaymentDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Received By (Staff Name)</label>
              <input
                type="text"
                value={receivedBy}
                onChange={e => setReceivedBy(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
              />
            </div>

          </div>

          {/* Right Live Document Preview Studio (A4 Sheet Format) */}
          <div className="w-full md:w-2/3 bg-slate-800 p-4 sm:p-8 overflow-y-auto flex justify-center items-start scrollbar-thin scrollbar-thumb-slate-600">
            
            <div 
              id="printable-payment-receipt" 
              className="bg-white text-slate-900 shadow-2xl rounded-sm p-6 sm:p-8 w-full max-w-[210mm] min-h-[200mm] text-[11px] font-sans border border-slate-200 flex flex-col justify-between select-text"
            >
              <div className="space-y-6">
                
                {/* Header Branding */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                  <div className="space-y-1">
                    <img src="/logo.png" alt="Maisarah Logo" className="h-10 object-contain" />
                    <h2 className="text-base font-black text-slate-900 uppercase">
                      MAISARAH AUDITING AND FINANCIAL CONSULTANT
                    </h2>
                    <p className="text-[10px] text-slate-500 font-bold">
                      C.R No: 1475532 &bull; P.O Box 2723, P.C 130, Ghala Heights, Muscat
                    </p>
                    <p className="text-[10px] text-slate-500">Contact: +968-72596534 | Email: info@mafcfinance.com</p>
                  </div>

                  <div className="text-end space-y-1">
                    <span className="bg-slate-900 text-white px-3 py-1.5 font-black uppercase text-xs rounded-sm inline-block">
                      OFFICIAL RECEIPT
                    </span>
                    <p className="text-xs font-black text-slate-900 pt-1">{receiptNo}</p>
                    <p className="text-[10px] text-slate-500 font-bold">Date: {receiptDate}</p>
                  </div>
                </div>

                {/* Amount Highlight Box */}
                <div className="bg-blue-50 border-2 border-blue-900 p-4 rounded-sm flex justify-between items-center">
                  <div>
                    <span className="text-[9px] uppercase font-black text-blue-900 block">AMOUNT RECEIVED</span>
                    <span className="text-2xl font-black text-blue-950">OMR {amountPaid.toFixed(3)}</span>
                  </div>
                  <div className="text-end">
                    <span className="text-[9px] uppercase font-black text-blue-900 block">PAYMENT MODE</span>
                    <span className="text-sm font-black text-slate-800">{paymentMode} ({paymentRef})</span>
                  </div>
                </div>

                {/* Receipt Details Table */}
                <div className="border border-slate-300 divide-y divide-slate-300 text-xs">
                  <div className="p-3 flex justify-between items-center bg-slate-50">
                    <span className="font-black text-slate-600 uppercase w-36">Received From:</span>
                    <span className="font-black text-slate-900 text-sm flex-1">{receivedFrom}</span>
                  </div>

                  <div className="p-3 flex justify-between items-center">
                    <span className="font-black text-slate-600 uppercase w-36">Sum of Rials:</span>
                    <span className="font-black text-blue-950 italic flex-1">{convertNumberToWords(amountPaid)}</span>
                  </div>

                  <div className="p-3 flex justify-between items-center bg-slate-50">
                    <span className="font-black text-slate-600 uppercase w-36">Payment For / Scope:</span>
                    <span className="font-bold text-slate-800 flex-1">{paymentDescription}</span>
                  </div>
                </div>

                {/* Bank Muscat Guarantee Details */}
                <div className="border border-slate-200 p-3 bg-slate-50/50 rounded-sm text-[10px] grid grid-cols-2 gap-2">
                  <div className="col-span-2 border-b border-slate-200 pb-1 font-black text-slate-700 uppercase">
                    CREDITED TO MAISARAH BANK MUSCAT ACCOUNT
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold">Bank Name:</span>
                    <span className="font-bold text-slate-800">Bank Muscat (Ghala Branch)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold">Account Number:</span>
                    <span className="font-mono font-bold text-slate-900">0328074833720016</span>
                  </div>
                </div>

              </div>

              {/* Signatures */}
              <div className="pt-6 border-t-2 border-slate-900 flex justify-between items-end text-[10px] mt-8">
                <div>
                  <p className="font-bold text-slate-700">Received By: <span className="font-black text-slate-900">{receivedBy}</span></p>
                  <p className="text-[9px] text-slate-400 italic">This is an official computer-generated receipt voucher.</p>
                </div>

                <div className="text-end space-y-6">
                  <p className="font-black text-slate-900">For Maisarah Auditing & Financial Consultant</p>
                  <p className="border-t border-slate-400 pt-1 font-bold text-slate-600 inline-block px-6">Authorized Accounts Stamp</p>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

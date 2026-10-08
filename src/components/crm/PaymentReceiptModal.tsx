import React, { useState, useEffect } from 'react';
import { X, Printer, ShieldCheck, FileCheck, Building2, Check, Download, Sparkles } from 'lucide-react';

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientData?: {
    clientName?: string;
    companyName?: string;
    registrationNumber?: string;
    contactPhone?: string;
    totalAmount?: number;
    subtotal?: number;
    quoteNumber?: string;
    receiptNumber?: string;
    serviceName?: string;
    paymentMode?: string;
    paymentDate?: string;
    narration?: string;
  };
}

export default function PaymentReceiptModal({
  isOpen,
  onClose,
  clientData
}: PaymentReceiptModalProps) {
  const [receiptType, setReceiptType] = useState<'Payment Receipt' | 'Payment Out'>('Payment Receipt');
  const [receiptNo, setReceiptNo] = useState('REC-2026-8801');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateOfSupply, setDateOfSupply] = useState(new Date().toISOString().split('T')[0]);
  const [paidToName, setPaidToName] = useState('Client Company LLC');
  const [crNumber, setCrNumber] = useState('1527047');
  const [contactPhone, setContactPhone] = useState('+968 72596534');
  const [poBoxAddress] = useState('Ghala Heights, Bousher, Muscat');
  const [amountPaid, setAmountPaid] = useState<number>(30);
  const [paymentMode, setPaymentMode] = useState('Mobile Payment (Bank Muscat / BenefitPay)');
  const [transDateTime, setTransDateTime] = useState('');
  const [narrationRef, setNarrationRef] = useState('VAT Return Filing & Tax Clearance Q2 2026');
  const [orderTakerSignatory, setOrderTakerSignatory] = useState('Maisarah Authorized Accountant');

  useEffect(() => {
    if (clientData) {
      if (clientData.clientName || clientData.companyName) {
        setPaidToName(clientData.companyName || clientData.clientName || 'Client');
      }
      if (clientData.registrationNumber) {
        setCrNumber(clientData.registrationNumber);
      }
      if (clientData.contactPhone) {
        setContactPhone(clientData.contactPhone);
      }
      if (clientData.totalAmount !== undefined && clientData.totalAmount > 0) {
        setAmountPaid(clientData.totalAmount);
      }
      if (clientData.receiptNumber || clientData.quoteNumber) {
        setReceiptNo(clientData.receiptNumber || `REC-${clientData.quoteNumber}`);
      }
      if (clientData.serviceName) {
        setNarrationRef(clientData.serviceName);
      }
      if (clientData.paymentMode) {
        setPaymentMode(clientData.paymentMode);
      }
      if (clientData.paymentDate) {
        setReceiptDate(clientData.paymentDate);
        setDateOfSupply(clientData.paymentDate);
      }
    }
    const now = new Date();
    setTransDateTime(now.toLocaleDateString() + ' ' + now.toLocaleTimeString());
  }, [clientData, isOpen]);

  if (!isOpen) return null;

  // Amount in words helper
  const convertNumberToWords = (num: number): string => {
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n: number): string => {
      if (n === 0) return 'Zero';
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
      if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + inWords(n % 100) : '');
      if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
      return n.toString();
    };

    const whole = Math.floor(num);
    const baisa = Math.round((num - whole) * 1000);
    let result = inWords(whole) + ' Omani Rial';
    if (whole !== 1) result += 's';
    if (baisa > 0) {
      result += ' and ' + inWords(baisa) + ' Baisa';
    }
    result += ' only';
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
            max-width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
            z-index: 999999 !important;
          }
        }
      `}</style>

      <div className="bg-slate-950 rounded-3xl w-full max-w-7xl h-[94vh] shadow-2xl flex flex-col overflow-hidden border border-slate-800 animate-in fade-in zoom-in duration-200 text-white">
        
        {/* Top Action Bar */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#A11212]/20 border border-red-500/30 text-red-400 rounded-xl">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="font-black text-white text-base tracking-wide flex items-center gap-2">
                Official Payment & Receipt Voucher Studio (سند مالي رسمي)
              </h3>
              <p className="text-[11px] text-slate-400">
                Official Proof of Payment &bull; Maisarah Auditing & Financial Services
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-[#A11212] hover:bg-red-800 text-white text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-red-900/30 cursor-pointer"
            >
              <Printer size={15} /> Print / Save PDF
            </button>

            <button 
              onClick={onClose} 
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Studio Body: Left Controls + Right Live Voucher */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Parameter Controls */}
          <div className="w-full md:w-1/3 p-6 overflow-y-auto space-y-4 bg-slate-900 border-r border-slate-800 text-xs">
            <h4 className="text-xs font-black uppercase tracking-widest text-red-400 border-b border-slate-800 pb-2">
              Voucher Parameters
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Voucher Type</label>
                <select
                  value={receiptType}
                  onChange={e => setReceiptType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:border-red-500"
                >
                  <option value="Payment Receipt">Payment Receipt (سند قبض)</option>
                  <option value="Payment Out">Payment Out (سند صرف)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Voucher No.</label>
                <input
                  type="text"
                  value={receiptNo}
                  onChange={e => setReceiptNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Date</label>
                <input
                  type="date"
                  value={receiptDate}
                  onChange={e => setReceiptDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Date of Supply</label>
                <input
                  type="date"
                  value={dateOfSupply}
                  onChange={e => setDateOfSupply(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                {receiptType === 'Payment Receipt' ? 'Received From (Customer / Client)' : 'Paid To (Recipient)'}
              </label>
              <input
                type="text"
                value={paidToName}
                onChange={e => setPaidToName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-red-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">C.R No (7-Digits)</label>
                <input
                  type="text"
                  maxLength={7}
                  value={crNumber}
                  onChange={e => setCrNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-2.5 py-2 text-xs font-mono font-bold outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Paid Amount (OMR)</label>
              <input
                type="number"
                step="0.001"
                value={amountPaid}
                onChange={e => setAmountPaid(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 text-red-400 font-black rounded-xl px-3 py-2 text-sm outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Payment Method</label>
              <input
                type="text"
                value={paymentMode}
                onChange={e => setPaymentMode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Service Narration / Purpose</label>
              <textarea
                rows={2}
                value={narrationRef}
                onChange={e => setNarrationRef(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Authorized Signatory Title</label>
              <input
                type="text"
                value={orderTakerSignatory}
                onChange={e => setOrderTakerSignatory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Right Live Document Preview Studio (Sleek Minimalist Voucher) */}
          <div className="w-full md:w-2/3 bg-slate-850 p-4 sm:p-8 overflow-y-auto flex justify-center items-start scrollbar-thin scrollbar-thumb-slate-600">
            
            <div 
              id="printable-payment-receipt" 
              className="bg-white text-slate-900 shadow-2xl rounded-sm p-8 sm:p-10 w-full max-w-[210mm] min-h-[260mm] font-sans border border-slate-200 flex flex-col justify-between select-text"
              style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif" }}
            >
              <div className="space-y-6">
                
                {/* ── 1. Elegant Header & Branding ── */}
                <div className="flex items-start justify-between pb-5 border-b-2 border-slate-900 gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-9 h-9 rounded-xl bg-[#A11212] flex items-center justify-center text-white font-black text-sm shadow-sm">
                        M
                      </div>
                      <div>
                        <h2 className="text-base font-black text-slate-900 tracking-tight leading-none">
                          MAISARAH AUDITING & FINANCIAL CONSULTANT
                        </h2>
                        <p className="text-[11px] font-bold text-slate-500 font-serif" dir="rtl">
                          ميسرة لتدقيق الحسابات والاستشارات المالية (مركز الخدمات)
                        </p>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 space-y-0.5 mt-2">
                      <p>CR No: <span className="font-mono font-bold text-slate-800">1475532</span> &bull; VAT Reg: <span className="font-mono font-bold text-slate-800">OM1100244153</span></p>
                      <p>Ghala Heights, Al-Jami Al-Akbar St, Muscat, Sultanate of Oman</p>
                      <p>Tel: <span className="font-mono text-slate-800">+968 72596534 / 79995571</span> &bull; Email: <span className="font-mono text-slate-800">accounts@maisarah.om</span></p>
                    </div>
                  </div>

                  {/* Document Badge */}
                  <div className="text-end shrink-0">
                    <div className="inline-block bg-[#A11212] text-white px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm">
                      {receiptType === 'Payment Receipt' ? 'PAYMENT RECEIPT (سند قبض)' : 'PAYMENT VOUCHER (سند صرف)'}
                    </div>
                    <div className="text-[11px] mt-2 space-y-0.5 font-mono text-slate-600">
                      <p><span className="text-slate-400 font-sans font-bold">Voucher No:</span> <strong className="text-slate-900">{receiptNo}</strong></p>
                      <p><span className="text-slate-400 font-sans font-bold">Date:</span> <strong>{receiptDate}</strong></p>
                    </div>
                  </div>
                </div>

                {/* ── 2. Client / Counterparty Information Card ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                      {receiptType === 'Payment Receipt' ? 'Received From (الطرف الدافع)' : 'Paid To (الطرف المستلم)'}
                    </span>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">{paidToName}</h3>
                    <p className="text-[11px] text-slate-600 mt-1 font-mono">
                      C.R No: <strong className="text-slate-900">{crNumber || '—'}</strong>
                    </p>
                    {contactPhone && (
                      <p className="text-[11px] text-slate-600 font-mono">
                        Phone: <strong className="text-slate-900">{contactPhone}</strong>
                      </p>
                    )}
                  </div>

                  <div className="sm:border-s sm:border-slate-200 sm:ps-4 space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                      Payment Details (بيانات السداد)
                    </span>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 font-medium">Payment Mode:</span>
                      <strong className="text-slate-900">{paymentMode}</strong>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 font-medium">Date of Supply:</span>
                      <strong className="text-slate-900 font-mono">{dateOfSupply}</strong>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 font-medium">Status:</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">
                        Cleared & Verified
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── 3. Prominent Amount Highlight Card ── */}
                <div className="p-4 bg-gradient-to-r from-red-50 to-amber-50 rounded-xl border-2 border-red-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase text-red-900 tracking-wider block">
                      {receiptType === 'Payment Receipt' ? 'Amount Received (المبلغ المستلم)' : 'Amount Disbursed (المبلغ المصروف)'}
                    </span>
                    <p className="text-xs font-bold text-slate-800 italic mt-0.5">
                      {convertNumberToWords(amountPaid)}
                    </p>
                  </div>

                  <div className="text-end shrink-0">
                    <span className="text-2xl sm:text-3xl font-black text-[#A11212] font-mono tracking-tight">
                      OMR {amountPaid.toFixed(3)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold block font-serif" dir="rtl">
                      {amountPaid.toFixed(3)} ريال عماني
                    </span>
                  </div>
                </div>

                {/* ── 4. Service Narration & Reference ── */}
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <div className="bg-slate-100 px-4 py-2 font-black text-slate-700 uppercase tracking-wider text-[10px] flex justify-between">
                    <span>Particulars & Purpose (البيان والخدمة)</span>
                    <span className="font-mono font-normal text-slate-500">Ref: {transDateTime}</span>
                  </div>
                  <div className="p-4 bg-white text-slate-800 space-y-1">
                    <p className="font-bold text-sm text-slate-900">{narrationRef}</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Official transaction settlement recorded under Maisarah Financial Ledger & DSR Daily Register.
                    </p>
                  </div>
                </div>

                {/* ── 5. Official Verification Stamp & Signatures ── */}
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200 text-xs">
                  {/* Client / Payee Signature */}
                  <div className="p-4 rounded-xl border border-slate-200 flex flex-col justify-between min-h-[120px]">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      {receiptType === 'Payment Receipt' ? 'Payer / Client Signature' : 'Recipient Signature'}
                    </span>
                    <div className="text-center pt-8 border-t border-dashed border-slate-300">
                      <span className="text-[11px] text-slate-500 font-medium">Authorized Signatory / Seal</span>
                    </div>
                  </div>

                  {/* Maisarah Official Stamp */}
                  <div className="p-4 rounded-xl border border-slate-200 flex flex-col justify-between min-h-[120px] bg-slate-50/50 relative">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      For Maisarah Auditing & Financial
                    </span>

                    {/* Official Stamp */}
                    <div className="my-auto self-center">
                      <div className="w-28 h-10 border-2 border-[#A11212] rounded-lg flex flex-col items-center justify-center text-[9px] font-black text-[#A11212] rotate-[-2deg] bg-red-50/60 shadow-xs">
                        <span>MAISARAH AUDIT</span>
                        <span className="text-[7px] text-slate-600 font-bold tracking-widest">OFFICIALLY VERIFIED</span>
                      </div>
                    </div>

                    <div className="text-center pt-2 border-t border-dashed border-slate-300">
                      <span className="text-[11px] text-slate-700 font-bold">{orderTakerSignatory}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* ── Bottom Modern Footer ── */}
              <div className="pt-4 border-t border-slate-200 mt-6 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400 font-medium gap-1">
                <span>Maisarah Auditing & Financial Services &bull; Sultanate of Oman</span>
                <span>Computer Generated Official Voucher &bull; Bank Muscat A/C: 0328074833720016</span>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

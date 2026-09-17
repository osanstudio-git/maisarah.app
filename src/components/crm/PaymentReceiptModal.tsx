import React, { useState, useEffect } from 'react';
import { X, Printer, ShieldCheck, Download, Check, Sparkles, Building2 } from 'lucide-react';

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientData?: {
    clientName?: string;
    companyName?: string;
    registrationNumber?: string;
    email?: string;
    phone?: string;
    totalAmount?: number;
    subtotal?: number;
    quoteNumber?: string;
    serviceName?: string;
    date?: string;
    dateOfSupply?: string;
    paymentMode?: string;
    transactionRef?: string;
    narration?: string;
    receivedBy?: string;
    receiptType?: 'Payment Out' | 'Payment Receipt';
  };
}

export default function PaymentReceiptModal({ isOpen, onClose, clientData }: PaymentReceiptModalProps) {
  if (!isOpen) return null;

  const formatDateGB = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const todayStr = formatDateGB(new Date());
  const yesterdayStr = formatDateGB(new Date(Date.now() - 86400000));
  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  const receiptNumDefault = clientData?.quoteNumber
    ? `MS/r${clientData.quoteNumber.replace(/[^0-9]/g, '') || Math.floor(1000000 + Math.random() * 9000000)} /26`
    : `MS/r${Math.floor(1000000 + Math.random() * 9000000)} /26`;

  // Editable parameters
  const [receiptType, setReceiptType] = useState<'Payment Out' | 'Payment Receipt'>('Payment Out');
  const [receiptNo, setReceiptNo] = useState(receiptNumDefault);
  const [receiptDate, setReceiptDate] = useState(clientData?.date ? formatDateGB(new Date(clientData.date)) : todayStr);
  const [dateOfSupply, setDateOfSupply] = useState(clientData?.dateOfSupply || yesterdayStr);
  
  const [paidToName, setPaidToName] = useState(
    clientData?.companyName || clientData?.clientName || 'Maisarah Auditing and Financial (Feasibility)'
  );
  const [crNumber, setCrNumber] = useState(clientData?.registrationNumber || '1475532');
  const [poBoxAddress, setPoBoxAddress] = useState('P.O Box No: 2723, P.C, 130 Ghala Heights Bousher, Muscat');
  const [contactPhone, setContactPhone] = useState(clientData?.phone || '+968 72596534');

  const [amountPaid, setAmountPaid] = useState<number>(clientData?.totalAmount || clientData?.subtotal || 30.000);
  const [paymentMode, setPaymentMode] = useState<string>(
    clientData?.paymentMode || 'ONLINE (MAISARAH SERVICE CENTER) (ONLINE/732107272)'
  );
  const [transDateTime, setTransDateTime] = useState(`${todayStr} ${timeStr}`);
  const [narrationRef, setNarrationRef] = useState(
    clientData?.narration || `${clientData?.serviceName ? clientData.serviceName.toLowerCase() : 'accounting wrk'} cr${clientData?.registrationNumber || '1674488'} ref ${clientData?.quoteNumber || 'safa'}`
  );
  const [orderTakerSignatory, setOrderTakerSignatory] = useState(clientData?.receivedBy || 'Order Taker Signatory');

  // Convert amount to words in English
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
    let result = inWords(whole) + ' Rial';
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
            padding: 30px !important;
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
            <div className="p-2.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="font-black text-white text-base tracking-wide flex items-center gap-2">
                Official Payment Out / Receipt Voucher (سند صرف وقبض رسمي)
              </h3>
              <p className="text-[11px] text-slate-400">
                Official Omani Service Center Format &bull; Maisarah Auditing & Financial
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-amber-600/30 cursor-pointer"
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
            <h4 className="text-xs font-black uppercase tracking-widest text-amber-400 border-b border-slate-800 pb-2">
              Voucher Parameters
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Voucher Title</label>
                <select
                  value={receiptType}
                  onChange={e => setReceiptType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:border-amber-500"
                >
                  <option value="Payment Out">Payment Out</option>
                  <option value="Payment Receipt">Payment Receipt</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Receipt No.</label>
                <input
                  type="text"
                  value={receiptNo}
                  onChange={e => setReceiptNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Date</label>
                <input
                  type="text"
                  value={receiptDate}
                  onChange={e => setReceiptDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Date of Supply</label>
                <input
                  type="text"
                  value={dateOfSupply}
                  onChange={e => setDateOfSupply(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Paid To / Customer Name</label>
              <input
                type="text"
                value={paidToName}
                onChange={e => setPaidToName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">C.R No</label>
                <input
                  type="text"
                  value={crNumber}
                  onChange={e => setCrNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Contact No</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Address / P.O Box</label>
              <input
                type="text"
                value={poBoxAddress}
                onChange={e => setPoBoxAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Paid Amount (OMR)</label>
              <input
                type="number"
                step="0.001"
                value={amountPaid}
                onChange={e => setAmountPaid(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 text-amber-400 font-black rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Payment Mode</label>
              <input
                type="text"
                value={paymentMode}
                onChange={e => setPaymentMode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Transaction Date and Time</label>
              <input
                type="text"
                value={transDateTime}
                onChange={e => setTransDateTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Narration Reference</label>
              <textarea
                rows={2}
                value={narrationRef}
                onChange={e => setNarrationRef(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Authorized Signatory Label</label>
              <input
                type="text"
                value={orderTakerSignatory}
                onChange={e => setOrderTakerSignatory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Right Live Document Preview Studio */}
          <div className="w-full md:w-2/3 bg-slate-800 p-4 sm:p-8 overflow-y-auto flex justify-center items-start scrollbar-thin scrollbar-thumb-slate-600">
            
            {/* The Document Container matching the exact uploaded PDF layout */}
            <div 
              id="printable-payment-receipt" 
              className="bg-white text-black shadow-2xl rounded-sm p-8 sm:p-10 w-full max-w-[210mm] min-h-[260mm] font-sans border border-slate-300 flex flex-col justify-between select-text"
              style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}
            >
              <div className="space-y-4">
                
                {/* 1. Header Title */}
                <h1 className="text-2xl sm:text-3xl font-bold text-center tracking-tight text-gray-900 pb-2">
                  {receiptType}
                </h1>

                {/* 2. Company Info Box (With Logo & Arabic/English Details) */}
                <div className="border border-gray-900 p-4 rounded-none flex items-start gap-4">
                  {/* Maisarah Geometric / Gold Logo mark */}
                  <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center">
                    <img 
                      src="/logo.png" 
                      alt="Maisarah Logo" 
                      className="max-h-20 max-w-full object-contain"
                      onError={(e) => {
                        // Fallback SVG mark
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="w-20 h-20 bg-gradient-to-br from-amber-600 via-red-800 to-red-950 rounded-xl flex flex-col items-center justify-center p-2 text-white shadow-md text-center">
                      <span className="text-xs font-black tracking-widest text-amber-300">ميسرة</span>
                      <span className="text-[7px] uppercase font-bold tracking-tighter text-white/90">MAISARAH</span>
                    </div>
                  </div>

                  {/* Company English and Arabic text */}
                  <div className="flex-1 text-start space-y-1">
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center justify-between flex-wrap">
                      <span>MAISARAH SERVICE CENTER</span>
                      <span className="font-serif font-bold text-gray-800" dir="rtl">(مركز ميسرة للخدمات)</span>
                    </h2>
                    
                    <p className="text-[11px] text-gray-700 leading-tight">
                      Ghala Industrial Area, Muscat, Oman<br />
                      Opposite Al Maha Petrol Station, near Oman LNG Head Office, on Al-Jami Al-Akbar Street Building No: 271
                    </p>
                    
                    <p className="text-[11px] text-gray-700 text-end font-serif leading-tight pt-0.5" dir="rtl">
                      منطقة غلا الصناعية، مسقط، عُمان<br />
                      مقابل محطة وقود المها، بالقرب من المكتب الرئيسي لشركة عمان للغاز الطبيعي المسال، على شارع الجامع الأكبر، مبنى رقم: 271
                    </p>

                    <div className="pt-2 flex justify-between items-center text-[11px] font-bold text-gray-800 border-t border-gray-300 mt-1">
                      <span>Phone: +968 72596534 / 79995571</span>
                      <span>Email: accounts@maisarah.om</span>
                    </div>
                  </div>
                </div>

                {/* 3. Paid To & Receipt Details (Two Box Grid) */}
                <div className="grid grid-cols-12 border border-gray-900 text-xs">
                  {/* Paid To Box */}
                  <div className="col-span-7 p-3 border-e border-gray-900 space-y-1">
                    <p className="font-bold text-gray-900 text-xs">Paid To:</p>
                    <p className="font-bold text-gray-900 text-sm leading-tight">{paidToName}</p>
                    <p className="text-[11px] text-gray-700 font-mono">C.R No: {crNumber} {poBoxAddress}</p>
                    <p className="text-[11px] text-gray-800 font-medium">Contact No: {contactPhone}</p>
                  </div>

                  {/* Receipt Details Box */}
                  <div className="col-span-5 p-3 space-y-1.5 text-xs">
                    <p className="font-bold text-gray-900">Receipt Details:</p>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Receipt No.:</span>
                      <span className="font-bold text-gray-900 font-mono">{receiptNo}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Date:</span>
                      <span className="font-bold text-gray-900 font-mono">{receiptDate}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Date of Supply:</span>
                      <span className="font-bold text-gray-900 font-mono">{dateOfSupply}</span>
                    </div>
                  </div>
                </div>

                {/* 4. Payment Mode & Amount Table */}
                <div className="border border-gray-900 text-xs">
                  <div className="grid grid-cols-12 border-b border-gray-900">
                    <div className="col-span-8 p-3 border-e border-gray-900">
                      <p className="font-bold text-gray-900 mb-1">Payment Mode:</p>
                      <p className="font-medium text-gray-800 font-mono text-[11px]">{paymentMode}</p>
                    </div>

                    <div className="col-span-4 p-3 flex flex-col justify-between">
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-gray-900">Paid</span>
                        <span className="font-black text-sm text-gray-900 font-mono">
                          : {amountPaid.toFixed(3)} ر.ع.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Amount in Words */}
                  <div className="p-3 bg-gray-50/50">
                    <p className="font-bold text-gray-900 mb-0.5">Amount in Words:</p>
                    <p className="font-semibold text-gray-800 text-xs italic">{convertNumberToWords(amountPaid)}</p>
                  </div>
                </div>

                {/* 5. Description & Narration Box */}
                <div className="border border-gray-900 p-3 space-y-2 text-xs">
                  <p className="font-bold text-gray-900">Description:</p>
                  <div>
                    <p className="text-gray-600 text-[11px]">Transaction Date and Time:</p>
                    <p className="font-mono text-gray-900 font-semibold">{transDateTime}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-[11px]">Narration Reference:</p>
                    <p className="font-mono text-gray-900 font-semibold">{narrationRef}</p>
                  </div>
                </div>

                {/* 6. Signatories & Stamps Box */}
                <div className="grid grid-cols-2 border border-gray-900 text-xs min-h-[140px]">
                  {/* Customer's Seal & Signature */}
                  <div className="p-3 border-e border-gray-900 flex flex-col justify-between">
                    <p className="font-bold text-gray-900">Customer’s Seal & Signature:</p>
                    <div className="text-center pt-10 pb-1">
                      <p className="text-gray-600 text-xs border-t border-dotted border-gray-400 pt-1">Customer Signatory</p>
                    </div>
                  </div>

                  {/* For Maisarah Service Center Signatory */}
                  <div className="p-3 flex flex-col justify-between relative">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-gray-900">For MAISARAH SERVICE CENTER (مركز ميسرة للخدمات):</p>
                    </div>

                    {/* Gold Official Seal Stamp Box */}
                    <div className="my-auto text-center flex flex-col items-center justify-center">
                      <div className="w-24 h-12 bg-amber-500/10 border-2 border-amber-600 rounded-lg flex flex-col items-center justify-center text-[9px] font-bold text-amber-800 shadow-sm rotate-[-2deg]">
                        <span className="font-black text-amber-900 uppercase tracking-tighter">MAISARAH AUDIT</span>
                        <span className="text-[7px]">OFFICIALLY VERIFIED</span>
                      </div>
                    </div>

                    <div className="text-center pt-2 pb-1">
                      <p className="text-gray-600 text-xs border-t border-dotted border-gray-400 pt-1">
                        {orderTakerSignatory}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom Official Footer */}
              <div className="pt-4 text-center text-[10px] text-gray-400 border-t border-gray-200 mt-6 flex justify-between items-center">
                <span>Maisarah Financial & Auditing Services &bull; Sultanate of Oman</span>
                <span>System Generated Official Payment Receipt &bull; Tax VAT Reg: OM1100244153</span>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

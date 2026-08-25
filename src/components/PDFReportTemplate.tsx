import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';

interface PDFData {
  type: 'invoice' | 'report';
  number: string;
  date: string;
  dueDate?: string;
  client: {
    name: string;
    cr: string;
    vat: string;
    address: string;
  };
  items: Array<{
    description: string;
    qty: number;
    price: number;
    total: number;
  }>;
  totalAmount: number;
  vatAmount: number;
  grandTotal: number;
  preparedBy?: string;
}

export const PDFReportTemplate = forwardRef<HTMLDivElement, { data: PDFData }>((props, ref) => {
  const { data } = props;
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  return (
    <div ref={ref} className="p-10 bg-white text-gray-800 font-sans" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Branded Header */}
      <div className="flex justify-between items-start border-b-4 border-brand-dark pb-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-brand-dark rounded-xl flex items-center justify-center text-white font-black text-3xl">
            م
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">ميسرة | MAISARAH</h1>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">
              {isAr ? 'للحلول المالية والمحاسبية' : 'Financial & Accounting Solutions'}
            </p>
          </div>
        </div>
        <div className="text-end">
          <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tighter">
            {data.type === 'invoice' ? (isAr ? 'فاتورة ضريبية' : 'Tax Invoice') : (isAr ? 'تقرير مالي' : 'Financial Report')}
          </h2>
          <p className="text-sm font-bold text-gray-500 mt-1">#{data.number}</p>
          <p className="text-xs text-gray-400 mt-0.5">{data.date}</p>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-12 mb-10">
        <div className="space-y-4">
          <h3 className="text-xs font-black text-brand-dark uppercase tracking-widest border-b border-red-100 pb-1 inline-block">
            {isAr ? 'بيانات العميل' : 'Client Information'}
          </h3>
          <div className="space-y-1">
            <p className="text-lg font-black text-gray-900">{data.client.name}</p>
            <p className="text-xs font-bold text-gray-500">{isAr ? 'السجل التجاري:' : 'CR No:'} <span className="text-gray-800">{data.client.cr}</span></p>
            <p className="text-xs font-bold text-gray-500">{isAr ? 'الرقم الضريبي:' : 'VAT No:'} <span className="text-gray-800">{data.client.vat}</span></p>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">{data.client.address}</p>
          </div>
        </div>
        
        <div className="space-y-4 text-end">
          <h3 className="text-xs font-black text-brand-dark uppercase tracking-widest border-b border-red-100 pb-1 inline-block ms-auto">
            {isAr ? 'تفاصيل الدفع' : 'Payment Details'}
          </h3>
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-500">{isAr ? 'تاريخ الاستحقاق:' : 'Due Date:'}</p>
            <p className="text-sm font-black text-gray-900">{data.dueDate || '-'}</p>
            <p className="text-xs font-bold text-gray-500 mt-2">{isAr ? 'طريقة الدفع:' : 'Payment Method:'}</p>
            <p className="text-sm font-bold text-gray-700">{isAr ? 'تحويل بنكي' : 'Bank Transfer'}</p>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <table className="w-full mb-10 border-collapse">
        <thead>
          <tr className="bg-gray-50 border-y border-gray-100">
            <th className="py-4 px-4 text-start text-[10px] font-black text-gray-500 uppercase tracking-widest w-1/2">{isAr ? 'الوصف' : 'Description'}</th>
            <th className="py-4 px-4 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">{isAr ? 'الكمية' : 'Qty'}</th>
            <th className="py-4 px-4 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">{isAr ? 'السعر' : 'Price'}</th>
            <th className="py-4 px-4 text-end text-[10px] font-black text-gray-500 uppercase tracking-widest">{isAr ? 'الإجمالي' : 'Total'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.items.map((item, idx) => (
            <tr key={idx} className="group">
              <td className="py-5 px-4">
                <p className="text-sm font-black text-gray-900">{item.description}</p>
              </td>
              <td className="py-5 px-4 text-center text-sm font-bold text-gray-600">{item.qty}</td>
              <td className="py-5 px-4 text-center text-sm font-bold text-gray-600">{item.price.toFixed(3)}</td>
              <td className="py-5 px-4 text-end text-sm font-black text-gray-900">{item.total.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary Section */}
      <div className="flex justify-end mb-16">
        <div className="w-72 space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-gray-500">
            <span>{isAr ? 'الإجمالي الفرعي' : 'Subtotal'}</span>
            <span>{data.totalAmount.toFixed(3)} OMR</span>
          </div>
          <div className="flex justify-between items-center text-xs font-bold text-gray-500">
            <span>{isAr ? 'ضريبة القيمة المضافة (5%)' : 'VAT (5%)'}</span>
            <span>{data.vatAmount.toFixed(3)} OMR</span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t-2 border-brand-dark">
            <span className="text-sm font-black text-gray-900 uppercase tracking-tight">{isAr ? 'الإجمالي النهائي' : 'Grand Total'}</span>
            <span className="text-lg font-black text-brand-dark">{data.grandTotal.toFixed(3)} OMR</span>
          </div>
        </div>
      </div>

      {/* Signature & Terms */}
      <div className="grid grid-cols-2 gap-20 pt-10 border-t border-gray-100">
        <div>
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">{isAr ? 'الشروط والأحكام' : 'Terms & Conditions'}</h4>
          <p className="text-[9px] text-gray-400 leading-relaxed max-w-xs">
            {isAr 
              ? 'يرجى دفع الفاتورة في غضون 14 يوماً من تاريخ الإصدار. تخضع جميع الخدمات للشروط المتفق عليها مسبقاً.' 
              : 'Please pay the invoice within 14 days of issue. All services are subject to previously agreed terms.'}
          </p>
        </div>
        <div className="text-center space-y-12">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isAr ? 'الختم والتوقيع' : 'Stamp & Signature'}</h4>
          <div className="border-b border-gray-200 w-48 mx-auto"></div>
          <p className="text-[10px] font-bold text-gray-900">{data.preparedBy || 'Maisarah Finance'}</p>
        </div>
      </div>

      {/* Bottom Contact Bar */}
      <div className="mt-20 pt-6 border-t-4 border-gray-50 flex justify-between text-[9px] font-black text-gray-400 uppercase tracking-widest">
        <span>www.maisarah.om</span>
        <span>+968 24XXXXXX</span>
        <span>Muscat, Sultanate of Oman</span>
      </div>
    </div>
  );
});

PDFReportTemplate.displayName = 'PDFReportTemplate';

import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { FileText, Download } from 'lucide-react';
import { PDFReportTemplate } from './PDFReportTemplate';

interface PrintButtonProps {
  data: any;
  label?: string;
  variant?: 'primary' | 'secondary';
}

export const PrintButton: React.FC<PrintButtonProps> = ({ data, label, variant = 'primary' }) => {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Maisarah_${data.type}_${data.number}`,
    onAfterPrint: () => console.log('PDF Generated Successfully'),
  });

  const baseStyles = "px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-sm";
  const variants = {
    primary: "bg-brand-dark text-white hover:bg-red-800 shadow-brand-dark/20",
    secondary: "bg-white text-brand-dark border border-red-100 hover:bg-red-50 shadow-gray-100"
  };

  return (
    <>
      {/* The visible trigger button */}
      <button 
        onClick={() => handlePrint()}
        className={`${baseStyles} ${variants[variant]}`}
      >
        <Download size={18} />
        {label || (data.type === 'invoice' ? 'Generate Invoice' : 'Generate Report')}
      </button>

      {/* Hidden PDF content for background generation */}
      <div className="hidden">
        <div className="bg-white">
          <PDFReportTemplate ref={componentRef} data={data} />
        </div>
      </div>
    </>
  );
};

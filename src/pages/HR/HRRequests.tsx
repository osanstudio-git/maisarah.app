import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClipboardCheck, Check, X, FileText, Gift, HelpCircle, AlertCircle, PlusCircle, CheckCircle2
} from 'lucide-react';

interface HRRequest {
  id: string;
  employeeName: string;
  type: 'Salary Certificate' | 'Certificate for Relevant Parties' | 'Advance Payment' | 'Allowance Request' | 'Resignation' | 'Department Transfer' | 'Schedule Change' | 'Data Update' | 'Training Request' | 'Equipment/Custody Request';
  submittedDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  details: string;
}

const INITIAL_REQUESTS: HRRequest[] = [
  {
    id: 'REQ-501',
    employeeName: 'Ahmed Al-Kharusi',
    type: 'Salary Certificate',
    submittedDate: '2026-06-29',
    status: 'Pending',
    details: 'Required for bank loan application.'
  },
  {
    id: 'REQ-502',
    employeeName: 'Sara Al-Balushi',
    type: 'Equipment/Custody Request',
    submittedDate: '2026-06-28',
    status: 'Approved',
    details: 'Requesting Ergonomic Office Chair & Dual Monitor setup.'
  },
  {
    id: 'REQ-503',
    employeeName: 'Mohammed Maamari',
    type: 'Department Transfer',
    submittedDate: '2026-06-25',
    status: 'Pending',
    details: 'Transfer request from Finance Support to Taxation Department.'
  }
];

export default function HRRequests() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [requests, setRequests] = useState<HRRequest[]>(INITIAL_REQUESTS);
  const [showModal, setShowModal] = useState(false);
  const [newRequest, setNewRequest] = useState({
    employeeName: 'Ahmed Al-Kharusi',
    type: 'Salary Certificate' as HRRequest['type'],
    details: ''
  });

  const handleAction = (id: string, status: 'Approved' | 'Rejected') => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const req: HRRequest = {
      id: `REQ-${Math.floor(500 + Math.random() * 500)}`,
      employeeName: newRequest.employeeName,
      type: newRequest.type,
      submittedDate: new Date().toISOString().split('T')[0],
      status: 'Pending',
      details: newRequest.details
    };
    setRequests([req, ...requests]);
    setShowModal(false);
    setNewRequest({ ...newRequest, details: '' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="text-[#A11212]" size={24} />
            {isAr ? 'الطلبات الإلكترونية' : 'Online HR Requests'}
          </h2>
          <p className="text-xs text-gray-500 font-bold">
            {isAr ? 'إدارة واعتماد طلبات الموظفين الخدمية' : 'Manage and authorize employee service requests'}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#A11212] text-white text-xs font-black uppercase tracking-wider px-4.5 py-3 rounded-xl flex items-center gap-1.5 hover:bg-[#800e0e] shadow-sm transition-all"
        >
          <PlusCircle size={16} /> {isAr ? 'تقديم طلب جديد' : 'Submit Service Request'}
        </button>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        {requests.map(req => (
          <div key={req.id} className="border border-gray-150 rounded-2xl p-5 hover:border-gray-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-black text-sm text-gray-900">{req.employeeName}</h4>
                <span className="bg-[#A11212]/5 text-[#A11212] text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {req.type}
                </span>
                <span className="text-[10px] text-gray-400 font-bold">#{req.id}</span>
              </div>
              <p className="text-xs text-gray-600 font-medium">{req.details}</p>
              <p className="text-[10px] text-gray-400 font-bold">Submitted: {req.submittedDate}</p>
            </div>

            <div className="flex items-center gap-3 justify-end">
              <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-md border ${
                req.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-150' :
                req.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-150' :
                'bg-orange-50 text-orange-700 border-orange-150'
              }`}>
                {req.status}
              </span>
              
              {req.status === 'Pending' && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleAction(req.id, 'Rejected')}
                    className="p-2 bg-white border border-gray-200 text-gray-500 rounded-xl hover:text-red-700 hover:border-red-200 transition-colors"
                    title="Reject"
                  >
                    <X size={14} />
                  </button>
                  <button
                    onClick={() => handleAction(req.id, 'Approved')}
                    className="p-2 bg-[#A11212] text-white rounded-xl hover:bg-[#800e0e] transition-colors"
                    title="Approve"
                  >
                    <Check size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">New Service Request Form</h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Employee Name</label>
                <select
                  value={newRequest.employeeName}
                  onChange={(e) => setNewRequest({ ...newRequest, employeeName: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                >
                  <option value="Ahmed Al-Kharusi">Ahmed Al-Kharusi</option>
                  <option value="Sara Al-Balushi">Sara Al-Balushi</option>
                  <option value="Mohammed Maamari">Mohammed Maamari</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Request Type</label>
                <select
                  value={newRequest.type}
                  onChange={(e) => setNewRequest({ ...newRequest, type: e.target.value as any })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                >
                  <option value="Salary Certificate">Salary Certificate (شهادة راتب)</option>
                  <option value="Certificate for Relevant Parties">Certificate for Relevant Parties (شهادة لمن يهمه الأمر)</option>
                  <option value="Advance Payment">Advance Payment (سلفة)</option>
                  <option value="Allowance Request">Allowance Request (بدل)</option>
                  <option value="Resignation">Resignation (استقالة)</option>
                  <option value="Department Transfer">Department Transfer (نقل قسم)</option>
                  <option value="Schedule Change">Schedule Change (تغيير دوام)</option>
                  <option value="Data Update">Data Update (تعديل بيانات)</option>
                  <option value="Training Request">Training Request (طلب تدريب)</option>
                  <option value="Equipment/Custody Request">Equipment/Custody Request (طلب عهدة ومعدات)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Details & Justification</label>
                <textarea
                  required
                  value={newRequest.details}
                  onChange={(e) => setNewRequest({ ...newRequest, details: e.target.value })}
                  placeholder="Specify details, e.g., bank details, equipment models, reasons..."
                  rows={4}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212] resize-none"
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
                  Submit Request
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

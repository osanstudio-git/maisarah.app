import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileCheck, ShieldAlert, PlusCircle, CheckCircle2, Download, UploadCloud, Trash2, Calendar, Clock, AlertTriangle, FileText, X
} from 'lucide-react';

interface EmployeeContract {
  id: string;
  employeeName: string;
  role: string;
  dept: string;
  type: 'Unlimited (غير محدد المدة)' | 'Limited (محدد المدة)' | 'Project-based (عقد مشروع)';
  startDate: string;
  endDate: string;
  probationMonths: number;
  noticeDays: number;
  status: 'Active' | 'Expiring Soon' | 'Expired';
  contractFile?: string;
}

const INITIAL_CONTRACTS: EmployeeContract[] = [
  {
    id: 'CON-801',
    employeeName: 'Ahmed Al-Kharusi',
    role: 'Senior Auditor',
    dept: 'Audit',
    type: 'Unlimited (غير محدد المدة)',
    startDate: '2020-01-15',
    endDate: 'N/A',
    probationMonths: 3,
    noticeDays: 90,
    status: 'Active'
  },
  {
    id: 'CON-802',
    employeeName: 'Sara Al-Balushi',
    role: 'Tax Consultant',
    dept: 'Tax & VAT',
    type: 'Limited (محدد المدة)',
    startDate: '2024-08-01',
    endDate: '2026-08-01',
    probationMonths: 3,
    noticeDays: 30,
    status: 'Expiring Soon'
  },
  {
    id: 'CON-803',
    employeeName: 'Mohammed Maamari',
    role: 'Junior Associate',
    dept: 'Accounting',
    type: 'Limited (محدد المدة)',
    startDate: '2026-03-01',
    endDate: '2027-03-01',
    probationMonths: 3,
    noticeDays: 30,
    status: 'Active'
  }
];

export default function HRContracts() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [contracts, setContracts] = useState<EmployeeContract[]>(INITIAL_CONTRACTS);
  const [selectedConId, setSelectedConId] = useState<string>(INITIAL_CONTRACTS[0].id);
  const [showModal, setShowModal] = useState(false);

  const [newContract, setNewContract] = useState({
    employeeName: 'Ahmed Al-Kharusi',
    type: 'Limited (محدد المدة)' as EmployeeContract['type'],
    startDate: '',
    endDate: '',
    probationMonths: 3,
    noticeDays: 30
  });

  const selectedCon = contracts.find(c => c.id === selectedConId) || contracts[0];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const con: EmployeeContract = {
      id: `CON-${Math.floor(800 + Math.random() * 200)}`,
      employeeName: newContract.employeeName,
      role: newContract.employeeName === 'Ahmed Al-Kharusi' ? 'Senior Auditor' : 'Tax Consultant',
      dept: newContract.employeeName === 'Ahmed Al-Kharusi' ? 'Audit' : 'Tax & VAT',
      type: newContract.type,
      startDate: newContract.startDate,
      endDate: newContract.type === 'Unlimited (غير محدد المدة)' ? 'N/A' : newContract.endDate,
      probationMonths: Number(newContract.probationMonths),
      noticeDays: Number(newContract.noticeDays),
      status: 'Active'
    };
    setContracts([con, ...contracts]);
    setSelectedConId(con.id);
    setShowModal(false);
  };

  const getStatusClass = (status: EmployeeContract['status']) => {
    switch (status) {
      case 'Active':
        return 'bg-green-50 text-green-700 border-green-150';
      case 'Expiring Soon':
        return 'bg-orange-50 text-orange-700 border-orange-150';
      default:
        return 'bg-red-50 text-red-700 border-red-150';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <FileCheck className="text-[#A11212]" size={24} />
            {isAr ? 'إدارة العقود الإلكترونية' : 'Digital Contract Management'}
          </h2>
          <p className="text-xs text-gray-500 font-bold">
            {isAr ? 'إدارة ومتابعة عقود العمل وفترات التجربة والإشعار' : 'Monitor employment agreements, probations, and notices'}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#A11212] text-white text-xs font-black uppercase tracking-wider px-4.5 py-3 rounded-xl flex items-center gap-1.5 hover:bg-[#800e0e] shadow-sm transition-all"
        >
          <PlusCircle size={16} /> {isAr ? 'إنشاء عقد جديد' : 'New Contract'}
        </button>
      </div>

      {/* Main Grid */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[500px]">
        {/* Left Side: Contracts List */}
        <div className="w-full lg:w-1/3 bg-white rounded-2xl border border-gray-100 p-4 space-y-2 shadow-sm">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest px-1 mb-3">Contracts Directory</h3>
          <div className="space-y-2">
            {contracts.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedConId(c.id)}
                className={`w-full p-4 rounded-xl flex items-center justify-between border transition-all text-start ${
                  selectedConId === c.id
                    ? 'bg-[#A11212]/5 border-[#A11212]'
                    : 'bg-white border-gray-100 hover:bg-gray-50'
                }`}
              >
                <div>
                  <h4 className="font-black text-xs text-gray-900">{c.employeeName}</h4>
                  <p className="text-[9px] text-gray-500 font-bold">{c.role}</p>
                </div>
                <div className="text-end">
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${getStatusClass(c.status)}`}>
                    {c.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Contract Inspector */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
          {selectedCon ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start pb-6 border-b border-gray-100 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#A11212] text-white rounded-xl flex items-center justify-center font-black text-xl shadow-sm">
                    {selectedCon.employeeName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-gray-900">{selectedCon.employeeName}</h3>
                    <p className="text-[10px] text-gray-500 font-bold">{selectedCon.role} · {selectedCon.dept}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="bg-gray-50 border border-gray-200 text-gray-700 hover:text-[#A11212] hover:border-[#A11212] text-[10px] font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl flex items-center gap-1 transition-colors">
                    <Download size={14} /> Download Copy
                  </button>
                  <button className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl flex items-center gap-1 hover:bg-gray-800 transition-colors">
                    <UploadCloud size={14} /> Upload Revision
                  </button>
                </div>
              </div>

              {selectedCon.status === 'Expiring Soon' && (
                <div className="bg-orange-50 border border-orange-100 text-orange-850 p-4 rounded-xl flex items-start gap-2.5">
                  <AlertTriangle size={18} className="text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-black">Contract Expiry Warning</p>
                    <p className="text-[10px] text-orange-700 font-medium mt-0.5">This limited contract is scheduled to expire on {selectedCon.endDate}. Propose renewal options with supervisor.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                  <h4 className="text-[10px] font-black text-[#A11212] uppercase tracking-wider">Contract Scope</h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold">Agreement Type</p>
                      <p className="text-xs font-black text-gray-900">{selectedCon.type}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold">Contract Reference ID</p>
                      <p className="text-xs font-black text-gray-900">{selectedCon.id}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                  <h4 className="text-[10px] font-black text-[#A11212] uppercase tracking-wider">Durations & Clauses</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold">Start Date</p>
                      <p className="text-xs font-black text-gray-900">{selectedCon.startDate}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold">End Date</p>
                      <p className="text-xs font-black text-gray-900">{selectedCon.endDate}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold">Probation Period</p>
                      <p className="text-xs font-black text-gray-900">{selectedCon.probationMonths} Months</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold">Notice Period</p>
                      <p className="text-xs font-black text-gray-900">{selectedCon.noticeDays} Days</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              Select a contract from the directory list.
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Draft New Contract</h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Select Employee</label>
                <select
                  value={newContract.employeeName}
                  onChange={(e) => setNewContract({ ...newContract, employeeName: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                >
                  <option value="Ahmed Al-Kharusi">Ahmed Al-Kharusi</option>
                  <option value="Sara Al-Balushi">Sara Al-Balushi</option>
                  <option value="Mohammed Maamari">Mohammed Maamari</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Contract Type</label>
                <select
                  value={newContract.type}
                  onChange={(e) => setNewContract({ ...newContract, type: e.target.value as any })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                >
                  <option value="Limited (محدد المدة)">Limited (محدد المدة)</option>
                  <option value="Unlimited (غير محدد المدة)">Unlimited (غير محدد المدة)</option>
                  <option value="Project-based (عقد مشروع)">Project-based (عقد مشروع)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newContract.startDate}
                    onChange={(e) => setNewContract({ ...newContract, startDate: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                {newContract.type !== 'Unlimited (غير محدد المدة)' && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">End Date</label>
                    <input
                      type="date"
                      required
                      value={newContract.endDate}
                      onChange={(e) => setNewContract({ ...newContract, endDate: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Probation Period (Months)</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={newContract.probationMonths}
                    onChange={(e) => setNewContract({ ...newContract, probationMonths: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Notice Period (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={newContract.noticeDays}
                    onChange={(e) => setNewContract({ ...newContract, noticeDays: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
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
                  Deploy Agreement
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

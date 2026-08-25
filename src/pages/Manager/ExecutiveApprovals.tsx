import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  XCircle,
  FileText,
  FileSignature,
  DollarSign,
  AlertCircle,
  Clock,
  Building2,
  User,
  MessageSquareDiff,
  Download,
  Eye,
  Check
} from 'lucide-react';
import { getAllDepartments } from '../../config/departments';

type ApprovalType = 'quote' | 'contract' | 'expense' | 'hr';
type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';

interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  title: string;
  department: string;
  submitter: string;
  amount?: number;
  client?: string;
  status: ApprovalStatus;
  date: string;
  description: string;
  urgency: 'high' | 'medium' | 'low';
}

const mockRequests: ApprovalRequest[] = [
  {
    id: 'REQ-1042',
    type: 'quote',
    title: 'Audit Services Proposal',
    department: 'Audit',
    submitter: 'Ahmed Al-Kharusi',
    amount: 12500,
    client: 'Oman Telco LLC',
    status: 'pending',
    date: new Date().toISOString(),
    description: 'Annual financial audit proposal for Oman Telco. Includes risk assessment and compliance review. 15% discount applied as per previous agreement.',
    urgency: 'high'
  },
  {
    id: 'REQ-1043',
    type: 'contract',
    title: 'Vendor Agreement Renewal',
    department: 'Internal Support & Administration',
    submitter: 'Sara Al-Balushi',
    status: 'pending',
    date: new Date(Date.now() - 86400000).toISOString(),
    description: 'Renewal of the IT infrastructure support contract with TechSolutions. Terms remain unchanged, but SLA has been tightened to 2 hours for critical issues.',
    urgency: 'medium'
  },
  {
    id: 'REQ-1044',
    type: 'expense',
    title: 'Software Licensing Upgrade',
    department: 'Innovation & Development',
    submitter: 'Mohammed Al-Maamari',
    amount: 4500,
    status: 'pending',
    date: new Date(Date.now() - 172800000).toISOString(),
    description: 'Upgrading the development team to Enterprise tier for Figma and GitHub Copilot to improve workflow efficiency.',
    urgency: 'low'
  },
  {
    id: 'REQ-1045',
    type: 'quote',
    title: 'VAT Implementation Consulting',
    department: 'Tax & VAT',
    submitter: 'Fatma Al-Harthy',
    amount: 8200,
    client: 'Muscat Logistics Group',
    status: 'pending',
    date: new Date(Date.now() - 3600000).toISOString(),
    description: 'Full VAT compliance review and implementation strategy for their new warehouse expansion project.',
    urgency: 'high'
  }
];

const getTypeConfig = (type: ApprovalType) => {
  switch (type) {
    case 'quote': return { icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Quote / Proposal' };
    case 'contract': return { icon: FileSignature, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Contract' };
    case 'expense': return { icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Expense' };
    case 'hr': return { icon: User, color: 'text-green-600', bg: 'bg-green-50', label: 'HR Request' };
  }
};

const ExecutiveApprovals = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [filter, setFilter] = useState<ApprovalType | 'all'>('all');
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [selectedReq, setSelectedReq] = useState<ApprovalRequest | null>(null);

  const filteredRequests = requests.filter(r => filter === 'all' || r.type === filter);

  useEffect(() => {
    const saved = localStorage.getItem('manager_approval_requests');
    if (saved) {
      const parsed = JSON.parse(saved) as ApprovalRequest[];
      const merged = [...parsed];
      mockRequests.forEach(mock => {
        if (!merged.some(m => m.id === mock.id)) {
          merged.push(mock);
        }
      });
      setRequests(merged);
      if (merged.length > 0) setSelectedReq(merged[0]);
    } else {
      localStorage.setItem('manager_approval_requests', JSON.stringify(mockRequests));
      setRequests(mockRequests);
      setSelectedReq(mockRequests[0]);
    }
  }, []);

  const handleAction = (id: string, action: ApprovalStatus) => {
    const updated = requests.map(r => r.id === id ? { ...r, status: action } : r);
    setRequests(updated);
    localStorage.setItem('manager_approval_requests', JSON.stringify(updated));

    if (selectedReq?.id === id) {
      setSelectedReq(prev => prev ? { ...prev, status: action } : null);
    }

    if (action === 'approved' && id === 'PAY-REQ-2026') {
      const payrollDataStr = localStorage.getItem('manager_pending_payroll_data');
      if (payrollDataStr) {
        localStorage.setItem('accountant_pending_payroll', payrollDataStr);
        alert('Payroll has been approved and automatically routed to the Accountant portal!');
      }
    }
  };

  return (
    <div className="space-y-6 pb-10 h-[calc(100vh-6rem)] flex flex-col" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <CheckCircle2 className="text-brand-dark" size={32} />
            {isAr ? 'الاعتمادات التنفيذية' : 'Executive Approvals'}
          </h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            {isAr ? 'المركز الموحد للمراجعة واعتماد الطلبات الهامة' : 'Centralized hub for reviewing and authorizing critical requests'}
          </p>
        </div>

        <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-gray-100">
          {[
            { id: 'all', label: isAr ? 'الكل' : 'All' },
            { id: 'quote', label: isAr ? 'عروض الأسعار' : 'Quotes' },
            { id: 'contract', label: isAr ? 'العقود' : 'Contracts' },
            { id: 'expense', label: isAr ? 'المصروفات' : 'Expenses' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-black tracking-widest uppercase transition-all ${filter === f.id ? 'bg-brand-dark text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Split Pane Layout ─────────────────────────────────────────── */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-[500px]">
        
        {/* LEFT PANE: The Queue */}
        <div className="w-1/3 min-w-[320px] bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
            <h2 className="text-sm font-black text-gray-900 flex items-center gap-2 uppercase tracking-widest">
              <Clock size={16} className="text-brand-dark" />
              {isAr ? 'قائمة الانتظار' : 'Pending Queue'}
            </h2>
            <span className="bg-brand-dark text-white text-[10px] font-black px-2.5 py-1 rounded-lg">
              {filteredRequests.filter(r => r.status === 'pending').length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredRequests.length === 0 ? (
              <div className="text-center p-8 text-gray-400">
                <CheckCircle2 size={32} className="mx-auto mb-2 opacity-20" />
                <p className="font-bold text-sm">{isAr ? 'لا توجد طلبات' : 'Queue is empty'}</p>
              </div>
            ) : (
              filteredRequests.map(req => {
                const config = getTypeConfig(req.type);
                const Icon = config.icon;
                const isSelected = selectedReq?.id === req.id;
                
                return (
                  <div
                    key={req.id}
                    onClick={() => setSelectedReq(req)}
                    className={`p-4 rounded-2xl cursor-pointer border transition-all ${isSelected ? 'border-brand-dark bg-brand-dark/5 shadow-md' : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm'} ${req.status !== 'pending' ? 'opacity-50 grayscale' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bg} ${config.color}`}>
                          <Icon size={14} />
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected ? 'text-brand-dark' : 'text-gray-400'}`}>
                          {req.id}
                        </span>
                      </div>
                      {req.urgency === 'high' && req.status === 'pending' && (
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="High Urgency" />
                      )}
                    </div>
                    
                    <h3 className={`font-black text-sm mb-1 line-clamp-1 ${isSelected ? 'text-brand-dark' : 'text-gray-900'}`}>
                      {req.title}
                    </h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
                      {req.submitter} &bull; {req.department}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANE: Details & Actions */}
        <div className="flex-1 bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col overflow-hidden relative">
          {!selectedReq ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
              <FileText size={64} className="mb-4 opacity-10" />
              <p className="font-bold">{isAr ? 'حدد طلباً لعرض التفاصيل' : 'Select a request to view details'}</p>
            </div>
          ) : (
            <>
              {selectedReq.status !== 'pending' && (
                <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                  <div className={`px-8 py-4 rounded-3xl font-black text-2xl uppercase tracking-widest border-4 transform -rotate-12 ${
                    selectedReq.status === 'approved' ? 'border-green-500 text-green-500' :
                    selectedReq.status === 'rejected' ? 'border-red-500 text-red-500' : 'border-amber-500 text-amber-500'
                  }`}>
                    {selectedReq.status.replace('_', ' ')}
                  </div>
                </div>
              )}

              {/* Detail Header */}
              <div className="p-8 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${getTypeConfig(selectedReq.type).bg} ${getTypeConfig(selectedReq.type).color}`}>
                    {getTypeConfig(selectedReq.type).label}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400">
                    {new Date(selectedReq.date).toLocaleString()}
                  </span>
                </div>
                
                <h2 className="text-3xl font-black text-gray-900 mb-2">{selectedReq.title}</h2>
                <div className="flex items-center gap-4 text-sm font-bold text-gray-500">
                  <span className="flex items-center gap-1.5"><User size={16} /> {selectedReq.submitter}</span>
                  <span className="flex items-center gap-1.5"><Building2 size={16} /> {selectedReq.department}</span>
                </div>
              </div>

              {/* Detail Body */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50/30">
                
                {/* Highlights Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedReq.amount && (
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{isAr ? 'القيمة' : 'Amount'}</p>
                      <p className="text-2xl font-black text-brand-dark">{selectedReq.amount.toLocaleString()} <span className="text-sm">OMR</span></p>
                    </div>
                  )}
                  {selectedReq.client && (
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{isAr ? 'العميل' : 'Client'}</p>
                      <p className="text-lg font-black text-gray-900 truncate">{selectedReq.client}</p>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{isAr ? 'التفاصيل' : 'Description'}</h3>
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-sm font-medium text-gray-700 leading-relaxed">
                      {selectedReq.description}
                    </p>
                  </div>
                </div>

                {/* Attachments Mock */}
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{isAr ? 'المرفقات' : 'Attachments'}</h3>
                  <div className="flex gap-3">
                    <button className="bg-white border border-gray-200 hover:border-brand-dark p-4 rounded-2xl flex items-center gap-3 transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                        <FileText size={20} />
                      </div>
                      <div className="text-start">
                        <p className="text-xs font-black text-gray-900 group-hover:text-brand-dark transition-colors">Draft_Document.pdf</p>
                        <p className="text-[10px] font-bold text-gray-400">1.2 MB</p>
                      </div>
                      <Eye size={16} className="text-gray-300 group-hover:text-brand-dark ml-2" />
                    </button>
                  </div>
                </div>

              </div>

              {/* ── Action Bar ────────────────────────────────────────────── */}
              <div className="p-6 bg-white border-t border-gray-100 flex gap-4">
                <button 
                  onClick={() => handleAction(selectedReq.id, 'rejected')}
                  className="flex-1 py-4 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2 transition-colors border border-red-100"
                >
                  <XCircle size={18} /> {isAr ? 'رفض' : 'Reject'}
                </button>
                <button 
                  onClick={() => handleAction(selectedReq.id, 'changes_requested')}
                  className="flex-1 py-4 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-600 font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2 transition-colors border border-amber-100"
                >
                  <MessageSquareDiff size={18} /> {isAr ? 'طلب تعديل' : 'Request Changes'}
                </button>
                <button 
                  onClick={() => handleAction(selectedReq.id, 'approved')}
                  className="flex-[2] py-4 rounded-2xl bg-brand-dark hover:bg-gray-900 text-white font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2 transition-colors shadow-lg shadow-gray-200"
                >
                  <Check size={18} /> {isAr ? 'اعتماد نهائي' : 'Approve & Sign'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExecutiveApprovals;

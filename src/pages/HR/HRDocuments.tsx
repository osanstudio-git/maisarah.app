import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Folder, FileText, Search, PlusCircle, Download, UploadCloud, Eye, Trash2, Calendar, AlertTriangle, ShieldAlert, CheckCircle2
} from 'lucide-react';

interface HRDocument {
  id: string;
  employeeName: string;
  docName: string;
  docType: 'Civil ID' | 'Passport' | 'Residency Card' | 'Academic Degree' | 'Medical Report' | 'Driver License';
  number: string;
  expiryDate: string;
  status: 'Active' | 'Expiring Soon' | 'Expired';
}

const INITIAL_DOCUMENTS: HRDocument[] = [
  {
    id: 'DOC-901',
    employeeName: 'Ahmed Al-Kharusi',
    docName: 'Passport Copy - Ahmed',
    docType: 'Passport',
    number: 'OM1234567',
    expiryDate: '2028-10-12',
    status: 'Active'
  },
  {
    id: 'DOC-902',
    employeeName: 'Sara Al-Balushi',
    docName: 'Civil ID Copy - Sara',
    docType: 'Civil ID',
    number: '108765432',
    expiryDate: '2024-02-10',
    status: 'Expired'
  },
  {
    id: 'DOC-903',
    employeeName: 'Sara Al-Balushi',
    docName: 'Oman Residency Visa - Sara',
    docType: 'Residency Card',
    number: 'PR8765432',
    expiryDate: '2026-07-25',
    status: 'Expiring Soon'
  },
  {
    id: 'DOC-904',
    employeeName: 'Ahmed Al-Kharusi',
    docName: 'SQU Audit Degree Scan',
    docType: 'Academic Degree',
    number: 'SQU-10293',
    expiryDate: 'N/A',
    status: 'Active'
  }
];

export default function HRDocuments() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [documents, setDocuments] = useState<HRDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);

  const [newDoc, setNewDoc] = useState({
    employeeName: 'Ahmed Al-Kharusi',
    docName: '',
    docType: 'Civil ID' as HRDocument['docType'],
    number: '',
    expiryDate: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem('hr_documents');
    if (saved) {
      setDocuments(JSON.parse(saved));
    } else {
      localStorage.setItem('hr_documents', JSON.stringify(INITIAL_DOCUMENTS));
      setDocuments(INITIAL_DOCUMENTS);
    }
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const expiry = newDoc.expiryDate || 'N/A';
    
    // Simple state resolver
    let status: HRDocument['status'] = 'Active';
    if (expiry !== 'N/A') {
      const expDate = new Date(expiry);
      const today = new Date();
      const diffTime = expDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0) status = 'Expired';
      else if (diffDays <= 30) status = 'Expiring Soon';
    }

    const doc: HRDocument = {
      id: `DOC-${Math.floor(900 + Math.random() * 100)}`,
      employeeName: newDoc.employeeName,
      docName: newDoc.docName,
      docType: newDoc.docType,
      number: newDoc.number,
      expiryDate: expiry,
      status
    };

    const nextDocs = [doc, ...documents];
    setDocuments(nextDocs);
    localStorage.setItem('hr_documents', JSON.stringify(nextDocs));
    
    setShowModal(false);
    setNewDoc({
      employeeName: 'Ahmed Al-Kharusi',
      docName: '',
      docType: 'Civil ID',
      number: '',
      expiryDate: ''
    });
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.docName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.docType === typeFilter;
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusClass = (status: HRDocument['status']) => {
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
            <Folder className="text-[#A11212]" size={24} />
            {isAr ? 'خزانة الوثائق والمستندات' : 'Corporate Document Vault'}
          </h2>
          <p className="text-xs text-gray-500 font-bold">
            {isAr ? 'إدارة وتتبع انتهاء صلاحيات جوازات السفر، البطاقات الشخصية والإقامات للموظفين' : 'Store and monitor employee Civil IDs, Passports, and residency Visas'}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#A11212] text-white text-xs font-black uppercase tracking-wider px-4.5 py-3 rounded-xl flex items-center gap-1.5 hover:bg-[#800e0e] shadow-sm transition-all"
        >
          <PlusCircle size={16} /> {isAr ? 'إضافة وثيقة جديدة' : 'Add Document'}
        </button>
      </div>

      {/* Expiry alerts widget */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.filter(d => d.status === 'Expired').map(d => (
          <div key={d.id} className="bg-red-55/10 border border-red-200/50 rounded-xl p-4 flex items-start gap-3">
            <ShieldAlert className="text-red-650 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-xs font-black text-red-950">Document Expired: {d.docName}</p>
              <p className="text-[10px] text-red-800 font-medium mt-0.5">Expired on {d.expiryDate}. Contact {d.employeeName} immediately to submit an updated copy.</p>
            </div>
          </div>
        ))}
        {documents.filter(d => d.status === 'Expiring Soon').map(d => (
          <div key={d.id} className="bg-orange-55/10 border border-orange-200/50 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="text-orange-650 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-xs font-black text-orange-950">Document Expiring Soon: {d.docName}</p>
              <p className="text-[10px] text-orange-850 font-medium mt-0.5">Expires on {d.expiryDate} (within 30 days). Ensure renewal procedures are underway.</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search size={16} className={`absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-gray-400`} />
          <input
            type="text"
            placeholder={isAr ? 'بحث بالاسم، نوع الوثيقة أو الرقم...' : 'Search by name, document ID, number...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-xs font-bold outline-none focus:border-[#A11212] focus:bg-white transition-all`}
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex-1 md:flex-initial bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
          >
            <option value="all">All Types</option>
            <option value="Civil ID">Civil ID</option>
            <option value="Passport">Passport</option>
            <option value="Residency Card">Residency Card</option>
            <option value="Academic Degree">Academic Degree</option>
            <option value="Medical Report">Medical Report</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 md:flex-initial bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#A11212]"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Expiring Soon">Expiring Soon</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDocs.map(doc => (
          <div key={doc.id} className="bg-white border border-gray-150 rounded-2xl p-5 hover:border-gray-300 transition-all flex justify-between items-start">
            <div className="flex gap-3">
              <div className="w-12 h-12 bg-gray-55/10 rounded-xl flex items-center justify-center text-gray-500 border border-gray-200">
                <FileText size={22} className="text-[#A11212]" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-sm text-gray-900">{doc.docName}</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{doc.employeeName}</p>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-gray-500 font-medium">Type: {doc.docType} ({doc.number})</p>
                  <p className="text-[9px] text-gray-500 font-black flex items-center gap-1">
                    <Calendar size={12} /> Expiry Date: {doc.expiryDate}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${getStatusClass(doc.status)}`}>
                {doc.status}
              </span>
              <div className="flex gap-1">
                <button className="p-2 bg-gray-50 border border-gray-200 text-gray-500 rounded-lg hover:text-[#A11212] hover:border-[#A11212] transition-colors" title="Download">
                  <Download size={12} />
                </button>
                <button className="p-2 bg-gray-50 border border-gray-200 text-gray-500 rounded-lg hover:text-[#A11212] hover:border-[#A11212] transition-colors" title="Preview">
                  <Eye size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Register Document Copy</h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Select Employee</label>
                <select
                  value={newDoc.employeeName}
                  onChange={(e) => setNewDoc({ ...newDoc, employeeName: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                >
                  <option value="Ahmed Al-Kharusi">Ahmed Al-Kharusi</option>
                  <option value="Sara Al-Balushi">Sara Al-Balushi</option>
                  <option value="Mohammed Maamari">Mohammed Maamari</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Document Label Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Passport scan, Civil ID Card scan..."
                  value={newDoc.docName}
                  onChange={(e) => setNewDoc({ ...newDoc, docName: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Document Type</label>
                  <select
                    value={newDoc.docType}
                    onChange={(e) => setNewDoc({ ...newDoc, docType: e.target.value as any })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  >
                    <option value="Civil ID">Civil ID</option>
                    <option value="Passport">Passport</option>
                    <option value="Residency Card">Residency Card</option>
                    <option value="Academic Degree">Academic Degree</option>
                    <option value="Medical Report">Medical Report</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Document/Serial ID Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. OM-2039201"
                    value={newDoc.number}
                    onChange={(e) => setNewDoc({ ...newDoc, number: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Expiry Date (Leave empty for academic/non-expiring)</label>
                <input
                  type="date"
                  value={newDoc.expiryDate}
                  onChange={(e) => setNewDoc({ ...newDoc, expiryDate: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
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
                  Save Document Reference
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

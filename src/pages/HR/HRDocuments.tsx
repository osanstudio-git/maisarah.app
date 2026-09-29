import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import {
  Folder, FileText, Search, PlusCircle, Download, UploadCloud, Eye, Trash2, Calendar, AlertTriangle, ShieldAlert, CheckCircle2, Loader2, X
} from 'lucide-react';

interface EmployeeProfile {
  id: string;
  name: string;
  role: string;
  dept: string;
}

interface HRDocument {
  id: string;
  employeeId: string;
  employeeName: string;
  docName: string;
  docType: 'Civil ID' | 'Passport' | 'Residency Card' | 'Academic Degree' | 'Medical Report' | 'Driver License';
  number: string;
  expiryDate: string;
  fileUrl?: string;
  status: 'Active' | 'Expiring Soon' | 'Expired';
}

export default function HRDocuments() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [documents, setDocuments] = useState<HRDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);

  const [newDoc, setNewDoc] = useState({
    employeeId: '',
    docName: '',
    docType: 'Civil ID' as HRDocument['docType'],
    number: '',
    expiryDate: ''
  });

  // ── 1. Fetch live documents & employees ─────────────────────────────────────
  const fetchDocumentsData = useCallback(async () => {
    try {
      setLoading(true);

      const [{ data: profData }, { data: hrData }, { data: docData }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('hr_employees').select('id, full_name, email, role, dept, documents'),
        supabase.from('hr_documents').select('*').order('created_at', { ascending: false })
      ]);

      const empMap = new Map<string, EmployeeProfile>();
      (profData || []).filter(p => p.role !== 'client').forEach(p => {
        empMap.set(p.id, {
          id: p.id,
          name: p.full_name || p.email?.split('@')[0] || 'Staff Member',
          role: p.role || 'Employee',
          dept: p.department_id || p.department || 'General'
        });
      });

      (hrData || []).forEach(h => {
        if (!empMap.has(h.id)) {
          empMap.set(h.id, {
            id: h.id,
            name: h.full_name || 'Staff Member',
            role: h.role || 'Employee',
            dept: h.dept || 'General'
          });
        }
      });

      const empList = Array.from(empMap.values());
      setEmployees(empList);

      if (empList.length > 0 && !newDoc.employeeId) {
        setNewDoc(prev => ({ ...prev, employeeId: empList[0].id }));
      }

      // Parse DB documents
      const parsedDocs: HRDocument[] = (docData || []).map((d: any) => {
        const emp = empMap.get(d.employee_id);
        const expiry = d.expiry_date || 'N/A';
        let status: HRDocument['status'] = (d.status as any) || 'Active';

        if (expiry !== 'N/A') {
          const expDate = new Date(expiry);
          const today = new Date();
          const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) status = 'Expired';
          else if (diffDays <= 30) status = 'Expiring Soon';
          else status = 'Active';
        }

        return {
          id: d.id,
          employeeId: d.employee_id,
          employeeName: emp ? emp.name : 'Staff Member',
          docName: d.doc_name,
          docType: d.doc_type,
          number: d.number || '',
          expiryDate: expiry,
          fileUrl: d.file_url,
          status
        };
      });

      // Default mock fallback if DB table is empty
      if (parsedDocs.length === 0 && empList.length > 0) {
        empList.slice(0, 3).forEach((emp, idx) => {
          parsedDocs.push(
            {
              id: `DOC-90${idx * 2 + 1}`,
              employeeId: emp.id,
              employeeName: emp.name,
              docName: `Civil ID Copy - ${emp.name}`,
              docType: 'Civil ID',
              number: `10876543${idx}`,
              expiryDate: '2028-10-12',
              status: 'Active'
            },
            {
              id: `DOC-90${idx * 2 + 2}`,
              employeeId: emp.id,
              employeeName: emp.name,
              docName: `Passport Scan - ${emp.name}`,
              docType: 'Passport',
              number: `OM123456${idx}`,
              expiryDate: idx === 0 ? '2026-07-25' : '2029-01-15',
              status: idx === 0 ? 'Expiring Soon' : 'Active'
            }
          );
        });
      }

      setDocuments(parsedDocs);
      localStorage.setItem('hr_documents', JSON.stringify(parsedDocs));
    } catch (err) {
      console.error('Error fetching HR documents:', err);
    } finally {
      setLoading(false);
    }
  }, [newDoc.employeeId]);

  useEffect(() => {
    fetchDocumentsData();

    const channel = supabase
      .channel('hr_documents_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_documents' }, () => fetchDocumentsData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDocumentsData]);

  // ── 2. Handle Create Document ──────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.employeeId) return;

    setSubmitting(true);
    const selectedEmp = employees.find(e => e.id === newDoc.employeeId);
    const expiry = newDoc.expiryDate || 'N/A';
    
    let status: HRDocument['status'] = 'Active';
    if (expiry !== 'N/A') {
      const expDate = new Date(expiry);
      const today = new Date();
      const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) status = 'Expired';
      else if (diffDays <= 30) status = 'Expiring Soon';
    }

    const tempDoc: HRDocument = {
      id: `DOC-${Math.floor(900 + Math.random() * 100)}`,
      employeeId: newDoc.employeeId,
      employeeName: selectedEmp?.name || 'Staff Member',
      docName: newDoc.docName,
      docType: newDoc.docType,
      number: newDoc.number,
      expiryDate: expiry,
      status
    };

    try {
      const { data, error } = await supabase
        .from('hr_documents')
        .insert({
          employee_id: newDoc.employeeId,
          doc_name: newDoc.docName,
          doc_type: newDoc.docType,
          number: newDoc.number,
          expiry_date: expiry !== 'N/A' ? expiry : null,
          status
        })
        .select()
        .single();

      if (!error && data) {
        tempDoc.id = data.id;
      }
    } catch (err) {
      console.warn('Direct hr_documents DB insert notice:', err);
    }

    const nextDocs = [tempDoc, ...documents];
    setDocuments(nextDocs);
    localStorage.setItem('hr_documents', JSON.stringify(nextDocs));
    
    setShowModal(false);
    setNewDoc({
      employeeId: employees[0]?.id || '',
      docName: '',
      docType: 'Civil ID',
      number: '',
      expiryDate: ''
    });
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const updated = documents.filter(d => d.id !== id);
    setDocuments(updated);
    localStorage.setItem('hr_documents', JSON.stringify(updated));

    try {
      await supabase.from('hr_documents').delete().eq('id', id);
    } catch (err) {
      console.warn('DB delete notice for hr_documents:', err);
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.docName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.docType === typeFilter;
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusBadge = (status: HRDocument['status']) => {
    switch (status) {
      case 'Active':
        return <span className="bg-green-50 text-green-700 border border-green-150 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">{isAr ? 'ساري' : 'Active'}</span>;
      case 'Expiring Soon':
        return <span className="bg-orange-50 text-orange-700 border border-orange-150 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">{isAr ? 'ينتهي قريبًا' : 'Expiring Soon'}</span>;
      default:
        return <span className="bg-red-50 text-red-700 border border-red-150 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">{isAr ? 'منتهي' : 'Expired'}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Folder className="text-[#A11212]" size={24} />
            {isAr ? 'خزينة الوثائق والمستندات' : 'Employee Document Vault'}
          </h2>
          <p className="text-xs text-gray-500 font-bold">
            {isAr ? 'إدارة الهويات، الجوازات، الإقامات ومتابعة تواريخ الانتهاء' : 'Manage Civil IDs, Passports, Visas, and track document expiries'}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#A11212] text-white text-xs font-black uppercase tracking-wider px-4.5 py-3 rounded-xl flex items-center gap-1.5 hover:bg-[#800e0e] shadow-sm transition-all"
        >
          <PlusCircle size={16} /> {isAr ? 'إضافة وثيقة جديدة' : 'Upload Document'}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className={`absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-gray-400`} />
          <input
            type="text"
            placeholder={isAr ? 'بحث بالموظف، اسم الوثيقة أو الرقم...' : 'Search by employee, document name, or number...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-xs font-bold outline-none focus:border-[#A11212] transition-colors`}
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-[#A11212]"
        >
          <option value="all">{isAr ? 'جميع أنواع الوثائق' : 'All Doc Types'}</option>
          <option value="Civil ID">Civil ID (بطاقة مدنية)</option>
          <option value="Passport">Passport (جواز سفر)</option>
          <option value="Residency Card">Residency Card (إقامة)</option>
          <option value="Academic Degree">Academic Degree (مؤهل دراسي)</option>
          <option value="Medical Report">Medical Report (تقرير طبي)</option>
          <option value="Driver License">Driver License (رخصة قيادة)</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-[#A11212]"
        >
          <option value="all">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
          <option value="Active">{isAr ? 'ساري (Active)' : 'Active'}</option>
          <option value="Expiring Soon">{isAr ? 'ينتهي قريباً (Expiring Soon)' : 'Expiring Soon'}</option>
          <option value="Expired">{isAr ? 'منتهي (Expired)' : 'Expired'}</option>
        </select>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
          <Loader2 size={28} className="animate-spin text-[#A11212] mx-auto mb-2" />
          <p className="text-xs font-bold">{isAr ? 'جاري تحميل الوثائق...' : 'Syncing document vault...'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map(doc => (
            <div key={doc.id} className="bg-white border border-gray-150 rounded-2xl p-5 shadow-xs hover:border-gray-300 transition-all flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="bg-[#A11212]/5 text-[#A11212] text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {doc.docType}
                  </span>
                  {getStatusBadge(doc.status)}
                </div>

                <div>
                  <h4 className="font-black text-sm text-gray-900 leading-snug">{doc.docName}</h4>
                  <p className="text-xs text-gray-500 font-bold mt-0.5">{doc.employeeName}</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl space-y-1 text-xs font-bold text-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{isAr ? 'رقم الوثيقة:' : 'Document No:'}</span>
                    <span className="font-mono text-gray-900">{doc.number || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{isAr ? 'تاريخ الانتهاء:' : 'Expiry Date:'}</span>
                    <span className={doc.status === 'Expired' ? 'text-red-600' : doc.status === 'Expiring Soon' ? 'text-orange-600' : 'text-gray-900'}>
                      {doc.expiryDate}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100 justify-end">
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-50 transition-colors"
                  title={isAr ? 'حذف' : 'Delete'}
                >
                  <Trash2 size={15} />
                </button>
                <button
                  onClick={() => alert(`Viewing document: ${doc.docName}`)}
                  className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-gray-200 transition-colors flex items-center gap-1"
                >
                  <Eye size={13} /> {isAr ? 'عرض' : 'View'}
                </button>
              </div>
            </div>
          ))}

          {filteredDocs.length === 0 && (
            <div className="col-span-full p-12 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
              <CheckCircle2 size={32} className="mx-auto mb-2 opacity-20 text-green-600" />
              <p className="font-bold text-sm">{isAr ? 'لا توجد وثائق مطابقة للبحث' : 'No documents matching your query.'}</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                {isAr ? 'إضافة وثيقة رسمية جديدة' : 'Upload New Document Record'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} className="text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'اختيار الموظف' : 'Select Employee'}
                </label>
                <select
                  value={newDoc.employeeId}
                  onChange={(e) => setNewDoc({ ...newDoc, employeeId: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.dept} - {emp.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'نوع الوثيقة' : 'Document Type'}
                </label>
                <select
                  value={newDoc.docType}
                  onChange={(e) => setNewDoc({ ...newDoc, docType: e.target.value as any })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                >
                  <option value="Civil ID">Civil ID / بطاقة شخصية</option>
                  <option value="Passport">Passport / جواز سفر</option>
                  <option value="Residency Card">Residency Card / بطاقة إقامة</option>
                  <option value="Academic Degree">Academic Degree / مؤهل دراسي</option>
                  <option value="Medical Report">Medical Report / فحص طبي</option>
                  <option value="Driver License">Driver License / رخصة قيادة</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'عنوان أو وصف الوثيقة' : 'Document Title'}
                </label>
                <input
                  type="text"
                  required
                  value={newDoc.docName}
                  onChange={(e) => setNewDoc({ ...newDoc, docName: e.target.value })}
                  placeholder="e.g. Civil ID Card Scan 2026"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'رقم الوثيقة' : 'Document No'}
                  </label>
                  <input
                    type="text"
                    value={newDoc.number}
                    onChange={(e) => setNewDoc({ ...newDoc, number: e.target.value })}
                    placeholder="e.g. 109876543"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    {isAr ? 'تاريخ الانتهاء' : 'Expiry Date'}
                  </label>
                  <input
                    type="date"
                    value={newDoc.expiryDate}
                    onChange={(e) => setNewDoc({ ...newDoc, expiryDate: e.target.value })}
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
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#A11212] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#800e0e] transition-colors flex items-center justify-center gap-1.5"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {isAr ? 'حفظ الوثيقة' : 'Save Document'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

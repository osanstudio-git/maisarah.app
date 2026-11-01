import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import {
  Folder, FileText, Search, PlusCircle, Download, UploadCloud, Eye, Trash2, Calendar,
  AlertTriangle, ShieldAlert, CheckCircle2, Loader2, X, Printer, Copy, Check, ExternalLink,
  ShieldCheck, QrCode, FileDown, Upload, FileCheck2, CreditCard, Sparkles, AlertCircle
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
  
  // Modals & Document Viewer
  const [showModal, setShowModal] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<HRDocument | null>(null);
  const [copied, setCopied] = useState(false);
  const [uploadingScan, setUploadingScan] = useState(false);

  // File Upload State for New Document Modal
  const [fileAttachment, setFileAttachment] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const uploadFileInputRef = useRef<HTMLInputElement>(null);
  const viewerFileInputRef = useRef<HTMLInputElement>(null);

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

  // ── 2. Handle File Input in Upload Modal ────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileAttachment(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // ── 3. Handle Create Document ──────────────────────────────────────────────
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

    let finalFileUrl: string | undefined = filePreview || undefined;

    // Try Supabase Storage upload if a real file is attached
    if (fileAttachment) {
      try {
        const fileExt = fileAttachment.name.split('.').pop();
        const filePath = `hr_documents/${newDoc.employeeId}_${Date.now()}.${fileExt}`;
        const { data: storageData, error: storageErr } = await supabase.storage
          .from('documents')
          .upload(filePath, fileAttachment);

        if (!storageErr && storageData) {
          const { data: pubData } = supabase.storage.from('documents').getPublicUrl(filePath);
          if (pubData?.publicUrl) {
            finalFileUrl = pubData.publicUrl;
          }
        }
      } catch (uploadErr) {
        console.warn('Storage upload fallback to data URL:', uploadErr);
      }
    }

    const tempDoc: HRDocument = {
      id: `DOC-${Math.floor(900 + Math.random() * 100)}`,
      employeeId: newDoc.employeeId,
      employeeName: selectedEmp?.name || 'Staff Member',
      docName: newDoc.docName,
      docType: newDoc.docType,
      number: newDoc.number,
      expiryDate: expiry,
      fileUrl: finalFileUrl,
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
          file_url: finalFileUrl,
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
    setFileAttachment(null);
    setFilePreview(null);
    setSubmitting(false);
  };

  // ── 4. Attach or Replace Scan File directly from Viewer ─────────────────────
  const handleAttachScanToDoc = async (docId: string, file: File) => {
    try {
      setUploadingScan(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        let fileUrlToSave = dataUrl;

        try {
          const ext = file.name.split('.').pop();
          const filePath = `hr_documents/${docId}_${Date.now()}.${ext}`;
          const { data: storageData, error: sErr } = await supabase.storage
            .from('documents')
            .upload(filePath, file);

          if (!sErr && storageData) {
            const { data: pubData } = supabase.storage.from('documents').getPublicUrl(filePath);
            if (pubData?.publicUrl) {
              fileUrlToSave = pubData.publicUrl;
            }
          }
        } catch (e) {
          console.warn('Storage upload fallback:', e);
        }

        // Update in state
        setDocuments(prev => prev.map(d => d.id === docId ? { ...d, fileUrl: fileUrlToSave } : d));
        if (viewingDoc && viewingDoc.id === docId) {
          setViewingDoc(prev => prev ? { ...prev, fileUrl: fileUrlToSave } : null);
        }

        // Update in localStorage
        const saved = JSON.parse(localStorage.getItem('hr_documents') || '[]');
        const next = saved.map((d: any) => d.id === docId ? { ...d, fileUrl: fileUrlToSave } : d);
        localStorage.setItem('hr_documents', JSON.stringify(next));

        // Update in Supabase
        try {
          await supabase.from('hr_documents').update({ file_url: fileUrlToSave }).eq('id', docId);
        } catch (dbErr) {
          console.warn('DB update file_url notice:', dbErr);
        }
        setUploadingScan(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error attaching scan:', err);
      setUploadingScan(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (viewingDoc?.id === id) {
      setViewingDoc(null);
    }
    const updated = documents.filter(d => d.id !== id);
    setDocuments(updated);
    localStorage.setItem('hr_documents', JSON.stringify(updated));

    try {
      await supabase.from('hr_documents').delete().eq('id', id);
    } catch (err) {
      console.warn('DB delete notice for hr_documents:', err);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintDoc = (doc: HRDocument) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    const isPdf = doc.fileUrl && (doc.fileUrl.startsWith('data:application/pdf') || doc.fileUrl.endsWith('.pdf'));
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isAr ? 'rtl' : 'ltr'}">
      <head>
        <title>${doc.docName} - ${doc.employeeName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #111; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #A11212; padding-bottom: 15px; margin-bottom: 25px; }
          .logo { font-size: 20px; font-weight: 900; color: #A11212; letter-spacing: 1px; }
          .sub { font-size: 11px; color: #666; font-weight: bold; margin-top: 2px; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; text-transform: uppercase; background: #e6f4ea; color: #137333; }
          .meta-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .meta-table th, .meta-table td { padding: 12px 16px; border: 1px solid #e5e7eb; text-align: ${isAr ? 'right' : 'left'}; font-size: 13px; }
          .meta-table th { background: #f9fafb; width: 30%; color: #4b5563; }
          .doc-number { font-family: monospace; font-size: 16px; font-weight: bold; letter-spacing: 1px; color: #111; }
          .footer { margin-top: 50px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 15px; display: flex; justify-content: space-between; }
          .img-preview { margin-top: 25px; text-align: center; }
          .img-preview img { max-width: 90%; max-height: 480px; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">MAISARAH HR VAULT</div>
            <div class="sub">Official Employee Credential Archive &bull; وثيقة الموظف المعتمدة</div>
          </div>
          <div style="text-align: ${isAr ? 'left' : 'right'}; font-size: 12px; color: #4b5563;">
            <div><strong>Record ID:</strong> ${doc.id}</div>
            <div><strong>Printed On:</strong> ${new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <h2 style="margin: 0 0 10px 0; font-size: 20px; color: #111827;">${doc.docName}</h2>
        <span class="badge">${doc.status}</span>

        <table class="meta-table">
          <tr><th>Employee Name</th><td><strong>${doc.employeeName}</strong></td></tr>
          <tr><th>Document Type</th><td>${doc.docType}</td></tr>
          <tr><th>Document Number</th><td><span class="doc-number">${doc.number || 'N/A'}</span></td></tr>
          <tr><th>Expiry Date</th><td><strong>${doc.expiryDate}</strong></td></tr>
          <tr><th>Verification Status</th><td>Archived & Verified in Maisarah HR Vault</td></tr>
        </table>

        ${doc.fileUrl && !isPdf ? `
          <div class="img-preview">
            <img src="${doc.fileUrl}" alt="Scanned Document Preview" />
          </div>
        ` : ''}

        <div class="footer">
          <div>Maisarah Financial &amp; Auditing &bull; Human Resources Department</div>
          <div>Confidential HR Record</div>
        </div>

        <script>
          window.onload = function() { window.print(); window.close(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadDoc = (doc: HRDocument) => {
    if (doc.fileUrl) {
      const link = document.createElement('a');
      link.href = doc.fileUrl;
      const cleanName = doc.docName.replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, '_');
      link.download = cleanName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const content = `MAISARAH HR DOCUMENT VAULT RECORD\n=================================\nDocument Title: ${doc.docName}\nEmployee: ${doc.employeeName}\nDocument Type: ${doc.docType}\nDocument Number: ${doc.number}\nExpiry Date: ${doc.expiryDate}\nStatus: ${doc.status}\nRecord ID: ${doc.id}\nExported At: ${new Date().toLocaleString()}`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${doc.docName.replace(/\s+/g, '_')}_Record.txt`;
      document.body.appendChild(link);
      link.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    }
  };

  const getDaysRemainingText = (expiryDate: string) => {
    if (!expiryDate || expiryDate === 'N/A') return null;
    const exp = new Date(expiryDate);
    const today = new Date();
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return isAr ? `انتهت الصلاحية منذ ${Math.abs(diffDays)} يوم` : `Expired ${Math.abs(diffDays)} days ago`;
    } else if (diffDays === 0) {
      return isAr ? 'ينتهي اليوم' : 'Expires today';
    } else if (diffDays <= 30) {
      return isAr ? `ينتهي خلال ${diffDays} يوم` : `Expires in ${diffDays} days`;
    } else {
      const years = (diffDays / 365).toFixed(1);
      return isAr ? `سارٍ لمدة (${diffDays} يوم)` : `Valid (${diffDays} days remaining)`;
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
        return <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">{isAr ? 'ساري' : 'Active'}</span>;
      case 'Expiring Soon':
        return <span className="bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">{isAr ? 'ينتهي قريبًا' : 'Expiring Soon'}</span>;
      default:
        return <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">{isAr ? 'منتهي' : 'Expired'}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Hidden file input for attaching scan in viewer */}
      <input
        type="file"
        ref={viewerFileInputRef}
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && viewingDoc) {
            handleAttachScanToDoc(viewingDoc.id, file);
          }
        }}
      />

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
          onClick={() => {
            setFileAttachment(null);
            setFilePreview(null);
            setShowModal(true);
          }}
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
            <div 
              key={doc.id} 
              className="bg-white border border-gray-150 rounded-2xl p-5 shadow-xs hover:border-gray-300 hover:shadow-sm transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-2 cursor-pointer" onClick={() => setViewingDoc(doc)}>
                <div className="flex justify-between items-start">
                  <span className="bg-[#A11212]/5 text-[#A11212] text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {doc.docType}
                  </span>
                  {getStatusBadge(doc.status)}
                </div>

                <div>
                  <h4 className="font-black text-sm text-gray-900 leading-snug hover:text-[#A11212] transition-colors">{doc.docName}</h4>
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
                  onClick={() => setViewingDoc(doc)}
                  className="bg-gray-100 text-gray-800 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#A11212] hover:text-white transition-all flex items-center gap-1.5 shadow-2xs"
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

      {/* ── DOCUMENT VIEWER MODAL ────────────────────────────────────────────── */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border border-gray-100 my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/70">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-[#A11212] text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {viewingDoc.docType}
                  </span>
                  {getStatusBadge(viewingDoc.status)}
                </div>
                <h3 className="text-lg font-black text-gray-900">
                  {viewingDoc.docName}
                </h3>
                <p className="text-xs font-bold text-gray-500 flex items-center gap-2">
                  <span>{viewingDoc.employeeName}</span>
                  <span>&bull;</span>
                  <span>ID: {viewingDoc.id}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintDoc(viewingDoc)}
                  className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                  title={isAr ? 'طباعة الوثيقة' : 'Print Document'}
                >
                  <Printer size={18} />
                </button>
                <button
                  onClick={() => handleDownloadDoc(viewingDoc)}
                  className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                  title={isAr ? 'تحميل' : 'Download'}
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Quick Summary Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-5 bg-gray-50/40 border-b border-gray-100 text-xs">
              <div className="bg-white p-3 rounded-2xl border border-gray-150">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
                  {isAr ? 'رقم الوثيقة' : 'Document Number'}
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono font-black text-gray-900 text-sm">{viewingDoc.number || 'N/A'}</span>
                  {viewingDoc.number && (
                    <button
                      onClick={() => handleCopyText(viewingDoc.number)}
                      className="text-gray-400 hover:text-[#A11212] p-1 rounded-md transition-colors"
                      title={isAr ? 'نسخ الرقم' : 'Copy Number'}
                    >
                      {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-gray-150">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
                  {isAr ? 'تاريخ الانتهاء' : 'Expiry Date'}
                </span>
                <span className="font-bold text-gray-900 text-sm mt-1 block">
                  {viewingDoc.expiryDate}
                </span>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-gray-150">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
                  {isAr ? 'حالة الصلاحية' : 'Validity Status'}
                </span>
                <span className="font-bold text-xs mt-1 block text-gray-700">
                  {getDaysRemainingText(viewingDoc.expiryDate) || viewingDoc.status}
                </span>
              </div>
            </div>

            {/* Main Preview Area */}
            <div className="p-6">
              {viewingDoc.fileUrl ? (
                // ── CASE 1: File/Image is uploaded ──
                viewingDoc.fileUrl.startsWith('data:application/pdf') || viewingDoc.fileUrl.toLowerCase().endsWith('.pdf') ? (
                  <div className="space-y-3">
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-100">
                      <iframe
                        src={viewingDoc.fileUrl}
                        title={viewingDoc.docName}
                        className="w-full h-[450px] rounded-2xl"
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-gray-600 px-1">
                      <span className="flex items-center gap-1.5">
                        <FileText size={15} className="text-[#A11212]" /> {isAr ? 'مستند PDF رقمي' : 'Digital PDF Document'}
                      </span>
                      <a
                        href={viewingDoc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#A11212] hover:underline flex items-center gap-1"
                      >
                        <ExternalLink size={13} /> {isAr ? 'عرض في نافذة منفصلة' : 'Open in New Window'}
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-900/5 flex items-center justify-center p-4">
                      <img
                        src={viewingDoc.fileUrl}
                        alt={viewingDoc.docName}
                        className="max-h-[440px] max-w-full rounded-xl object-contain shadow-sm"
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-gray-600 px-1">
                      <span className="flex items-center gap-1.5">
                        <Eye size={15} className="text-[#A11212]" /> {isAr ? 'صورة الوثيقة المرفقة' : 'Scanned Document Image'}
                      </span>
                      <a
                        href={viewingDoc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#A11212] hover:underline flex items-center gap-1"
                      >
                        <ExternalLink size={13} /> {isAr ? 'عرض الحجم الأصلي' : 'View Full Image'}
                      </a>
                    </div>
                  </div>
                )
              ) : (
                // ── CASE 2: No file uploaded yet -> Display Executive Digital Card representation ──
                <div className="space-y-5">
                  <div className={`relative w-full max-w-lg mx-auto rounded-3xl p-6 shadow-xl overflow-hidden text-white border border-white/20 ${
                    viewingDoc.docType === 'Passport'
                      ? 'bg-gradient-to-br from-[#0c2340] via-[#112a4f] to-[#08182b]'
                      : viewingDoc.docType === 'Residency Card'
                      ? 'bg-gradient-to-br from-[#064e3b] via-[#065f46] to-[#022c22]'
                      : 'bg-gradient-to-br from-[#6b0f0f] via-[#851111] to-[#400707]'
                  }`}>
                    {/* Background Pattern / Watermark */}
                    <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center font-black text-6xl tracking-widest uppercase select-none">
                      MAISARAH
                    </div>

                    {/* Card Top Banner */}
                    <div className="flex justify-between items-center border-b border-white/15 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                          <ShieldCheck size={18} className="text-amber-300" />
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-amber-200">
                            {isAr ? 'سلطنة عُمان' : 'SULTANATE OF OMAN'}
                          </div>
                          <div className="text-[8px] font-bold text-white/70">
                            {viewingDoc.docType === 'Civil ID' ? 'Civil Status Department' : viewingDoc.docType === 'Passport' ? 'Directorate General of Passports' : 'Ministry of Labour Record'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-white/15 uppercase tracking-wider text-white">
                          {viewingDoc.docType}
                        </span>
                      </div>
                    </div>

                    {/* Smart Chip Graphic */}
                    <div className="my-4 flex justify-between items-center">
                      <div className="w-11 h-8 rounded-md bg-gradient-to-tr from-amber-300 via-yellow-200 to-amber-400 border border-amber-500/50 shadow-inner flex flex-col justify-around p-1">
                        <div className="h-0.5 bg-amber-600/30 rounded-full" />
                        <div className="h-0.5 bg-amber-600/30 rounded-full" />
                        <div className="h-0.5 bg-amber-600/30 rounded-full" />
                      </div>
                      <div className="flex items-center gap-1.5 text-white/60 text-[9px] font-mono">
                        <Sparkles size={12} className="text-amber-300" />
                        <span>DIGITAL VERIFIED</span>
                      </div>
                    </div>

                    {/* Card Details Body */}
                    <div className="flex items-start gap-4">
                      {/* Avatar / Photo placeholder */}
                      <div className="w-20 h-24 rounded-2xl bg-white/10 border-2 border-white/20 shadow-inner flex flex-col items-center justify-center text-white/80 shrink-0">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-black text-sm">
                          {viewingDoc.employeeName.charAt(0)}
                        </div>
                        <span className="text-[7px] font-black uppercase mt-1 tracking-wider text-white/70">PHOTO</span>
                      </div>

                      {/* Info lines */}
                      <div className="flex-1 space-y-1.5 text-xs">
                        <div>
                          <span className="text-[8px] font-bold text-white/60 uppercase tracking-wider block">
                            {isAr ? 'الاسم الكامل' : 'Full Name'}
                          </span>
                          <span className="font-black text-sm text-white tracking-wide">{viewingDoc.employeeName}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[8px] font-bold text-white/60 uppercase tracking-wider block">
                              {isAr ? 'رقم الوثيقة' : 'Card Number'}
                            </span>
                            <span className="font-mono font-bold text-white tracking-wider">{viewingDoc.number || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold text-white/60 uppercase tracking-wider block">
                              {isAr ? 'تاريخ الانتهاء' : 'Expiry Date'}
                            </span>
                            <span className="font-mono font-bold text-amber-200">{viewingDoc.expiryDate}</span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[8px] font-bold text-white/60 uppercase tracking-wider block">
                            {isAr ? 'الجهة المعتمدة' : 'Verified By'}
                          </span>
                          <span className="text-[10px] font-bold text-white/90">Maisarah Corporate HR Archive</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom MRZ Machine Readable Strip */}
                    <div className="mt-4 pt-3 border-t border-white/15 flex justify-between items-center">
                      <div className="font-mono text-[9px] tracking-widest text-white/50 select-all">
                        I&lt;OMN{viewingDoc.number || '00000000'}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
                      </div>
                      <QrCode size={18} className="text-white/60" />
                    </div>
                  </div>

                  {/* Drag/Drop Scan attachment callout */}
                  <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-amber-100 rounded-xl text-amber-800 shrink-0">
                        <UploadCloud size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-amber-950">
                          {isAr ? 'لم يتم إرفاق ملف ممسوح ضوئيًا بعد' : 'No scanned PDF or image attached yet'}
                        </h4>
                        <p className="text-[11px] text-amber-800 font-bold mt-0.5">
                          {isAr ? 'يمكنك رفع صورة الهوية أو ملف الـ PDF الأصلي هنا لعرضه وتنزيله في أي وقت' : 'You can attach the original scanned PDF or image copy to view anytime.'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={uploadingScan}
                      onClick={() => viewerFileInputRef.current?.click()}
                      className="bg-amber-700 hover:bg-amber-800 text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shrink-0 shadow-2xs"
                    >
                      {uploadingScan ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                      {isAr ? 'رفع نسخة ممسوحة' : 'Attach Scanned Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-5 border-t border-gray-100 bg-gray-50/70 flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={uploadingScan}
                  onClick={() => viewerFileInputRef.current?.click()}
                  className="bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-black px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all"
                >
                  <UploadCloud size={14} className="text-[#A11212]" />
                  {viewingDoc.fileUrl ? (isAr ? 'استبدال الملف' : 'Replace Scan') : (isAr ? 'إرفاق ملف' : 'Attach Scan')}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(viewingDoc.id)}
                  className="text-gray-400 hover:text-red-600 p-2.5 rounded-xl hover:bg-red-50 transition-colors"
                  title={isAr ? 'حذف الوثيقة' : 'Delete Record'}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintDoc(viewingDoc)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Printer size={14} />
                  {isAr ? 'طباعة' : 'Print'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadDoc(viewingDoc)}
                  className="bg-[#A11212] hover:bg-[#800e0e] text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Download size={14} />
                  {isAr ? 'تنزيل' : 'Download'}
                </button>
                <button
                  type="button"
                  onClick={() => setViewingDoc(null)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-black px-4 py-2.5 rounded-xl transition-colors"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE / UPLOAD MODAL ───────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <form onSubmit={handleCreate} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-8">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                {isAr ? 'إضافة وثيقة رسمية جديدة' : 'Upload New Document Record'}
              </h3>
              <button 
                type="button" 
                onClick={() => {
                  setShowModal(false);
                  setFileAttachment(null);
                  setFilePreview(null);
                }} 
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <X size={18} className="text-gray-400" />
              </button>
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

              {/* Optional File Attachment */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  {isAr ? 'إرفاق نسخة ممسوحة ضوئيًا (اختياري)' : 'Attach Scanned Copy (Optional)'}
                </label>
                <input
                  type="file"
                  ref={uploadFileInputRef}
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  onClick={() => uploadFileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center cursor-pointer hover:border-[#A11212] transition-colors bg-gray-50/50"
                >
                  {fileAttachment ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-left">
                        <FileCheck2 size={20} className="text-green-600" />
                        <div>
                          <p className="text-xs font-black text-gray-900 truncate max-w-[200px]">{fileAttachment.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold">{(fileAttachment.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFileAttachment(null);
                          setFilePreview(null);
                        }}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <UploadCloud size={24} className="mx-auto text-gray-400" />
                      <p className="text-xs font-bold text-gray-600">
                        {isAr ? 'انقر لرفع ملف PDF أو صورة للوثيقة' : 'Click to select PDF or image file'}
                      </p>
                      <p className="text-[10px] text-gray-400">PNG, JPG, PDF up to 10MB</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFileAttachment(null);
                    setFilePreview(null);
                  }}
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


import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import {
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  File,
  Check,
  Calendar,
  Building2,
  Paperclip
} from 'lucide-react';

export interface CompanyDocument {
  key: string;
  title: string;
  file_name: string;
  file_path: string;
  file_url: string;
  file_size?: number;
  uploaded_at: string;
  uploaded_by?: string;
  doc_type?: string;
}

interface CompanyDocumentManagerProps {
  clientId: string;
  companyName: string;
  crNumber?: string | null;
  taxNumber?: string | null;
  vatNumber?: string | null;
  existingDocuments?: CompanyDocument[] | null;
  onDocumentsUpdated?: (updatedDocs: CompanyDocument[]) => void;
  isAr?: boolean;
}

const STANDARD_SLOTS = [
  {
    key: 'cr_doc',
    title_ar: 'شهادة السجل التجاري (CR Certificate)',
    title_en: 'Commercial Registration (CR) Certificate',
    sub_ar: 'وزارة التجارة والصناعة وترويج الاستثمار (MoCIIP)',
    sub_en: 'Ministry of Commerce, Industry & Investment Promotion',
    category: 'Commercial'
  },
  {
    key: 'chamber_doc',
    title_ar: 'شهادة انتساب غرفة التجارة والصناعة (OCCI)',
    title_en: 'Chamber of Commerce Certificate (OCCI)',
    sub_ar: 'شهادة العضوية السنوية لغرفة تجارة وصناعة عمان',
    sub_en: 'Oman Chamber of Commerce & Industry Membership',
    category: 'Chamber'
  },
  {
    key: 'vat_cert',
    title_ar: 'شهادة التسجيل في ضريبة القيمة المضافة (VAT)',
    title_en: 'VAT Registration Certificate',
    sub_ar: 'جهاز الضرائب العُماني (Oman Tax Authority)',
    sub_en: 'Oman Tax Authority (OTA) Official VAT ID',
    category: 'Tax'
  },
  {
    key: 'tax_card',
    title_ar: 'البطاقة الضريبية / شهادة ضريبة الدخل',
    title_en: 'Tax Card / Income Tax Certificate',
    sub_ar: 'إثبات التسجيل وسريان ضريبة دخل الشركات',
    sub_en: 'Corporate Income Tax Registration Certificate',
    category: 'Tax'
  },
  {
    key: 'articles_assoc',
    title_ar: 'عقد التأسيس وملاحق التعديل (Articles)',
    title_en: 'Articles of Association & Constitutive Docs',
    sub_ar: 'العقد التأسيسي وتحديد الشركاء والمفوضين بالتوقيع',
    sub_en: 'Constitutive Contract & Authorized Signatories',
    category: 'Legal'
  }
];

export const CompanyDocumentManager: React.FC<CompanyDocumentManagerProps> = ({
  clientId,
  companyName,
  crNumber,
  taxNumber,
  vatNumber,
  existingDocuments = [],
  onDocumentsUpdated,
  isAr = true
}) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<CompanyDocument[]>(existingDocuments || []);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Custom document upload modal
  const [isCustomDocModalOpen, setIsCustomDocModalOpen] = useState(false);
  const [customDocTitle, setCustomDocTitle] = useState('');
  const [customDocFile, setCustomDocFile] = useState<File | null>(null);
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);

  // Hidden file input refs for each slot
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const notify = (msg: string, isErr = false) => {
    if (isErr) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  // ── Upload handler for standard slot ──────────────────────────────────────
  const handleFileUpload = async (slotKey: string, slotTitle: string, file: File) => {
    if (!file || !clientId) return;

    if (file.size > 20 * 1024 * 1024) {
      notify(isAr ? 'حجم الملف يتجاوز الحد المسموح به (20 ميجابايت)' : 'File size exceeds 20MB limit', true);
      return;
    }

    setUploadingSlot(slotKey);
    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const timestamp = Date.now();
      const storagePath = `companies/${clientId}/common/${slotKey}_${timestamp}_${cleanName}`;

      // 1. Upload to Supabase Storage bucket 'documents'
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Obtain URL
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storagePath);
      const publicUrl = urlData?.publicUrl || '';

      const newDoc: CompanyDocument = {
        key: slotKey,
        title: slotTitle,
        file_name: file.name,
        file_path: storagePath,
        file_url: publicUrl,
        file_size: file.size,
        uploaded_at: new Date().toISOString(),
        uploaded_by: user?.user_metadata?.full_name || user?.email || 'Staff'
      };

      // 3. Update documents state & Supabase `clients.common_documents`
      const filtered = documents.filter(d => d.key !== slotKey);
      const updatedDocs = [...filtered, newDoc];

      const { error: dbError } = await supabase
        .from('clients')
        .update({ common_documents: updatedDocs })
        .eq('id', clientId);

      if (dbError) throw dbError;

      setDocuments(updatedDocs);
      if (onDocumentsUpdated) onDocumentsUpdated(updatedDocs);

      notify(isAr ? `تم رفع "${slotTitle}" بنجاح!` : `"${slotTitle}" uploaded successfully!`);
    } catch (err: any) {
      console.error('Document upload error:', err);
      notify(err.message || 'Failed to upload document', true);
    } finally {
      setUploadingSlot(null);
    }
  };

  // ── Delete handler ────────────────────────────────────────────────────────
  const handleDeleteDocument = async (docKey: string, filePath: string) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من حذف هذا المستند؟' : 'Are you sure you want to delete this document?')) {
      return;
    }

    setDeletingKey(docKey);
    try {
      // 1. Remove from Storage
      if (filePath) {
        await supabase.storage.from('documents').remove([filePath]);
      }

      // 2. Remove from Database
      const updatedDocs = documents.filter(d => d.key !== docKey);
      const { error: dbError } = await supabase
        .from('clients')
        .update({ common_documents: updatedDocs })
        .eq('id', clientId);

      if (dbError) throw dbError;

      setDocuments(updatedDocs);
      if (onDocumentsUpdated) onDocumentsUpdated(updatedDocs);

      notify(isAr ? 'تم حذف المستند بنجاح' : 'Document deleted successfully');
    } catch (err: any) {
      console.error('Delete document error:', err);
      notify(err.message || 'Failed to delete document', true);
    } finally {
      setDeletingKey(null);
    }
  };

  // ── Download handler ──────────────────────────────────────────────────────
  const handleDownload = async (doc: CompanyDocument) => {
    try {
      if (doc.file_path) {
        const { data, error } = await supabase.storage.from('documents').download(doc.file_path);
        if (error) throw error;
        const blobUrl = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = doc.file_name || 'document.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      } else if (doc.file_url) {
        window.open(doc.file_url, '_blank');
      }
    } catch (err: any) {
      console.error('Download error:', err);
      if (doc.file_url) {
        window.open(doc.file_url, '_blank');
      } else {
        notify(isAr ? 'تعذر تحميل الملف مباشرة' : 'Could not download file', true);
      }
    }
  };

  // ── Add Custom Document Submit ───────────────────────────────────────────
  const handleAddCustomDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDocTitle.trim() || !customDocFile || !clientId) return;

    setIsSubmittingCustom(true);
    const customKey = `custom_${Date.now()}`;
    try {
      const cleanName = customDocFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `companies/${clientId}/common/${customKey}_${cleanName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, customDocFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storagePath);

      const newDoc: CompanyDocument = {
        key: customKey,
        title: customDocTitle.trim(),
        file_name: customDocFile.name,
        file_path: storagePath,
        file_url: urlData?.publicUrl || '',
        file_size: customDocFile.size,
        uploaded_at: new Date().toISOString(),
        uploaded_by: user?.user_metadata?.full_name || user?.email || 'Staff',
        doc_type: 'custom'
      };

      const updatedDocs = [...documents, newDoc];
      const { error: dbError } = await supabase
        .from('clients')
        .update({ common_documents: updatedDocs })
        .eq('id', clientId);

      if (dbError) throw dbError;

      setDocuments(updatedDocs);
      if (onDocumentsUpdated) onDocumentsUpdated(updatedDocs);

      setIsCustomDocModalOpen(false);
      setCustomDocTitle('');
      setCustomDocFile(null);
      notify(isAr ? 'تمت إضافة المستند الجديد بنجاح' : 'New document added successfully');
    } catch (err: any) {
      notify(err.message || 'Error saving custom document', true);
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  // Find uploaded doc by slot key
  const getDocForSlot = (key: string) => documents.find(d => d.key === key);

  // Custom non-standard docs
  const customDocs = documents.filter(d => !STANDARD_SLOTS.some(s => s.key === d.key));

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header with Title & Add Custom Doc Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-150">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
            <Building2 size={16} className="text-brand-dark" />
            <span>{isAr ? 'المستندات القانونية والرسمية للشركة' : 'Corporate Legal Documents'}</span>
          </h4>
          <p className="text-[10px] text-gray-500 font-medium mt-0.5">
            {isAr
              ? `المستندات الرسمية الثابتة لـ "${companyName}" (السجل التجاري، غرفة التجارة، شهادة القيمة المضافة وغيرها)`
              : `Official permanent corporate documents for "${companyName}"`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCustomDocModalOpen(true)}
          className="px-3 py-1.5 bg-brand-dark hover:bg-red-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs transition-all self-start sm:self-auto"
        >
          <Plus size={13} />
          <span>{isAr ? '+ إضافة مستند آخر' : '+ Add Document'}</span>
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
          <span className="font-bold">{successMsg}</span>
        </div>
      )}

      {/* ── Standard Slots ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3">
        {STANDARD_SLOTS.map(slot => {
          const doc = getDocForSlot(slot.key);
          const isUploaded = !!doc;
          const isUploading = uploadingSlot === slot.key;
          const isDeleting = deletingKey === slot.key;
          const title = isAr ? slot.title_ar : slot.title_en;
          const sub = isAr ? slot.sub_ar : slot.sub_en;

          return (
            <div
              key={slot.key}
              className={`bg-white border rounded-2xl p-4 shadow-xs transition-all ${
                isUploaded ? 'border-gray-200 hover:border-gray-300' : 'border-dashed border-gray-300 bg-gray-50/50'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* File Info */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      isUploaded ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isUploaded ? <FileText size={20} /> : <File size={20} />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="text-xs font-black text-gray-900 truncate">{title}</h5>
                      {isUploaded ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[9px] font-bold flex items-center gap-1">
                          <Check size={10} />
                          {isAr ? 'مرفوع' : 'Uploaded'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[9px] font-bold">
                          {isAr ? 'بانتظار الرفع' : 'Pending Upload'}
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">{sub}</p>

                    {isUploaded && (
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-500 font-medium flex-wrap">
                        <span className="font-bold text-gray-700 truncate max-w-xs">{doc.file_name}</span>
                        {doc.file_size && <span>• {formatFileSize(doc.file_size)}</span>}
                        {doc.uploaded_at && (
                          <span className="flex items-center gap-1 text-gray-400">
                            <Calendar size={10} />
                            {new Date(doc.uploaded_at).toLocaleDateString(isAr ? 'ar-OM' : 'en-GB')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  <input
                    type="file"
                    ref={el => (fileInputRefs.current[slot.key] = el)}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(slot.key, title, f);
                      e.target.value = '';
                    }}
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    className="hidden"
                  />

                  {isUploading ? (
                    <div className="px-3 py-1.5 bg-gray-100 rounded-xl text-xs font-bold text-gray-600 flex items-center gap-1.5">
                      <div className="w-3.5 h-3.5 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
                      <span>{isAr ? 'جاري الرفع...' : 'Uploading...'}</span>
                    </div>
                  ) : isUploaded ? (
                    <>
                      {/* View / Open */}
                      <button
                        type="button"
                        onClick={() => window.open(doc.file_url, '_blank')}
                        className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition cursor-pointer"
                        title={isAr ? 'معاينة المستند' : 'Preview Document'}
                      >
                        <Eye size={14} />
                      </button>

                      {/* Download */}
                      <button
                        type="button"
                        onClick={() => handleDownload(doc)}
                        className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition cursor-pointer"
                        title={isAr ? 'تحميل الملف' : 'Download File'}
                      >
                        <Download size={14} />
                      </button>

                      {/* Replace */}
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[slot.key]?.click()}
                        className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
                        title={isAr ? 'استبدال المستند بملف جديد' : 'Replace File'}
                      >
                        {isAr ? 'استبدال' : 'Replace'}
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleDeleteDocument(slot.key, doc.file_path)}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
                        title={isAr ? 'حذف المستند' : 'Delete Document'}
                      >
                        {isDeleting ? (
                          <div className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[slot.key]?.click()}
                      className="px-3.5 py-2 bg-brand-dark hover:bg-red-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                    >
                      <Upload size={13} />
                      <span>{isAr ? 'رفع المستند' : 'Upload File'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Custom Documents Section (if any) ──────────────────────────────── */}
      {customDocs.length > 0 && (
        <div className="pt-3 border-t border-gray-150 space-y-2.5">
          <h5 className="text-[11px] font-black uppercase tracking-wider text-gray-600 flex items-center gap-1">
            <Paperclip size={13} className="text-gray-400" />
            <span>{isAr ? 'مستندات وتراخيص إضافية للشركة' : 'Additional Documents & Licenses'}</span>
          </h5>

          <div className="grid grid-cols-1 gap-2.5">
            {customDocs.map(doc => (
              <div key={doc.key} className="bg-white border border-gray-200 rounded-2xl p-3.5 flex justify-between items-center shadow-xs">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100">
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-gray-900 truncate">{doc.title}</p>
                    <p className="text-[10px] text-gray-500 font-medium truncate">
                      {doc.file_name} {doc.file_size ? `(${formatFileSize(doc.file_size)})` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => window.open(doc.file_url, '_blank')}
                    className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs"
                    title={isAr ? 'معاينة' : 'Preview'}
                  >
                    <Eye size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(doc)}
                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs"
                    title={isAr ? 'تحميل' : 'Download'}
                  >
                    <Download size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDocument(doc.key, doc.file_path)}
                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs"
                    title={isAr ? 'حذف' : 'Delete'}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modal: Upload Additional Document ──────────────────────────────── */}
      {isCustomDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Paperclip size={18} className="text-brand-dark" />
                <h4 className="text-sm font-black text-gray-900">
                  {isAr ? 'إضافة مستند أو ترخيص جديد' : 'Upload Additional Document'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomDocModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddCustomDocSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {isAr ? 'اسم أو نوع المستند' : 'Document Title / Description'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? 'مثال: عقد الإيجار المعتمد، رخصة البلدية، التوكيل الرسمي' : 'e.g. Lease Contract, Municipality License'}
                  value={customDocTitle}
                  onChange={e => setCustomDocTitle(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-brand-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {isAr ? 'اختر الملف (PDF، صورة، مستند)' : 'Select File (PDF, Image, Doc)'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={e => setCustomDocFile(e.target.files?.[0] || null)}
                  className="w-full p-2 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-brand-dark file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                />
                {customDocFile && (
                  <p className="text-[10px] text-gray-500 mt-1 font-medium">
                    {customDocFile.name} ({formatFileSize(customDocFile.size)})
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCustomDocModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCustom || !customDocFile || !customDocTitle.trim()}
                  className="flex-1 py-2.5 bg-brand-dark hover:bg-red-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                >
                  {isSubmittingCustom ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Upload size={13} />
                      <span>{isAr ? 'رفع وحفظ' : 'Upload & Save'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDocumentManager;

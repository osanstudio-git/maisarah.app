import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import {
  Paperclip,
  Upload,
  Download,
  Eye,
  Trash2,
  FileText,
  Plus,
  Calendar,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export interface JobDocument {
  id: string;
  name: string;
  file_path: string;
  file_url: string;
  file_size?: number;
  uploaded_at: string;
  uploaded_by?: string;
}

interface JobDeliverableManagerProps {
  jobId: string;
  clientId?: string | null;
  jobTitle: string;
  existingDocuments?: JobDocument[] | null;
  onDocumentsUpdated?: (updated: JobDocument[]) => void;
  isAr?: boolean;
}

export const JobDeliverableManager: React.FC<JobDeliverableManagerProps> = ({
  jobId,
  clientId,
  jobTitle,
  existingDocuments = [],
  onDocumentsUpdated,
  isAr = true
}) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<JobDocument[]>(existingDocuments || []);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const notify = (text: string, type: 'ok' | 'err' = 'ok') => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleFileUpload = async (file: File) => {
    if (!file || !jobId) return;

    if (file.size > 25 * 1024 * 1024) {
      notify(isAr ? 'حجم الملف يتجاوز 25 ميجابايت' : 'File exceeds 25MB limit', 'err');
      return;
    }

    setIsUploading(true);
    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const docId = `doc_${Date.now()}`;
      const storagePath = `jobs/${jobId}/${docId}_${cleanName}`;

      // 1. Upload to Supabase Storage bucket 'documents'
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storagePath);

      const newDoc: JobDocument = {
        id: docId,
        name: file.name,
        file_path: storagePath,
        file_url: urlData?.publicUrl || '',
        file_size: file.size,
        uploaded_at: new Date().toISOString(),
        uploaded_by: user?.user_metadata?.full_name || user?.email || 'Staff'
      };

      const updatedDocs = [...documents, newDoc];

      // 3. Update Supabase `services.job_documents`
      const { error: dbError } = await supabase
        .from('services')
        .update({ job_documents: updatedDocs })
        .eq('id', jobId);

      if (dbError) throw dbError;

      setDocuments(updatedDocs);
      if (onDocumentsUpdated) onDocumentsUpdated(updatedDocs);
      notify(isAr ? 'تم إرفاق مخرج العمل بنجاح' : 'Deliverable attached successfully');
    } catch (err: any) {
      console.error('Job document upload error:', err);
      notify(err.message || 'Upload failed', 'err');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (doc: JobDocument) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من حذف هذا الملف المرفق؟' : 'Delete attached deliverable?')) return;

    setDeletingId(doc.id);
    try {
      if (doc.file_path) {
        await supabase.storage.from('documents').remove([doc.file_path]);
      }

      const updatedDocs = documents.filter(d => d.id !== doc.id);
      const { error: dbError } = await supabase
        .from('services')
        .update({ job_documents: updatedDocs })
        .eq('id', jobId);

      if (dbError) throw dbError;

      setDocuments(updatedDocs);
      if (onDocumentsUpdated) onDocumentsUpdated(updatedDocs);
      notify(isAr ? 'تم حذف الملف' : 'File deleted');
    } catch (err: any) {
      notify(err.message || 'Delete failed', 'err');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (doc: JobDocument) => {
    try {
      if (doc.file_path) {
        const { data, error } = await supabase.storage.from('documents').download(doc.file_path);
        if (error) throw error;
        const blobUrl = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = doc.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      } else if (doc.file_url) {
        window.open(doc.file_url, '_blank');
      }
    } catch (err) {
      if (doc.file_url) window.open(doc.file_url, '_blank');
    }
  };

  return (
    <div className="pt-2 border-t border-gray-100 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1">
          <Paperclip size={11} className="text-gray-400" />
          <span>{isAr ? 'مخرجات ووثائق العمل (Deliverables):' : 'Deliverables & Attachments:'}</span>
          <span className="text-gray-400 font-normal">({documents.length})</span>
        </span>

        <input
          type="file"
          ref={fileInputRef}
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) handleFileUpload(f);
            e.target.value = '';
          }}
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
          className="hidden"
        />

        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="text-[10px] font-bold text-brand-dark hover:text-red-900 bg-red-50 hover:bg-red-100/70 px-2 py-0.5 rounded-lg border border-red-100 flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
        >
          {isUploading ? (
            <div className="w-3 h-3 border border-brand-dark border-t-transparent rounded-full animate-spin" />
          ) : (
            <Plus size={11} />
          )}
          <span>{isAr ? '+ إرفاق مخرج عمل' : '+ Attach Deliverable'}</span>
        </button>
      </div>

      {msg && (
        <div className={`p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
          msg.type === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
        }`}>
          {msg.type === 'ok' ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
          <span>{msg.text}</span>
        </div>
      )}

      {documents.length > 0 && (
        <div className="space-y-1.5">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-2 bg-gray-50/70 hover:bg-gray-100/70 border border-gray-150 rounded-xl text-xs transition"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText size={14} className="text-brand-dark shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-800 text-[11px] truncate">{doc.name}</p>
                  <p className="text-[9px] text-gray-400 font-medium">
                    {formatFileSize(doc.file_size)} {doc.uploaded_at ? `• ${new Date(doc.uploaded_at).toLocaleDateString(isAr ? 'ar-OM' : 'en-GB')}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => window.open(doc.file_url, '_blank')}
                  className="p-1 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                  title={isAr ? 'معاينة' : 'Preview'}
                >
                  <Eye size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(doc)}
                  className="p-1 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                  title={isAr ? 'تحميل' : 'Download'}
                >
                  <Download size={12} />
                </button>
                <button
                  type="button"
                  disabled={deletingId === doc.id}
                  onClick={() => handleDelete(doc)}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                  title={isAr ? 'حذف' : 'Delete'}
                >
                  {deletingId === doc.id ? (
                    <div className="w-2.5 h-2.5 border border-red-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 size={12} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobDeliverableManager;

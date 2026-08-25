import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { 
  Folder, 
  FileText, 
  File as FileIcon, 
  Download, 
  UploadCloud, 
  Search, 
  Clock, 
  ArrowRight,
  Plus,
  Camera,
  X,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileImage,
  FileCode,
  FileText as FileIconText,
  ShieldCheck
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FileIconText size={24} />;
  if (['xls', 'xlsx', 'csv'].includes(ext || '')) return <FileSpreadsheet size={24} />;
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return <FileImage size={24} />;
  return <FileIcon size={24} />;
};

const DocumentVault = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { user } = useAuth();
  
  const [reports, setReports] = useState<any[]>([]);
  const [uploads, setUploads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (user) fetchDocuments();
  }, [user]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      // For demo, we assume files are in 'documents' bucket under client_id/reports and client_id/uploads
      const { data: reportFiles } = await supabase.storage.from('documents').list(`${user?.id}/reports`);
      const { data: uploadFiles } = await supabase.storage.from('documents').list(`${user?.id}/uploads`);

      setReports(reportFiles || []);
      setUploads(uploadFiles || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setUploadMsg(null);

    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${user.id}/uploads/${fileName}`;

    try {
      const { error } = await supabase.storage.from('documents').upload(filePath, file);
      if (error) throw error;
      
      setUploadMsg({ type: 'ok', text: isAr ? 'تم رفع الملف بنجاح' : 'File uploaded successfully' });
      fetchDocuments();
    } catch (err: any) {
      setUploadMsg({ type: 'err', text: err.message });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadMsg(null), 3000);
    }
  };

  const handleDownload = async (path: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage.from('documents').download(`${user?.id}/${path}/${fileName}`);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 pb-20 lg:pb-0 animate-in fade-in duration-700" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-2">
        <div className={isAr ? 'text-right' : 'text-left'}>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase">{isAr ? 'خزينة المستندات' : 'Document Vault'}</h2>
          <p className="text-sm text-gray-400 font-medium mt-1.5">{isAr ? 'وصول آمن لتقاريرك ومستنداتك المرفوعة' : 'Secure access to your reports and uploaded docs'}</p>
        </div>
        <div className="relative w-full sm:w-auto">
          <label className="bg-brand-dark hover:bg-red-800 text-white px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-red-900/20 cursor-pointer transition-all active:scale-95 overflow-hidden group">
            {uploading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
            ) : (
              <>
                <UploadCloud size={20} className="group-hover:-translate-y-1 transition-transform" />
                {isAr ? 'رفع مستند' : 'Upload Document'}
              </>
            )}
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept="image/*,.pdf,.xlsx,.docx" />
          </label>
        </div>
      </div>

      {uploadMsg && (
        <div className={`p-5 rounded-3xl flex items-center gap-4 border shadow-sm animate-in slide-in-from-top-4 duration-300 ${
          uploadMsg.type === 'ok' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
            {uploadMsg.type === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          </div>
          <span className="text-sm font-black uppercase tracking-tight">{uploadMsg.text}</span>
        </div>
      )}

      {/* Reports Section (Maisarah → Client) */}
      <section className="space-y-6">
        <div className={`flex items-center gap-3 px-1 ${isAr ? 'flex-row' : 'flex-row'}`}>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-brand-dark flex items-center justify-center shadow-inner">
            <ShieldCheck size={24} />
          </div>
          <h3 className="font-black text-gray-900 uppercase tracking-[0.2em] text-xs">{isAr ? 'التقارير والمخرجات' : 'Reports & Outputs'}</h3>
        </div>
        
        {loading ? (
          <div className="flex justify-center p-14">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-dark" />
          </div>
        ) : reports.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {reports.map((file) => (
              <div key={file.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group scale-100 hover:scale-[1.01]">
                <div className="flex items-center justify-between gap-5">
                  <div className={`flex items-center gap-5 overflow-hidden ${isAr ? 'text-right' : 'text-left'}`}>
                    <div className="w-14 h-14 rounded-2xl bg-red-50 text-brand-dark flex items-center justify-center flex-shrink-0 group-hover:bg-brand-dark group-hover:text-white transition-colors shadow-inner">
                      {getFileIcon(file.name)}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-black text-gray-900 text-sm truncate tracking-tight" title={file.name}>{file.name}</p>
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1.5 flex items-center gap-2">
                        <span>{formatBytes(file.metadata?.size || 0)}</span>
                        <div className="w-1 h-1 bg-gray-200 rounded-full" />
                        <span>{new Date(file.created_at).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDownload('reports', file.name)}
                    className="p-4 bg-gray-50 text-gray-400 hover:bg-brand-dark hover:text-white rounded-2xl transition-all active:scale-90 shadow-sm"
                    title={isAr ? 'تحميل' : 'Download'}
                  >
                    <Download size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 border-2 border-dashed border-gray-100 rounded-[2.5rem] text-center bg-gray-50/30">
            <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center mx-auto mb-6 opacity-20">
              <FileIcon size={40} />
            </div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">{isAr ? 'لا توجد تقارير جاهزة حالياً' : 'No reports ready at the moment'}</p>
          </div>
        )}
      </section>

      {/* Uploaded Section (Client → Maisarah) */}
      <section className="space-y-6 pt-6 border-t border-gray-100">
        <div className="flex items-center gap-3 px-1">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
            <UploadCloud size={24} />
          </div>
          <h3 className="font-black text-gray-900 uppercase tracking-[0.2em] text-xs">{isAr ? 'المستندات المرفوعة' : 'My Uploads'}</h3>
        </div>

        {loading ? (
          <div className="flex justify-center p-14">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-dark" />
          </div>
        ) : uploads.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {uploads.map((file) => (
              <div key={file.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group scale-100 hover:scale-[1.01]">
                <div className="flex items-center justify-between gap-5">
                  <div className={`flex items-center gap-5 overflow-hidden ${isAr ? 'text-right' : 'text-left'}`}>
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-inner">
                      {getFileIcon(file.name)}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-black text-gray-900 text-sm truncate tracking-tight" title={file.name.split('_').slice(1).join('_')}>
                        {file.name.split('_').slice(1).join('_')}
                      </p>
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1.5 flex items-center gap-2">
                        <span>{formatBytes(file.metadata?.size || 0)}</span>
                        <div className="w-1 h-1 bg-gray-200 rounded-full" />
                        <span>{new Date(file.created_at).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleDownload('uploads', file.name)}
                      className="p-4 bg-gray-50 text-gray-400 hover:bg-blue-600 hover:text-white rounded-2xl transition-all active:scale-90 shadow-sm"
                      title={isAr ? 'تحميل' : 'Download'}
                    >
                      <Download size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 border-2 border-dashed border-gray-100 rounded-[2.5rem] text-center bg-gray-50/30">
            <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center mx-auto mb-6 opacity-20">
              <Camera size={40} />
            </div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">{isAr ? 'لم تقم برفع أي مستندات بعد' : 'You haven\'t uploaded any documents yet'}</p>
          </div>
        )}
      </section>

      {/* Mobile Snap-Photo Helper (Floating for mobile) */}
      <div className={`lg:hidden fixed bottom-24 ${isAr ? 'left-6' : 'right-6'} z-40`}>
        <label className="w-16 h-16 bg-brand-dark text-white rounded-full flex items-center justify-center shadow-2xl cursor-pointer active:scale-90 transition-all hover:scale-110 border-4 border-white">
          <Camera size={32} />
          <input type="file" capture="environment" accept="image/*" className="hidden" onChange={handleUpload} />
        </label>
      </div>

    </div>
  );
};

export default DocumentVault;

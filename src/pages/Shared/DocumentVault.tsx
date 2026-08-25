import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Folder, UploadCloud, File, Download, Trash2, User, AlertTriangle } from 'lucide-react';

const DocumentVault = () => {
  const { t, i18n } = useTranslation();
  const { user, role } = useAuth();
  const isAr = i18n.language === 'ar';
  
  const [files, setFiles] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (role === 'client') {
      setSelectedClient(user?.id || 'mock-client-id');
    } else {
      fetchClients();
    }
  }, [role, user]);

  useEffect(() => {
    if (selectedClient) {
      fetchFiles(selectedClient);
    }
  }, [selectedClient]);

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, company_name');
    if (data) setClients(data);
  };

  const fetchFiles = async (clientId: string) => {
    setLoading(true);
    setError('');
    try {
      // Assuming a bucket named 'documents' and files stored in folders named by client_id
      const { data, error } = await supabase
        .storage
        .from('documents')
        .list(`${clientId}`, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;
      setFiles(data || []);
    } catch (err: any) {
      console.error('Error fetching files:', err);
      // Suppress error in UI if bucket simply doesn't exist yet for demo purposes
      if (err.message !== 'The resource was not found') {
        setError(t('vault.fetchError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedClient) return;

    setUploading(true);
    setError('');

    const fileExt = file.name.split('.').pop();
    const originalName = file.name.split('.').slice(0, -1).join('.');
    const fileName = `${originalName}_${Date.now()}.${fileExt}`;
    const filePath = `${selectedClient}/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;
      
      fetchFiles(selectedClient); // Refresh list
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(t('vault.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileName: string) => {
    if (!selectedClient) return;
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(`${selectedClient}/${fileName}`);
        
      if (error) throw error;

      // Create a download link
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download error:', err);
      setError(t('vault.downloadError'));
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!selectedClient) return;
    if (!window.confirm(t('vault.confirmDelete'))) return;

    try {
      const { error } = await supabase.storage
        .from('documents')
        .remove([`${selectedClient}/${fileName}`]);

      if (error) throw error;
      fetchFiles(selectedClient); // Refresh list
    } catch (err) {
      console.error('Delete error:', err);
      setError(t('vault.deleteError'));
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* Sidebar for Employees/Managers to select a client */}
      {role !== 'client' && (
        <div className="w-full md:w-80 border-e border-gray-100 flex flex-col bg-gray-50/50 flex-shrink-0">
          <div className="p-6 bg-white border-b border-gray-100 flex-shrink-0">
            <h3 className="font-black text-gray-900 text-lg flex items-center gap-3 tracking-tight uppercase">
              <Folder className="text-brand-dark" size={22}/>
              {t('vault.clientFolders')}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {clients.map(client => (
              <button
                key={client.id}
                onClick={() => setSelectedClient(client.id)}
                className={`w-full text-start p-5 border-b border-gray-50 transition-all flex items-center gap-4
                  ${selectedClient === client.id 
                    ? 'bg-red-50/50 border-s-4 border-s-brand-dark shadow-inner' 
                    : 'hover:bg-white/80'}
                `}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-colors ${
                  selectedClient === client.id ? 'bg-brand-dark text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  <User size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-gray-900 text-sm truncate tracking-tight">{client.company_name}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{t('vault.viewFiles')}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Vault Area */}
      <div className="flex-1 flex flex-col h-full bg-white min-w-0">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white gap-4 shadow-sm z-10">
          <div className={isAr ? 'text-right' : 'text-left'}>
            <h3 className="font-black text-2xl text-gray-900 flex items-center gap-3 tracking-tight">
              {role === 'client' ? t('vault.myDocuments') : (clients.find(c => c.id === selectedClient)?.company_name || t('vault.selectFolder'))}
            </h3>
            {selectedClient && (
              <p className="text-sm text-gray-400 font-medium mt-1 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                {t('vault.secureStorage')}
              </p>
            )}
          </div>

          {selectedClient && (
            <div className="flex-shrink-0 w-full sm:w-auto">
              <label className="cursor-pointer bg-brand-dark hover:bg-red-800 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-red-900/20 active:scale-95 disabled:opacity-50">
                {uploading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                ) : (
                  <>
                    <UploadCloud size={20} />
                    {t('vault.uploadFile')}
                  </>
                )}
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          )}
        </div>

        {error && (
          <div className="m-6 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-sm">
            <AlertTriangle size={20} /> {error}
          </div>
        )}

        {/* Files List */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          {!selectedClient ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
              <div className="w-24 h-24 bg-white shadow-xl rounded-full flex items-center justify-center mb-6">
                <Folder size={48} className="text-brand-dark opacity-30" />
              </div>
              <h4 className="font-black text-gray-900 uppercase tracking-tight text-xl mb-2">{t('vault.selectFolder')}</h4>
              <p className="text-sm font-medium max-w-[280px] text-center opacity-60">{t('vault.selectToView')}</p>
            </div>
          ) : loading ? (
            <div className="flex justify-center p-14">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-dark" />
            </div>
          ) : files.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl m-4 bg-white/50">
              <div className="p-6 bg-white rounded-full shadow-lg mb-6 opacity-20">
                <File size={48} />
              </div>
              <p className="font-black uppercase tracking-widest text-xs">{t('vault.noFiles')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {files.map((file) => (
                <div key={file.id} className="bg-white border border-gray-100 rounded-3xl p-5 flex items-center justify-between hover:shadow-xl transition-all group scale-100 hover:scale-[1.01]">
                  <div className={`flex items-center gap-4 overflow-hidden ${isAr ? 'text-right' : 'text-left'}`}>
                    <div className="w-14 h-14 rounded-2xl bg-red-50 text-brand-dark flex items-center justify-center flex-shrink-0 shadow-inner group-hover:bg-brand-dark group-hover:text-white transition-colors">
                      <File size={24} />
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-black text-gray-900 text-sm truncate tracking-tight" title={file.name}>{file.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest flex items-center gap-2">
                        <span>{formatBytes(file.metadata?.size || 0)}</span>
                        <span className="w-1 h-1 bg-gray-200 rounded-full" />
                        <span>{new Date(file.created_at).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleDownload(file.name)}
                      className="p-3 text-gray-400 hover:text-brand-dark hover:bg-red-50 rounded-xl transition-all active:scale-90"
                      title={t('vault.download')}
                    >
                      <Download size={20} />
                    </button>
                    <button 
                      onClick={() => handleDelete(file.name)}
                      className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                      title={t('vault.delete')}
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentVault;

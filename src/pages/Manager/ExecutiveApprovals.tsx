import React, { useState, useEffect, useCallback } from 'react';
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
  Check,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

type ApprovalType = 'quote' | 'contract' | 'expense' | 'hr';
type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';

interface ApprovalRequest {
  id: string;
  dbId?: string | number;
  tableName?: 'hr_leave_requests' | 'quotations' | 'hr_contracts' | 'hr_requests';
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

const getTypeConfig = (type: ApprovalType) => {
  switch (type) {
    case 'quote': return { icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Quote / Proposal' };
    case 'contract': return { icon: FileSignature, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Contract' };
    case 'expense': return { icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Administrative / Expense' };
    case 'hr': return { icon: User, color: 'text-green-600', bg: 'bg-green-50', label: 'HR / Leave' };
  }
};

const ExecutiveApprovals = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [filter, setFilter] = useState<ApprovalType | 'all'>('all');
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [selectedReq, setSelectedReq] = useState<ApprovalRequest | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Fetch Approvals (Cross-Portal Live DB Aggregator) ──────────────────────
  const fetchApprovals = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [
        { data: dbLeaves },
        { data: dbQuotes },
        { data: dbContracts },
        { data: dbAdminReqs },
        { data: dbProfiles }
      ] = await Promise.all([
        supabase.from('hr_leave_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('quotations').select('*').order('created_at', { ascending: false }),
        supabase.from('hr_contracts').select('*').order('created_at', { ascending: false }),
        supabase.from('hr_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, email, department')
      ]);

      const profMap = new Map<string, string>();
      (dbProfiles || []).forEach(p => {
        profMap.set(p.id, p.full_name || p.email?.split('@')[0] || 'Staff Member');
      });

      const aggregated: ApprovalRequest[] = [];

      // 1. Map Live HR Leave Requests
      (dbLeaves || []).forEach((leave: any) => {
        const submitterName = leave.employee_name || profMap.get(leave.employee_id) || 'Employee';
        const rawStatus = (leave.status || 'pending').toLowerCase();
        aggregated.push({
          id: `LV-${String(leave.id).slice(0, 6).toUpperCase()}`,
          dbId: leave.id,
          tableName: 'hr_leave_requests',
          type: 'hr',
          title: isAr ? `طلب إجازة: ${leave.type || 'اعتيادية'}` : `${leave.type || 'Annual'} Leave Request`,
          department: leave.department || 'Audit',
          submitter: submitterName,
          status: rawStatus === 'approved' ? 'approved' : rawStatus === 'rejected' ? 'rejected' : 'pending',
          date: leave.created_at || new Date().toISOString(),
          description: `${leave.days || 1} ${isAr ? 'أيام' : 'days'} (${leave.start_date || ''} -> ${leave.end_date || ''}). ${isAr ? 'ملاحظات:' : 'Notes:'} ${leave.notes || 'No extra notes provided.'}`,
          urgency: (leave.days && Number(leave.days) > 5) ? 'high' : 'medium'
        });
      });

      // 2. Map Live CRM Quotations & Proposals
      (dbQuotes || []).forEach((q: any) => {
        const rawStatus = (q.status || 'pending').toLowerCase();
        aggregated.push({
          id: `QT-${String(q.id).slice(0, 6).toUpperCase()}`,
          dbId: q.id,
          tableName: 'quotations',
          type: 'quote',
          title: q.title || (isAr ? 'عرض سعر خدمات مهنية' : 'Professional Services Proposal'),
          department: q.department || 'Audit',
          submitter: q.created_by || 'CRM Officer',
          client: q.client_name || q.client_company || 'Corporate Client',
          amount: Number(q.total_amount || q.amount || 0),
          status: rawStatus === 'approved' ? 'approved' : rawStatus === 'rejected' ? 'rejected' : 'pending',
          date: q.created_at || new Date().toISOString(),
          description: q.notes || q.description || (isAr ? 'عرض سعر واستشارات مقدم للعميل يتطلب المراجعة والاعتماد التنفيذي.' : 'Client service proposal submitted for executive approval and terms validation.'),
          urgency: (Number(q.total_amount || 0) > 5000) ? 'high' : 'medium'
        });
      });

      // 3. Map Live HR Contracts & Visas
      (dbContracts || []).forEach((c: any) => {
        const submitterName = profMap.get(c.employee_id) || 'Staff Member';
        const rawStatus = (c.status || 'active').toLowerCase();
        aggregated.push({
          id: `CT-${String(c.id).slice(0, 6).toUpperCase()}`,
          dbId: c.id,
          tableName: 'hr_contracts',
          type: 'contract',
          title: isAr ? `عقد توظيف / تجديد: ${c.type || 'دوام كامل'}` : `Employment Contract: ${c.type || 'Full Time'}`,
          department: 'Internal Support & Administration',
          submitter: submitterName,
          status: rawStatus === 'approved' || rawStatus === 'active' ? 'approved' : rawStatus === 'rejected' ? 'rejected' : 'pending',
          date: c.created_at || new Date().toISOString(),
          description: `${isAr ? 'فترة التجربة:' : 'Probation:'} ${c.probation_months || 3} ${isAr ? 'أشهر' : 'months'}, ${isAr ? 'فترة الإشعار:' : 'Notice:'} ${c.notice_days || 30} ${isAr ? 'يوم' : 'days'}. ${isAr ? 'تاريخ البدء:' : 'Start Date:'} ${c.start_date || ''}`,
          urgency: 'medium'
        });
      });

      // 4. Map Live Administrative / Asset Requests
      (dbAdminReqs || []).forEach((req: any) => {
        const submitterName = profMap.get(req.employee_id) || 'Employee';
        const rawStatus = (req.status || 'pending').toLowerCase();
        aggregated.push({
          id: `REQ-${String(req.id).slice(0, 6).toUpperCase()}`,
          dbId: req.id,
          tableName: 'hr_requests',
          type: 'expense',
          title: isAr ? `طلب إداري / أصول: ${req.type || 'طلب عام'}` : `Administrative Request: ${req.type || 'General'}`,
          department: 'Internal Support & Administration',
          submitter: submitterName,
          status: rawStatus === 'approved' ? 'approved' : rawStatus === 'rejected' ? 'rejected' : 'pending',
          date: req.submitted_date || req.created_at || new Date().toISOString(),
          description: req.details || (isAr ? 'طلب إداري مقدم للمدير التنفيذي.' : 'Official request submitted for management authorization.'),
          urgency: 'low'
        });
      });

      setRequests(aggregated);

      setSelectedReq(prev => {
        if (!prev && aggregated.length > 0) return aggregated[0];
        if (prev) {
          const matched = aggregated.find(a => a.id === prev.id);
          return matched || aggregated[0] || null;
        }
        return null;
      });
    } catch (err) {
      console.error('Error fetching executive approvals:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [isAr]);

  useEffect(() => {
    fetchApprovals();

    // ── Supabase Realtime Channels Across All 4 Approval Tables ──────────────
    const channel = supabase
      .channel('manager-approvals-cross-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_leave_requests' }, () => fetchApprovals(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotations' }, () => fetchApprovals(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_contracts' }, () => fetchApprovals(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_requests' }, () => fetchApprovals(true))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchApprovals]);

  // ── Handle Action with Immediate DB Sync ──────────────────────────────────
  const handleAction = async (id: string, action: ApprovalStatus) => {
    const target = requests.find(r => r.id === id);
    if (!target) return;

    // 1. Optimistic UI update
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: action } : r));
    if (selectedReq?.id === id) {
      setSelectedReq(prev => prev ? { ...prev, status: action } : null);
    }

    // 2. Direct Supabase DB Update
    if (target.tableName && target.dbId) {
      try {
        const dbStatusValue = action === 'approved' ? (target.tableName === 'hr_contracts' ? 'Active' : 'Approved')
          : action === 'rejected' ? 'Rejected'
          : 'Pending';

        await supabase
          .from(target.tableName)
          .update({ status: dbStatusValue })
          .eq('id', target.dbId);
      } catch (err) {
        console.error(`Failed to update ${target.tableName} status:`, err);
      }
    }
  };

  const filteredRequests = requests.filter(r => filter === 'all' || r.type === filter);

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
            {isAr ? 'المركز الموحد لمراجعة واعتماد الطلبات والعقود وعروض الأسعار لحظياً' : 'Real-time centralized hub for authorizing proposals, contracts, leaves, and requests'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-gray-100 flex-wrap">
            {[
              { id: 'all', label: isAr ? 'الكل' : 'All' },
              { id: 'hr', label: isAr ? 'الإجازات' : 'HR & Leave' },
              { id: 'quote', label: isAr ? 'عروض الأسعار' : 'Quotes' },
              { id: 'contract', label: isAr ? 'العقود' : 'Contracts' },
              { id: 'expense', label: isAr ? 'الطلبات الإدارية' : 'Admin & Assets' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all ${filter === f.id ? 'bg-brand-dark text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchApprovals()}
            className="p-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl shadow-sm transition-all"
            title={isAr ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw size={16} />
          </button>
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
            {loading ? (
              <div className="p-10 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center p-8 text-gray-400">
                <CheckCircle2 size={32} className="mx-auto mb-2 opacity-20" />
                <p className="font-bold text-sm">{isAr ? 'لا توجد طلبات معلقة' : 'Queue is empty'}</p>
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
                  {selectedReq.amount !== undefined && selectedReq.amount > 0 && (
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
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{isAr ? 'التفاصيل والبيان' : 'Description'}</h3>
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-sm font-medium text-gray-700 leading-relaxed">
                      {selectedReq.description}
                    </p>
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
                  <Check size={18} /> {isAr ? 'اعتماد وتوقيع' : 'Approve & Sign'}
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

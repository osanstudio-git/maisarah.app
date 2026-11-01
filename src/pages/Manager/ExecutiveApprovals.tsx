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
  const [statusTab, setStatusTab] = useState<'pending' | 'all'>('pending');
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
        { data: dbProfiles },
        { data: dbHrEmployees }
      ] = await Promise.all([
        supabase.from('hr_leave_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('quotations').select('*').order('created_at', { ascending: false }),
        supabase.from('hr_contracts').select('*').order('created_at', { ascending: false }),
        supabase.from('hr_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*'),
        supabase.from('hr_employees').select('*')
      ]);

      const profMap = new Map<string, string>();
      (dbProfiles || []).forEach(p => {
        profMap.set(p.id, p.full_name || p.email?.split('@')[0] || 'Staff Member');
      });
      (dbHrEmployees || []).forEach(h => {
        if (!profMap.has(h.id)) {
          profMap.set(h.id, h.full_name || h.name || 'Staff Member');
        }
      });

      const aggregated: ApprovalRequest[] = [];

      // 1. Map Live HR Leave Requests from Supabase
      (dbLeaves || []).forEach((leave: any) => {
        const submitterName = profMap.get(leave.employee_id) || leave.employee_name || 'Staff Member';
        const mgrStatus = (leave.manager_approval || 'Pending').toLowerCase();
        const hrStatus = (leave.hr_approval || 'Pending').toLowerCase();

        const rawStatus: ApprovalStatus =
          (mgrStatus === 'approved' || hrStatus === 'approved') ? 'approved' :
          (mgrStatus === 'rejected' || hrStatus === 'rejected') ? 'rejected' :
          'pending';

        aggregated.push({
          id: `LV-${String(leave.id).padStart(4, '0')}`,
          dbId: leave.id,
          tableName: 'hr_leave_requests',
          type: 'hr',
          title: isAr ? `طلب إجازة: ${leave.type || 'اعتيادية'}` : `${leave.type || 'Annual'} Leave Request`,
          department: isAr ? 'الموارد البشرية والعمليات' : 'Human Resources & Operations',
          submitter: submitterName,
          status: rawStatus,
          date: leave.created_at || new Date().toISOString(),
          description: `${leave.days || 1} ${isAr ? 'أيام' : 'days'} (${leave.start_date || ''} -> ${leave.end_date || ''}). ${isAr ? 'ملاحظات:' : 'Notes:'} ${leave.notes || (isAr ? 'لا توجد ملاحظات إضافية.' : 'No extra notes provided.')}`,
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
        if (target.tableName === 'hr_leave_requests') {
          const approvalVal = action === 'approved' ? 'Approved' : action === 'rejected' ? 'Rejected' : 'Pending';
          const { error } = await supabase
            .from('hr_leave_requests')
            .update({
              manager_approval: approvalVal,
              hr_approval: approvalVal
            })
            .eq('id', target.dbId);
          if (error) console.error('Failed to update hr_leave_requests:', error);
        } else if (target.tableName === 'quotations') {
          const qStatus = action === 'approved' ? 'approved' : action === 'rejected' ? 'rejected' : 'draft';
          const { error } = await supabase
            .from('quotations')
            .update({ status: qStatus })
            .eq('id', target.dbId);
          if (error) console.error('Failed to update quotations:', error);
        } else if (target.tableName === 'hr_contracts') {
          const cStatus = action === 'approved' ? 'Active' : action === 'rejected' ? 'Rejected' : 'Pending';
          const { error } = await supabase
            .from('hr_contracts')
            .update({ status: cStatus })
            .eq('id', target.dbId);
          if (error) console.error('Failed to update hr_contracts:', error);
        } else if (target.tableName === 'hr_requests') {
          const rStatus = action === 'approved' ? 'Approved' : action === 'rejected' ? 'Rejected' : 'Pending';
          const { error } = await supabase
            .from('hr_requests')
            .update({ status: rStatus })
            .eq('id', target.dbId);
          if (error) console.error('Failed to update hr_requests:', error);
        }
      } catch (err) {
        console.error(`Failed to update ${target.tableName} status:`, err);
      }
    }
  };

  const filteredRequests = requests.filter(r => {
    const typeMatch = filter === 'all' || r.type === filter;
    const statusMatch = statusTab === 'all' || r.status === 'pending';
    return typeMatch && statusMatch;
  });

  const pendingCount = requests.filter(r => (filter === 'all' || r.type === filter) && r.status === 'pending').length;
  const allCount = requests.filter(r => filter === 'all' || r.type === filter).length;

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
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div className="flex bg-gray-200/70 p-1 rounded-xl gap-1">
              <button
                onClick={() => setStatusTab('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${statusTab === 'pending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                {isAr ? 'قيد الانتظار' : 'Pending'} ({pendingCount})
              </button>
              <button
                onClick={() => setStatusTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${statusTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                {isAr ? 'السجل / الكل' : 'History / All'} ({allCount})
              </button>
            </div>
            <span className="text-[11px] font-bold text-gray-400">
              {filteredRequests.length} {isAr ? 'عنصر' : 'items'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="p-10 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center p-8 text-gray-400">
                <CheckCircle2 size={36} className="mx-auto mb-2 text-green-500 opacity-60" />
                <p className="font-bold text-sm text-gray-600">
                  {statusTab === 'pending' 
                    ? (isAr ? 'لا توجد طلبات معلقة بانتظار الاعتماد' : 'All caught up! No pending approvals.')
                    : (isAr ? 'لا توجد عناصر مسجلة' : 'No approval records found.')}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {isAr ? 'أي طلبات إجازة أو عروض أسعار جديدة ستظهر هنا لحظياً' : 'New leave requests and proposals will appear here in real time'}
                </p>
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
                    className={`p-4 rounded-2xl cursor-pointer border transition-all ${isSelected ? 'border-brand-dark bg-brand-dark/5 shadow-md' : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm'} ${req.status !== 'pending' ? 'opacity-80' : ''}`}
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
                      <div className="flex items-center gap-1.5">
                        {req.status === 'approved' && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-700">
                            {isAr ? 'معتمد' : 'Approved'}
                          </span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-700">
                            {isAr ? 'مرفوض' : 'Rejected'}
                          </span>
                        )}
                        {req.urgency === 'high' && req.status === 'pending' && (
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="High Urgency" />
                        )}
                      </div>
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
              {/* Detail Header */}
              <div className="p-8 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${getTypeConfig(selectedReq.type).bg} ${getTypeConfig(selectedReq.type).color}`}>
                      {getTypeConfig(selectedReq.type).label}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">
                      {new Date(selectedReq.date).toLocaleString()}
                    </span>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    selectedReq.status === 'approved' ? 'bg-green-100 text-green-700' :
                    selectedReq.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    selectedReq.status === 'changes_requested' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {selectedReq.status === 'approved' ? (isAr ? 'تم الاعتماد' : 'Approved') :
                     selectedReq.status === 'rejected' ? (isAr ? 'مرفوض' : 'Rejected') :
                     selectedReq.status === 'changes_requested' ? (isAr ? 'مطلوب تعديل' : 'Changes Requested') :
                     (isAr ? 'بانتظار القرار' : 'Pending Decision')}
                  </span>
                </div>
                
                <h2 className="text-3xl font-black text-gray-900 mb-2">{selectedReq.title}</h2>
                <div className="flex items-center gap-4 text-sm font-bold text-gray-500">
                  <span className="flex items-center gap-1.5"><User size={16} /> {selectedReq.submitter}</span>
                  <span className="flex items-center gap-1.5"><Building2 size={16} /> {selectedReq.department}</span>
                </div>
              </div>

              {/* Detail Body */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/30">
                
                {/* Highlights Grid */}
                {(selectedReq.amount !== undefined && selectedReq.amount > 0) || selectedReq.client ? (
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
                ) : null}

                {/* Description */}
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{isAr ? 'التفاصيل والبيان' : 'Description'}</h3>
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-sm font-medium text-gray-700 leading-relaxed">
                      {selectedReq.description}
                    </p>
                  </div>
                </div>

                {/* Status Notice if Already Actioned */}
                {selectedReq.status !== 'pending' && (
                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                    selectedReq.status === 'approved' ? 'bg-green-50 border-green-200 text-green-800' :
                    selectedReq.status === 'rejected' ? 'bg-red-50 border-red-200 text-red-800' :
                    'bg-amber-50 border-amber-200 text-amber-800'
                  }`}>
                    <div className="flex items-center gap-3">
                      {selectedReq.status === 'approved' ? <CheckCircle2 className="text-green-600" size={24} /> : <XCircle className="text-red-600" size={24} />}
                      <div>
                        <p className="font-bold text-sm">
                          {selectedReq.status === 'approved' 
                            ? (isAr ? 'تم توقيع واعتماد هذا الطلب رسمياً في قاعدة البيانات' : 'This request has been authorized & signed in the database.')
                            : (isAr ? 'تم رفض هذا الطلب رسمياً' : 'This request was rejected by Executive Management.')}
                        </p>
                        <p className="text-xs opacity-75">
                          {isAr ? 'تم تحديث حالة الطلب لحظياً لدى مقدم الطلب' : 'Status has synced in real-time to the submitter portal'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAction(selectedReq.id, 'pending')}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white shadow-sm border border-gray-200 hover:bg-gray-50 text-gray-700"
                    >
                      {isAr ? 'إعادة فتح الطلب' : 'Reopen Request'}
                    </button>
                  </div>
                )}
              </div>

              {/* ── Action Bar ────────────────────────────────────────────── */}
              {selectedReq.status === 'pending' ? (
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
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExecutiveApprovals;
